/**
 * Tests for ListAccountInfo (AccountInfo component)
 *
 * Covers all account deletion paths available through the accounts list UI:
 * - Confirmation dialog is shown before deleting
 * - User cancelling the dialog does NOT call the API
 * - User confirming calls deleteAccount with the correct userId
 * - onDeleted callback is fired after successful deletion
 * - API error is surfaced via window.alert
 *
 * Also covers the change-password inline form.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountInfo from '../ListAccountInfo';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  deleteAccount: vi.fn(),
  changePassword: vi.fn(),
}));

import { deleteAccount, changePassword } from '../api/client';
const mockDeleteAccount = deleteAccount as ReturnType<typeof vi.fn>;
const mockChangePassword = changePassword as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  { userId: 'user-1', email: 'alice@example.com', dateCreated: '2024-01-01T00:00:00.000Z', lastLogin: '2024-06-01T00:00:00.000Z' },
  { userId: 'user-2', email: 'bob@example.com',   dateCreated: '2024-02-01T00:00:00.000Z', lastLogin: '2024-06-02T00:00:00.000Z' },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Restore real window methods before each test so mocks don't leak
  vi.restoreAllMocks();
});

// =============================================================================
// ACCOUNT DELETION VIA THE LIST (ListAccountInfo / AccountInfo)
// =============================================================================

describe('Account deletion — ListAccountInfo', () => {

  it('renders a Delete button for each account', () => {
    const onDeleted = vi.fn();
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteBtns).toHaveLength(ACCOUNTS.length);
  });

  it('shows window.confirm before calling deleteAccount', async () => {
    const onDeleted = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteAccount.mockResolvedValueOnce(undefined);

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this account?');
  });

  it('does NOT call deleteAccount when the user cancels the confirmation dialog', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('calls deleteAccount with the correct userId when the user confirms', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteAccount.mockResolvedValueOnce(undefined);

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('user-1');
    });
  });

  it('calls the onDeleted callback with the userId after successful deletion', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteAccount.mockResolvedValueOnce(undefined);

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith('user-1');
    });
  });

  it('calls deleteAccount with the correct userId for the second account', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteAccount.mockResolvedValueOnce(undefined);

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteBtns[1]); // second account

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('user-2');
    });
  });

  it('shows a window.alert with the error message when deleteAccount fails', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockDeleteAccount.mockRejectedValueOnce(new Error('This account cannot be deleted'));

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('This account cannot be deleted');
    });
  });

  it('does NOT call onDeleted when deleteAccount fails', async () => {
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockDeleteAccount.mockRejectedValueOnce(new Error('Server error'));

    render(<AccountInfo accounts={ACCOUNTS} onDeleted={onDeleted} />);

    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(firstDeleteBtn);

    await waitFor(() => {
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// CHANGE PASSWORD VIA THE LIST
// =============================================================================

describe('Change password — ListAccountInfo', () => {

  it('renders a Change Password button for each account', () => {
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);
    const btns = screen.getAllByRole('button', { name: /change password/i });
    expect(btns).toHaveLength(ACCOUNTS.length);
  });

  it('expands the change-password form when Change Password is clicked', async () => {
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);
    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    expect(screen.getByPlaceholderText('New password (min. 8 characters)')).toBeInTheDocument();
  });

  it('shows an error when passwords do not match', async () => {
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);
    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    await userEvent.type(screen.getByPlaceholderText('New password (min. 8 characters)'), 'newpassword123');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: /save password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('calls changePassword with correct userId and new password on valid submission', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);

    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    await userEvent.type(screen.getByPlaceholderText('New password (min. 8 characters)'), 'newpassword123');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('user-1', 'newpassword123');
    });
  });

  it('shows a success banner after a successful password change', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);

    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    await userEvent.type(screen.getByPlaceholderText('New password (min. 8 characters)'), 'newpassword123');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  it('shows an error message when changePassword API call fails', async () => {
    mockChangePassword.mockRejectedValueOnce(new Error('newPassword must be at least 8 characters'));
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);

    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    await userEvent.type(screen.getByPlaceholderText('New password (min. 8 characters)'), 'short');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() => {
      expect(screen.getByText(/newPassword must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('collapses the form after a successful password change', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);

    const [firstBtn] = screen.getAllByRole('button', { name: /change password/i });
    await userEvent.click(firstBtn);

    await userEvent.type(screen.getByPlaceholderText('New password (min. 8 characters)'), 'newpassword123');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('New password (min. 8 characters)')).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// RENDERING
// =============================================================================

describe('Account list rendering', () => {
  it('renders all account email addresses', () => {
    render(<AccountInfo accounts={ACCOUNTS} onDeleted={vi.fn()} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('renders nothing when accounts array is empty', () => {
    const { container } = render(<AccountInfo accounts={[]} onDeleted={vi.fn()} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
