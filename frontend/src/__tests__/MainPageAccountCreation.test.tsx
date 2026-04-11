/**
 * Tests for CreateAccount page + MainPageAccountCreation component
 *
 * Covers all account creation paths available through the standalone
 * Create Account page (accessible via the top-right "Create Account" link):
 * - Invalid email + invalid password combination
 * - Invalid email + valid password
 * - Valid email + passwords do not match
 * - Valid email + password too short
 * - All fields valid → calls createAccount API
 *
 * Note: this covers the CreateAccount page flow that is distinct from the
 * AccountManagementPage modal flow, which is tested in AccountManagementPage.test.tsx.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateAccountMainPage from '../MainPageAccountCreation';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  createAccount: vi.fn(),
  listAccounts: vi.fn().mockResolvedValue([]),
}));

import { createAccount } from '../api/client';
const mockCreateAccount = createAccount as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders the CreateAccountMainPage component with the given credential strings.
 * The component receives props directly (email, password, confirm).
 */
function renderWithCredentials(email: string, password: string, confirm: string) {
  return render(
    <CreateAccountMainPage
      EmailString={email}
      PasswordString={password}
      PasswordConfirmString={confirm}
    />
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// ACCOUNT CREATION VIA MainPageAccountCreation COMPONENT
// =============================================================================

describe('Account creation — MainPageAccountCreation', () => {

  it('renders the Create Account button', () => {
    renderWithCredentials('', '', '');
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  // ── Invalid email + invalid password ───────────────────────────────────

  it('shows an error for invalid email AND mismatched passwords', async () => {
    renderWithCredentials('not-an-email', 'abc', 'xyz');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    const msg = screen.getByText(/email.*invalid.*passwords.*do not match|passwords.*do not match.*email.*invalid/i);
    expect(msg).toBeInTheDocument();
  });

  it('shows an error for invalid email AND password too short', async () => {
    renderWithCredentials('not-an-email', 'short', 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Either "invalid email" or combined message must be shown
    expect(
      screen.queryByText(/email.*invalid/i) ||
      screen.queryByText(/invalid.*email/i) ||
      screen.queryByText(/your email address is invalid/i)
    ).not.toBeNull();
  });

  it('does NOT call createAccount when email is invalid', async () => {
    renderWithCredentials('bad-email', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  // ── Invalid email + valid password ────────────────────────────────────

  it('shows an email error when email is invalid even if passwords match', async () => {
    renderWithCredentials('notvalid', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/email address is invalid/i)).toBeInTheDocument();
  });

  // ── Valid email + passwords do not match ──────────────────────────────

  it('shows a password error when email is valid but passwords do not match', async () => {
    renderWithCredentials('user@example.com', 'password123', 'different123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/passwords do not match|passwords.*short/i)).toBeInTheDocument();
  });

  it('does NOT call createAccount when passwords do not match', async () => {
    renderWithCredentials('user@example.com', 'password123', 'nomatch456');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  // ── Valid email + password too short ──────────────────────────────────

  it('shows a password error when password is fewer than 8 characters', async () => {
    renderWithCredentials('user@example.com', 'short', 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/passwords.*short|too short|correct length/i)).toBeInTheDocument();
  });

  it('does NOT call createAccount when password is too short', async () => {
    renderWithCredentials('user@example.com', 'abc', 'abc');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  // ── All valid ─────────────────────────────────────────────────────────

  it('calls createAccount when email is valid and passwords match', async () => {
    mockCreateAccount.mockResolvedValueOnce({
      userId: 'new-id',
      email: 'user@example.com',
      dateCreated: 'x',
      lastLogin: 'x',
    });

    renderWithCredentials('user@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('shows a "valid credentials" or success message when all fields are correct', async () => {
    mockCreateAccount.mockResolvedValueOnce({
      userId: 'new-id',
      email: 'user@example.com',
      dateCreated: 'x',
      lastLogin: 'x',
    });

    renderWithCredentials('user@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid credentials|account creation finish/i)).toBeInTheDocument();
    });
  });

  // ── Email format boundary cases ───────────────────────────────────────

  it('accepts standard email formats (name@domain.tld)', async () => {
    mockCreateAccount.mockResolvedValueOnce({
      userId: 'u',
      email: 'test.user+tag@sub.example.org',
      dateCreated: 'x',
      lastLogin: 'x',
    });

    renderWithCredentials('test.user+tag@sub.example.org', 'securepassword', 'securepassword');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalled();
    });
  });

  it('rejects email without @ symbol', async () => {
    renderWithCredentials('nodomain', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('rejects email without domain (user@)', async () => {
    renderWithCredentials('user@', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });
});
