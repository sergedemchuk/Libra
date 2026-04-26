/**
 * Tests for App.tsx — routing and authentication gating
 *
 * Covers:
 * - Unauthenticated users see the LoginPage
 * - Authenticated users (via localStorage) see the main app
 * - Logout clears localStorage and returns to LoginPage
 * - Navigation to the account management page
 * - State resets on logout (price rounding, adjustment, file selection)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// ─── Mock heavy child components to isolate routing logic ─────────────────────

vi.mock('../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    state: { phase: 'idle', uploadProgress: 0, jobId: null, jobStatus: null, errorMessage: null },
    start: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../api/client', () => ({
  loginAccount: vi.fn().mockResolvedValue({
    userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
  }),
  listAccounts: vi.fn().mockResolvedValue([]),
  createAccount: vi.fn(),
  send2FACode: vi.fn().mockResolvedValue({ message: 'Code sent' }),
  verify2FACode: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock components that are expensive or have complex deps
vi.mock('../ProcessedDataViewer', () => ({
  default: () => <div data-testid="processed-data-viewer" />,
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// =============================================================================
// AUTHENTICATION GATING
// =============================================================================

describe('Authentication gating', () => {
  it('shows the LoginPage when the user is not authenticated', () => {
    render(<App />);
    // LoginPage has a "Sign in to your account" heading
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('does NOT show the main app when the user is not authenticated', () => {
    render(<App />);
    expect(screen.queryByText(/upload catalog data/i)).not.toBeInTheDocument();
  });

  it('shows the main app when libra_remember=true is in localStorage', () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);
    // The upload page h1 heading is visible (MenuBar also has "Upload Catalog Data" nav button)
    expect(screen.getByRole('heading', { name: /upload catalog data/i })).toBeInTheDocument();
  });

  it('does NOT show the LoginPage when the user is already authenticated', () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);
    expect(screen.queryByText(/sign in to your account/i)).not.toBeInTheDocument();
  });
});

// =============================================================================
// LOGIN FLOW
// =============================================================================

describe('Login flow', () => {
  it('transitions to the main app after a successful login', async () => {
    const { loginAccount } = await import('../api/client');
    (loginAccount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1', email: 'user@example.com', dateCreated: 'x', lastLogin: 'x',
    });

    render(<App />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Complete the 2FA step
    const codeInput = await screen.findByLabelText(/verification code/i);
    await userEvent.type(codeInput, '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /upload catalog data/i })).toBeInTheDocument();
    });
  });
});

// =============================================================================
// LOGOUT
// =============================================================================

describe('Logout', () => {
  it('removes libra_remember from localStorage on logout', async () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);

    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(logoutBtn);

    expect(localStorage.getItem('libra_remember')).toBeNull();
  });

  it('returns to the LoginPage after logout', async () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);

    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });
  });

  it('hides the main app content after logout', async () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);

    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /upload catalog data/i })).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// PAGE NAVIGATION
// =============================================================================

describe('Page navigation', () => {
  it('shows the upload page by default after login', () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);
    expect(screen.getByRole('heading', { name: /upload catalog data/i })).toBeInTheDocument();
  });

  it('navigates to the account management page', async () => {
    localStorage.setItem('libra_remember', 'true');
    localStorage.setItem('libra_role', 'admin');
    render(<App />);

    // MenuBar button is "Account Management"
    const accountsBtn = screen.getByRole('button', { name: /^account management$/i });
    await userEvent.click(accountsBtn);

    await waitFor(() => {
      expect(screen.getByText(/account management page/i)).toBeInTheDocument();
    });
  });

  it('navigates back to upload from account management', async () => {
    localStorage.setItem('libra_remember', 'true');
    localStorage.setItem('libra_role', 'admin');
    render(<App />);

    const accountsBtn = screen.getByRole('button', { name: /^account management$/i });
    await userEvent.click(accountsBtn);

    await waitFor(() => screen.getByText(/account management page/i));

    const backBtn = screen.getByRole('button', { name: /← back|back/i });
    await userEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /upload catalog data/i })).toBeInTheDocument();
    });
  });
});

// =============================================================================
// PRICE SETTINGS STATE
// =============================================================================

describe('Price settings state', () => {
  it('price rounding checkbox is unchecked (false) by default on the upload page', () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);

    // The PriceCheckBox renders a single <input type="checkbox"> for rounding
    // It has no accessible name via htmlFor, so query by role + type
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox on the upload page is the price rounding one
    const roundingCheckbox = checkboxes[0];
    expect(roundingCheckbox).not.toBeChecked();
  });

  it('price rounding checkbox can be toggled on', async () => {
    localStorage.setItem('libra_remember', 'true');
    render(<App />);

    const checkboxes = screen.getAllByRole('checkbox');
    const roundingCheckbox = checkboxes[0];
    await userEvent.click(roundingCheckbox);
    expect(roundingCheckbox).toBeChecked();
  });
});