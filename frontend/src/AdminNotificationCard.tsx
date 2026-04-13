import { useState } from "react";
import { notifyAdminOfChange } from "./api/client";

interface AdminNotificationCardProps {
  currentUserEmail: string;
}

type Status = "idle" | "sending" | "sent" | "error";

export default function AdminNotificationCard({ currentUserEmail }: AdminNotificationCardProps) {
  const [change, setChange] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const send = async () => {
    if (!change.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await notifyAdminOfChange(currentUserEmail, change.trim(), details.trim() || undefined);
      setStatus("sent");
      setChange("");
      setDetails("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send notification");
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-none mt-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            Notify admin of account changes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Any changes to the accounts database should be reported to the admin.
            Send a quick summary below.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="change-summary" className="block text-sm font-medium text-foreground mb-1">
                Summary <span className="text-destructive">*</span>
              </label>
              <input
                id="change-summary"
                type="text"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                disabled={status === "sending"}
                placeholder="e.g. Created account jane@example.com"
                className="w-full px-4 py-2 rounded-lg border border-primary/20 bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label htmlFor="change-details" className="block text-sm font-medium text-foreground mb-1">
                Details <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="change-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                disabled={status === "sending"}
                rows={3}
                placeholder="Anything else the admin should know…"
                className="w-full px-4 py-2 rounded-lg border border-primary/20 bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={send}
                disabled={status === "sending" || !change.trim()}
                className="inline-flex items-center gap-2 rounded-md border border-[color:var(--foreground)] bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {status === "sending" ? "Sending…" : "Send to admin"}
              </button>

              {status === "sent" && (
                <span className="text-sm text-primary font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Admin notified
                </span>
              )}

              {status === "error" && (
                <span className="text-sm text-destructive">
                  {errorMsg || "Failed to send"}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Sent from <span className="font-mono">{currentUserEmail}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}