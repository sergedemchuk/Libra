import React, { useState, useEffect, FormEvent } from "react";
import AccountInfo from "./ListAccountInfo.tsx";
import { Account, listAccounts, createAccount } from "./api/client";
import AdminNotificationCard from "./AdminNotificationCard";
import CreateAccountFields from "./AccountCreationDataFields";

interface AccountManagementPageProps {
  onBack: () => void;
  currentUserEmail: string;
}

export default function AccountManagementPage({ onBack, currentUserEmail }: AccountManagementPageProps) {
  const [emailOnCreate, setEmailOnCreate] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Create-account modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load accounts"))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleted = (userId: string) => {
    setAccounts((prev) => prev.filter((a) => a.userId !== userId));
  };

  const openCreateModal = () => {
    setCreateError("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setIsCreateModalOpen(false);
    setCreateError("");
  };

   const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (newPassword !== confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }

    setCreating(true);
    try {
      const account = await createAccount(newEmail, newPassword, newRole);
      setAccounts((prev) => [...prev, account]);
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("user");
      setIsCreateModalOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">
          Account Management Page
        </h1>

        {/* Small icon under title */}
        <div className="mt-2">
          <svg
            className="h-10 w-10 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">Manage user accounts</p>
      </div>

      {/* CREATE NEW ACCOUNT CARD */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 md:p-8 shadow-sm">
        <div className="flex items-start">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              Create New Account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a new user account to the system
            </p>

            {/* Button / Modal */}
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-md border border-[color:var(--foreground)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 hover:shadow-sm"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Create Account
              </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS SECTION */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {/* Bell icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-5 w-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure how you receive alerts about account activity
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-5">
          {/* Email on Account Creation toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[#753114]/20 bg-white/30 px-5 py-4">
            <div className="flex items-center gap-3">
              {/* Mail icon */}
              <svg
                className="h-5 w-5 text-primary/70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Email on Account Creation
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive an email notification when a new account is created
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={emailOnCreate}
              onClick={() => setEmailOnCreate(!emailOnCreate)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                emailOnCreate ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                  emailOnCreate ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN NOTIFICATION CARD */}
      <AdminNotificationCard currentUserEmail={currentUserEmail} />

      {/* ACCOUNT LIST SECTION */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-6 md:p-8 shadow-sm"></div>

      {/* ACCOUNT LIST SECTION */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Account Management
          </h2>

          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
          >
            ← Back
          </button>
        </div>

        {/* All Accounts */}
        <div className="border border-[#753114]/20 rounded-xl bg-white/30 pt-3 mt-10 shadow-sm">

          {/* Main Title */}
          <div className="flex">
            <div className="flex-none">
              {/* image goes here */}
            </div>
            <h1 className="flex-1 pl-5 text-primary/70 text-serif font-semibold">
              All Accounts
            </h1>
          </div>

          <h2 className="flex-none pl-3 text-primary/50 text-mono">
            Manage existing accounts here
          </h2>

          {/* Table */}
          <div className="border border-[#753114]/20 rounded-xl bg-white/30 pt-3 mt-5 shadow-sm m-10">

            <div className="grid grid-cols-4 text-center text-serif font-bold gap-x-20">
              <h1 className="pl-3 text-left">Email</h1>
              <h1 className="text-center">Created</h1>
              <h1 className="text-center">Last Login</h1>
              <h1 className="pr-3 text-right">Action</h1>
            </div>

            <div>
              {loading ? (
                <p className="text-center p-6 text-muted-foreground">Loading accounts...</p>
              ) : loadError ? (
                <p className="text-center p-6 text-destructive">{loadError}</p>
              ) : accounts.length === 0 ? (
                <p className="text-center p-6 text-muted-foreground">No accounts yet.</p>
              ) : (
                <AccountInfo accounts={accounts} onDeleted={handleDeleted} />
              )}
            </div>

            {/* necessary do not remove */}
            <div className="m-10"></div>

          </div>
        </div>
      </div>
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close modal"
            onClick={closeCreateModal}
            disabled={creating}
          />

          {/* Modal panel */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold text-foreground">Create Account</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-md px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4">
              <CreateAccountFields
                SetEmailString={setNewEmail}
                SetPasswordString={setNewPassword}
                SetPasswordConfirmString={setConfirmPassword}
              />

              {createError && <p className="mt-2 text-sm text-destructive">{createError}</p>}

              <div className="mt-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}