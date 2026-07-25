"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const signupSuccess = searchParams.get("signup") === "success";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nextErrors: Record<string, string> = {};
    if (!email) nextErrors.email = "Email is required.";
    if (!password) nextErrors.password = "Password is required.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError(error.message === "Invalid login credentials"
          ? "Invalid email or password. Please try again."
          : error.message);
        setLoading(false);
        return;
      }

      router.push("/feed");
      router.refresh();
    } catch (err) {
      setFormError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }

  return (
    <PageTransition>
      <div className="auth-stack">
        <form className="auth-card" onSubmit={submit}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span
              lang="ar"
              dir="rtl"
              style={{
                color: "var(--color-accent)",
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "serif",
                display: "block",
                marginBottom: 12,
              }}
            >
              بسم الله الرحمن الرحيم
            </span>
            <Link href="/" className="auth-logo" style={{ marginBottom: 0 }}>
              Ummah <span>Connect</span>
            </Link>
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            Welcome back
          </h1>
          <p className="auth-subtitle">
            Sign in to your Ummah Connect account
          </p>

          {signupSuccess ? (
            <div className="auth-success-banner">
              Account created successfully! Sign in below to get started.
            </div>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {fieldErrors.email ? <small>{fieldErrors.email}</small> : null}
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password ? (
              <small>{fieldErrors.password}</small>
            ) : null}
          </label>

          <div className="auth-link-row">
            <Link href="/reset-password">Forgot password?</Link>
          </div>

          {formError ? <p className="auth-form-error">{formError}</p> : null}

          <button className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin" size={17} /> Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <div className="auth-divider" />
          <p className="auth-switch">
            Don&apos;t have an account? <Link href="/signup">Join</Link>
          </p>
        </form>
      </div>
    </PageTransition>
  );
}
