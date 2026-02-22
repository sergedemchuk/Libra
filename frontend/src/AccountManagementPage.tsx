import React from "react";

export default function AccountManagementPage() {
  const handleBack = () => {
    window.history.back();
  };

  const handleCreateAccount = () => {
    return;
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

            {/* Button */}
            <button
              type="button"
              onClick={handleCreateAccount}
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

      {/* PLACEHOLDER SECTION */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Account Management
          </h2>

          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
          >
            ← Back
          </button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Account management tools will be available here in a future update.
        </p>
      </div>
    </div>
  );
}