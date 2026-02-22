// MenuBar.tsx

export type PageKey = "upload" | "account";

interface MenuBarProps {
  activePage: PageKey;
  onPageChange: (page: PageKey) => void;
  onLogout?: () => void;
}

export default function MenuBar({ activePage, onPageChange, onLogout }: MenuBarProps) {
  const makeButtonClasses = (isActive: boolean) =>
    [
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border",
      isActive
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-transparent text-muted-foreground border-transparent hover:bg-primary/10",
    ].join(" ");

  return (
    <nav
      className="
        sticky top-0 z-30
        border-b border-[var(--border)]
        bg-[var(--background)]/90
        backdrop-blur
      "
    >
      <div className="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between">
        {/* Left: app title / logo */}
        <div className="text-sm font-semibold text-foreground">
          Libra
        </div>

        {/* Center: page switch buttons */}
        <div className="flex items-center gap-2">
          {/* Upload Catalog Data */}
          <button
            type="button"
            aria-pressed={activePage === "upload"}
            className={makeButtonClasses(activePage === "upload")}
            onClick={() => onPageChange("upload")}
          >
            {/* Upload icon */}
            <svg
              aria-hidden="true"
              focusable="false"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="M6 9l6-6 6 6" />
              <path d="M4 18h16" />
            </svg>
            <span>Upload Catalog Data</span>
          </button>

          {/* Account Management */}
          <button
            type="button"
            aria-pressed={activePage === "account"}
            className={makeButtonClasses(activePage === "account")}
            onClick={() => onPageChange("account")}
          >
            {/* Account icon */}
            <svg
              aria-hidden="true"
              focusable="false"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
            <span>Account Management</span>
          </button>
        </div>

        {/* Right: logout button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border border-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Sign out"
          >
            {/* Logout icon */}
            <svg
              aria-hidden="true"
              focusable="false"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        )}
      </div>
    </nav>
  );
}
