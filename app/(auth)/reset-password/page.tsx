"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    if (!email) {
      setError("Email is required.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setError(error.message === "too_many_requests" 
          ? "Too many attempts. Try again later." 
          : "Please try again in a moment.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("An unexpected error occurred.");
    }
    
    setLoading(false);
  }

  return (
    <PageTransition>
      <main className="auth-page">
        <div className="auth-stack">
          <section className="auth-card">
            <Link href="/" className="auth-logo">Ummah <span>Connect</span></Link>
            {sent ? (
              <div className="auth-success">
                <div className="success-icon"><Check size={28} /></div>
                <h1>Check your email</h1>
                <p className="auth-subtitle">If this address is registered, you&apos;ll receive a reset link shortly.</p>
                <Link href="/login">Back to sign in</Link>
              </div>
            ) : (
              <form className="auth-inner-form" onSubmit={submit}>
                <h1>Reset password</h1>
                <p className="auth-subtitle">Enter your email to reset your password</p>
                <label className="auth-field">
                  <span>Email</span>
                  <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
                </label>
                {error ? <p className="auth-form-error">{error}</p> : null}
                <button className="auth-submit" disabled={loading}>
                  {loading ? <><Loader2 className="spin" size={17} /> Sending...</> : "Send reset link"}
                </button>
                <p className="reset-note">We&apos;ll send a link to your email. Check your spam folder if you don&apos;t see it.</p>
                <div className="auth-divider" />
                <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
              </form>
            )}
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
