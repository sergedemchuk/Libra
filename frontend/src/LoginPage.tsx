import { useState, FormEvent } from "react";
import {
  loginAccount,
  requestPasswordReset,
  send2FACode,
  verify2FACode,
} from "./api/client";

interface LoginPageProps {
  onLoginSuccess: (role: "admin" | "user", email: string) => void;
}

type Step = "credentials" | "2fa";

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA flow state
  const [step, setStep] = useState<Step>("credentials");
  const [code, setCode] = useState("");
  const [pendingRole, setPendingRole] = useState<"admin" | "user">("user");

  // Forgot-password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const account = await loginAccount(email, password);
      const role: "admin" | "user" = account.role === "admin" ? "admin" : "user";
      setPendingRole(role);
      // Trigger 2FA email
      await send2FACode(email);
      setStep("2fa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FA = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await verify2FACode(email, code);
      if (rememberMe) {
        localStorage.setItem("libra_remember", "true");
        localStorage.setItem("libra_role", pendingRole);
      }
      onLoginSuccess(pendingRole, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMsg("");
    setForgotLoading(true);
    try {
      const r = await requestPasswordReset(forgotEmail);
      setForgotMsg(r.message ?? "If that account exists, a reset link has been sent.");
    } catch {
      setForgotMsg("Could not send reset email. Try again later.");
    } finally {
      setForgotLoading(false);
    }
  };

  const resendCode = async () => {
    try { await send2FACode(email); } catch { /* silent */ }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("libradev.admin@gmail.com");
      alert("Copied admin email to clipboard!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy");
    }
  }

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Libra</h1>
          <p className="text-sm text-muted-foreground">Library Catalog Management System</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-primary/20 bg-card/40 backdrop-blur p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {step === "credentials" ? "Sign in to your account" : "Enter verification code"}
          </h2>

          {/* ── STEP 1: CREDENTIALS ─────────────────────────────────────── */}
          {step === "credentials" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email address
                </label>
                <input id="email" type="email" value={email} required autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input id="password" type="password" value={password} required autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>

              {/* Admin Contact Link */}
              <div className="mt-6 pt-6 border-t border-primary/10 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                    disabled={isLoading}
                    onClick={handleCopy}
                  >
                    Contact your administrator
                  </button>
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input id="remember-me" type="checkbox" checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading}
                    style={{ accentColor: "var(--primary)" }}
                    className="w-4 h-4 rounded border-accent focus:ring-2 focus:ring-primary cursor-pointer" />
                  <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <button type="button" disabled={isLoading}
                  onClick={() => { setForgotEmail(email); setForgotMsg(""); setShowForgot(true); }}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {/* ── STEP 2: 2FA CODE ────────────────────────────────────────── */}
          {step === "2fa" && (
            <form onSubmit={handle2FA} className="space-y-5">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
                Enter it below to finish signing in.
              </p>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                  Verification code
                </label>
                <input id="code" type="text" inputMode="numeric" maxLength={6} required
                  autoComplete="one-time-code" value={code} disabled={isLoading}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-input-background text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading || code.length !== 6}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? "Verifying…" : "Verify & sign in"}
              </button>
          

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
                <button type="button" onClick={resendCode}
                  className="text-primary hover:text-primary/80 font-medium transition-colors">
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── FORGOT PASSWORD MODAL ─────────────────────────────────────── */}
        {showForgot && (
          <div role="dialog" aria-modal="true"
               className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
            <div className="bg-card rounded-xl border border-primary/20 p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold text-foreground mb-2">Reset your password</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your account email and we'll send you a reset link.
              </p>

              <form onSubmit={handleForgot} className="space-y-4">
                <input type="email" value={forgotEmail} required
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading} placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />

                {forgotMsg && (
                  <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-3">
                    {forgotMsg}
                  </p>
                )}

                <div className="flex gap-2">
                  <button type="button" disabled={forgotLoading}
                    onClick={() => { setShowForgot(false); setForgotMsg(""); }}
                    className="flex-1 py-2 rounded-lg border border-primary/20 text-foreground hover:bg-primary/5 transition-colors">
                    Close
                  </button>
                  <button type="submit" disabled={forgotLoading || !forgotEmail}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {forgotLoading ? "Sending…" : "Send link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}