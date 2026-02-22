import { useState, FormEvent } from "react";

type AccountManagementPageProps = {
  onBack?: () => void;
};

export default function AccountManagementPage({ onBack }: AccountManagementPageProps) {

return (
    <div>
        {/* Page Header */}
        <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Account Management Page
            </h1>
            <svg
              className="w-8 h-8 text-primary"
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
            <p className="mt-2 text-sm text-muted-foreground">
                Manage user accounts
            </p>
        </header>
        <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Account Management
                </h2>
                {onBack && (
                <button
                    type="button"
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    onClick={onBack}
                >
                    ← Back
                </button>
                )}
            </div>

        <p className="text-sm text-muted-foreground">
            Account management tools will be available here in a future update.
        </p>
        </section>
    </div>
  );
}