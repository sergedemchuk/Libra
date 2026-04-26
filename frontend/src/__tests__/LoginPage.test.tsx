/**
 * Tests for LoginPage
 *
 * Covers: form rendering, successful login, failed login, remember-me
 * localStorage behaviour, loading state during submission.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  loginAccount: vi.fn(),
  send2FACode: vi.fn(),
  verify2FACode: vi.fn(),
}));

import { loginAccount, send2FACode, verify2FACode } from '../api/client';
const mockLoginAccount = loginAccount as ReturnType<typeof vi.fn>;
const mockSend2FACode = send2FACode as ReturnType<typeof vi.fn>;
const mockVerify2FACode = verify2FACode as ReturnType<typeof vi.fn>;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Default: 2FA calls succeed
  mockSend2FACode.mockResolvedValue({ message: 'Code sent' });
  mockVerify2FACode.mockResolvedValue({ success: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function submitLoginForm(email: string, password: string, rememberMe = false) {
  await userEvent.type(screen.getByLabelText(/email address/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  if (rememberMe) {
    await userEvent.click(screen.getByLabelText(/remember me/i));
  }
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

/** After credentials succeed and 2FA screen appears, fill in the code and submit. */
async function complete2FA(code = '123456') {
  // Wait for the 2FA input to appear
  const codeInput = await screen.findByLabelText(/verification code/i);
  await userEvent.type(codeInput, code);
  await userEvent.click(screen.getByRole('button', { name: /verify/i }));
}

// =============================================================================
// RENDERING
// =============================================================================

describe('LoginPage rendering', () => {
  it('renders the email and password fields', () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the Sign in button', () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the Remember me checkbox', () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  });

  it('renders the Libra brand title', () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);
    expect(screen.getByText('Libra')).toBeInTheDocument();
  });
});

// =============================================================================
// SUCCESSFUL LOGIN
// =============================================================================

describe('Successful login', () => {
  it('calls loginAccount with the submitted email and password', async () => {
    const onLoginSuccess = vi.fn();
    mockLoginAccount.mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);
    await submitLoginForm('user@example.com', 'password123');

    await waitFor(() => {
      expect(mockLoginAccount).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('calls onLoginSuccess callback after successful login', async () => {
    const onLoginSuccess = vi.fn();
    mockLoginAccount.mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);
    await submitLoginForm('user@example.com', 'password123');
    await complete2FA();

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT store libra_remember in localStorage when "Remember me" is unchecked', async () => {
    mockLoginAccount.mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await submitLoginForm('user@example.com', 'password123', false);

    await waitFor(() => expect(mockLoginAccount).toHaveBeenCalled());
    expect(localStorage.getItem('libra_remember')).toBeNull();
  });

  it('stores libra_remember=true in localStorage when "Remember me" is checked', async () => {
    mockLoginAccount.mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await submitLoginForm('user@example.com', 'password123', true);
    await complete2FA();

    await waitFor(() => {
      expect(localStorage.getItem('libra_remember')).toBe('true');
    });
  });
});

// =============================================================================
// FAILED LOGIN
// =============================================================================

describe('Failed login', () => {
  it('displays an error message when login fails', async () => {
    mockLoginAccount.mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await submitLoginForm('wrong@example.com', 'badpassword');

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('does NOT call onLoginSuccess when login fails', async () => {
    const onLoginSuccess = vi.fn();
    mockLoginAccount.mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);
    await submitLoginForm('wrong@example.com', 'badpassword');

    await waitFor(() => expect(mockLoginAccount).toHaveBeenCalled());
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('does NOT store anything in localStorage when login fails', async () => {
    mockLoginAccount.mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await submitLoginForm('wrong@example.com', 'badpassword', true);

    await waitFor(() => expect(mockLoginAccount).toHaveBeenCalled());
    expect(localStorage.getItem('libra_remember')).toBeNull();
  });

  it('clears the error message when a new submission begins', async () => {
    // First attempt fails
    mockLoginAccount.mockRejectedValueOnce(new Error('Invalid email or password'));
    // Second attempt succeeds
    mockLoginAccount.mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await submitLoginForm('wrong@example.com', 'badpassword');
    await waitFor(() => screen.getByText(/invalid email or password/i));

    // Submit again via the form element — error should clear
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// LOADING STATE
// =============================================================================

describe('Loading state', () => {
  it('disables the Sign in button while the login request is in flight', async () => {
    let resolveLogin!: (v: unknown) => void;
    mockLoginAccount.mockReturnValueOnce(new Promise((res) => { resolveLogin = res; }));

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for the loading state — button text changes to "Signing in..."
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    resolveLogin({ userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x' });
    await waitFor(() => expect(mockLoginAccount).toHaveBeenCalled());
  });

  it('disables the email and password inputs while loading', async () => {
    let resolveLogin!: (v: unknown) => void;
    mockLoginAccount.mockReturnValueOnce(new Promise((res) => { resolveLogin = res; }));

    render(<LoginPage onLoginSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();

    resolveLogin({ userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x' });
    await waitFor(() => expect(mockLoginAccount).toHaveBeenCalled());
  });
});