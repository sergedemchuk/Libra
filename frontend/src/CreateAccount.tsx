import {useState} from "react";
import CreateAccountFields from "./AccountCreationDataFields.tsx";
import CreateAccountMainPage from "./MainPageAccountCreation.tsx";

interface CreateAccountProps {
  onBack: () => void;
}

export default function CreateAccount({ onBack }: CreateAccountProps) {

  const[NewAccountEmail, SetNewAccountEmail] = useState("");
  const[NewAccountPassword, SetNewAccountPassword] = useState("");
  const[NewPasswordConfirm, SetNewPasswordConfirm] = useState("");

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
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
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Libra</h1>
          <p className="text-sm text-muted-foreground">
            Library Catalog Management System
          </p>
        </div>

        {/* Create Account Card */}
        <div className="rounded-xl border border-primary/20 bg-card/40 backdrop-blur p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 text-foreground hover:text-primary transition-colors"
              aria-label="Go back"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Create Account
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Join Libra to start processing your data files
              </p>
            </div>
          </div>


          {/* Account email and password Section */}
          {/* Get the string of user input with these parameters*/}
            <div>
              <CreateAccountFields 
              SetEmailString={SetNewAccountEmail}
              SetPasswordString={SetNewAccountPassword}
              SetPasswordConfirmString={SetNewPasswordConfirm}
              />
            </div>


          <div
            className="absolute left-20 text-center w-full px-4 py-2.5 items-center rounded-lg bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
          >

          <CreateAccountMainPage 
            EmailString = {NewAccountEmail}
            PasswordString = {NewAccountPassword}
            PasswordConfirmString = {NewPasswordConfirm}
          />

          </div>
          
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 The Compilers
          </p>
        </div>
      </div>
    </div>
  );
}