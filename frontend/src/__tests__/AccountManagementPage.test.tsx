/**
 * Tests for AccountManagementPage
 *
 * Covers all account creation paths available through the management page modal:
 * - Modal open/close behaviour
 * - Client-side form validation (password mismatch)
 * - Successful account creation flow (calls API, updates list, closes modal)
 * - API error handling (displays error message, keeps modal open)
 * - Loading state while creating
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountManagementPage from '../AccountManagementPage';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
  createAccount: vi.fn(),
}));

import { listAccounts, createAccount } from '../api/client';
const mockListAccounts = listAccounts as ReturnType<typeof vi.fn>;
const mockCreateAccount = createAccount as ReturnType<typeof vi.fn>;

const onBack = vi.fn();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openCreateModal() {
  const btn = screen.getByRole('button', { name: /create account/i });
  await userEvent.click(btn);
}

async function fillModal(email: string, password: string, confirm: string) {
  // The modal uses CreateAccountFields which renders labelled inputs
  const emailInput = screen.getByLabelText(/email address/i);
  const passwordInput = screen.getByLabelText(/^password$/i);
  const confirmInput = screen.getByLabelText(/confirm password/i);

  await userEvent.clear(emailInput);
  await userEvent.type(emailInput, email);
  await userEvent.clear(passwordInput);
  await userEvent.type(passwordInput, password);
  await userEvent.clear(confirmInput);
  await userEvent.type(confirmInput, confirm);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockListAccounts.mockResolvedValue([]);
});

// =============================================================================
// ACCOUNT CREATION VIA THE MODAL (AccountManagementPage)
// =============================================================================

describe('Account creation — AccountManagementPage modal', () => {

  it('renders the "Create Account" button', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('opens the create account modal when the button is clicked', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('closes the modal when the Cancel button is clicked', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the modal when the backdrop is clicked', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();

    const backdrop = screen.getByLabelText(/close modal/i);
    await userEvent.click(backdrop);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a validation error when passwords do not match', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('user@example.com', 'password123', 'differentpassword');

    const saveBtn = screen.getByRole('button', { name: /save account/i });
    await userEvent.click(saveBtn);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('does NOT call createAccount API when passwords do not match', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('user@example.com', 'password123', 'nomatch');

    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('calls createAccount with the correct email and password on valid submission', async () => {
    const newAccount = { userId: 'new-id', email: 'new@example.com', dateCreated: 'x', lastLogin: 'x' };
    mockCreateAccount.mockResolvedValueOnce(newAccount);

    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('new@example.com', 'password123', 'password123');

    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith('new@example.com', 'password123', 'user');
    });
  });

  it('closes the modal after a successful account creation', async () => {
    const newAccount = { userId: 'new-id', email: 'new@example.com', dateCreated: 'x', lastLogin: 'x' };
    mockCreateAccount.mockResolvedValueOnce(newAccount);

    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('new@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('adds the new account to the displayed list after successful creation', async () => {
    const newAccount = { userId: 'new-id', email: 'freshuser@example.com', dateCreated: new Date().toISOString(), lastLogin: new Date().toISOString() };
    mockCreateAccount.mockResolvedValueOnce(newAccount);

    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('freshuser@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => {
      expect(screen.getByText('freshuser@example.com')).toBeInTheDocument();
    });
  });

  it('displays an API error message and keeps modal open when createAccount fails', async () => {
    mockCreateAccount.mockRejectedValueOnce(new Error('An account with that email already exists'));

    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('taken@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => {
      expect(screen.getByText(/An account with that email already exists/i)).toBeInTheDocument();
    });
    // Modal remains open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables the Save and Cancel buttons while the creation request is in flight', async () => {
    let resolveCreate!: (v: unknown) => void;
    mockCreateAccount.mockReturnValueOnce(new Promise((res) => { resolveCreate = res; }));

    render(<AccountManagementPage onBack={onBack} />);
    await openCreateModal();
    await fillModal('new@example.com', 'password123', 'password123');

    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    // While pending the buttons should be disabled
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    // Finish the request so the component settles
    resolveCreate({ userId: 'u', email: 'new@example.com', dateCreated: 'x', lastLogin: 'x' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('resets the form fields when the modal is reopened after being closed', async () => {
    render(<AccountManagementPage onBack={onBack} />);

    // Open, type something, then close
    await openCreateModal();
    await fillModal('first@example.com', 'password123', 'password123');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Reopen and verify fields are cleared
    await openCreateModal();
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
  });
});

// =============================================================================
// ACCOUNT LIST LOADING
// =============================================================================

describe('Account list loading', () => {
  it('shows a loading indicator while fetching accounts', () => {
    // listAccounts never resolves during this test
    mockListAccounts.mockReturnValue(new Promise(() => {}));

    render(<AccountManagementPage onBack={onBack} />);
    expect(screen.getByText(/loading accounts/i)).toBeInTheDocument();
  });

  it('shows an error message when listAccounts fails', async () => {
    mockListAccounts.mockRejectedValueOnce(new Error('Network error'));

    render(<AccountManagementPage onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows "No accounts yet" when the list is empty', async () => {
    mockListAccounts.mockResolvedValueOnce([]);

    render(<AccountManagementPage onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument();
    });
  });

  it('displays each account email in the list', async () => {
    mockListAccounts.mockResolvedValueOnce([
      { userId: 'u1', email: 'alice@example.com', dateCreated: new Date().toISOString(), lastLogin: new Date().toISOString() },
      { userId: 'u2', email: 'bob@example.com', dateCreated: new Date().toISOString(), lastLogin: new Date().toISOString() },
    ]);

    render(<AccountManagementPage onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// NOTIFICATION TOGGLE
// =============================================================================

describe('Email notification toggle', () => {
  it('renders the "Email on Account Creation" toggle switch', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggles the switch state when clicked', async () => {
    render(<AccountManagementPage onBack={onBack} />);
    const toggle = screen.getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});