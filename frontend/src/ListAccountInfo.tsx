import React from 'react';
import { Account, deleteAccount } from './api/client';

interface AccountInfoProps {
  accounts: Account[];
  onDeleted: (userId: string) => void;
}

function AccountInfo({ accounts, onDeleted }: AccountInfoProps) {
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
        <div
          key={account.userId}
          className="grid grid-cols-4 gap-x-20 text-sm font-semm-bold text-primary border border-[#753114]/20 m-1 rounded-s"
        >
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
          <div className="text-right mt-2 mb-1">
            <button
              type="button"
              onClick={() => handleDelete(account.userId)}
              className="mr-3 p-2 border border-[#753114]/20 box-border rounded bg-brand-500 hover:bg-brand-gradient"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AccountInfo;
