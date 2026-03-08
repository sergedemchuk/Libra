import React, { useState } from 'react';
import { Account, deleteAccount, changePassword } from './api/client';

interface AccountInfoProps {
  accounts: Account[];
  onDeleted: (userId: string) => void;
}

function AccountInfo({ accounts, onDeleted }: AccountInfoProps) {
  // Tracks which account has the change-password form open
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successUserId, setSuccessUserId] = useState<string | null>(null);

  const openForm = (userId: string) => {
    setExpandedUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setSaveError('');
  };

  const closeForm = () => {
    setExpandedUserId(null);
    setNewPassword('');
    setConfirmPassword('');
    setSaveError('');
  };

  const handleChangePassword = async (userId: string) => {
    if (newPassword !== confirmPassword) {
      setSaveError('Passwords do not match');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await changePassword(userId, newPassword);
      closeForm();
      setSuccessUserId(userId);
      setTimeout(() => setSuccessUserId(null), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteAccount(userId);
      onDeleted(userId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  return (
    <div>
      {accounts.map((account) => (
        <div key={account.userId}>
          {/* Account row */}
          <div className="grid grid-cols-4 gap-x-20 text-sm font-semm-bold text-primary border border-[#753114]/20 m-1 rounded-s">
            {/* email */}
            <div className="text-left p-4">{account.email}</div>

            {/* date Created */}
            <div className="text-center p-4">
              {new Date(account.dateCreated).toLocaleDateString()}
            </div>

            {/* last login */}
            <div className="text-center p-4">
              {new Date(account.lastLogin).toLocaleDateString()}
            </div>

            {/* Action buttons */}
            <div className="text-right mt-2 mb-1 flex justify-end gap-1 pr-3">
              <button
                type="button"
                onClick={() => openForm(account.userId)}
                className="p-2 border border-[#753114]/20 box-border rounded bg-brand-500 hover:bg-brand-gradient text-xs"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => handleDelete(account.userId)}
                className="p-2 border border-[#753114]/20 box-border rounded bg-brand-500 hover:bg-brand-gradient text-xs"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Success banner */}
          {successUserId === account.userId && (
            <div className="mx-1 mb-1 px-4 py-2 border border-green-400/40 rounded bg-green-50/60 text-green-700 text-sm font-medium">
              Password changed successfully.
            </div>
          )}

          {/* Inline change-password form */}
          {expandedUserId === account.userId && (
            <div className="mx-1 mb-1 px-4 py-3 border border-[#753114]/20 rounded-b-s bg-white/20">
              <div className="flex flex-col gap-2 max-w-sm">
                {/* Header with X close button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/70">Change Password</span>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="text-foreground/50 hover:text-foreground transition-colors leading-none"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  minLength={8}
                  disabled={saving}
                  className="px-3 py-1.5 rounded border border-primary/20 bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={saving}
                  className="px-3 py-1.5 rounded border border-primary/20 bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                <button
                  type="button"
                  onClick={() => handleChangePassword(account.userId)}
                  disabled={saving || !newPassword || !confirmPassword}
                  className="self-start px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AccountInfo;
