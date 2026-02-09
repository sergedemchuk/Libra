import { useState, FormEvent } from "react";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // TODO: Replace with actual authentication logic
    // This is a placeholder that simulates an API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate authentication check
      if (email && password) {
        // Store auth token or session info if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem("libra_remember", "true");
        }
        onLoginSuccess();
      } else {
        setError("Please enter both email and password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Login Card */}
        <div className="rounded-xl border border-primary/20 bg-card/40 backdrop-blur p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Sign in to your account
          </h2>
            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-accent focus:ring-2 focus:ring-primary cursor-pointer"
                  style={{ accentColor: "var(--primary)" }}
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            </div>
            
          {/* Create Account */}
          <div className="mt-6 pt-6 border-t border-primary/10 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
                disabled={isLoading}
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Â© 2026 The Compilers 
          </p>
        </div>
      </div>
    </div>
  );
}