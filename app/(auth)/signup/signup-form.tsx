"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const industries = [
  "Tech & Software",
  "Halal Finance",
  "Healthcare",
  "Creative Arts",
  "Education",
  "Law & Policy",
  "Entrepreneurship",
  "Architecture",
  "Media & Journalism",
  "NGO & Nonprofit",
  "Other",
];

const careerStages = [
  "Student",
  "Early Career",
  "Mid-Level",
  "Senior",
  "Executive",
  "Entrepreneur",
];
const cities = [
  "Lagos",
  "Abuja",
  "Kano",
  "Kaduna",
  "Port Harcourt",
  "Ibadan",
  "Maiduguri",
  "Sokoto",
  "Zaria",
  "Other",
];

function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < 8) issues.push("Minimum 8 characters.");
  if (!/[A-Z]/.test(password))
    issues.push("Add at least one uppercase letter.");
  if (!/[0-9]/.test(password)) issues.push("Add at least one number.");
  if (!/[^A-Za-z0-9]/.test(password))
    issues.push("Add at least one special character.");
  return issues;
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "#ef4444" };
  let score = password.length >= 8 ? 2 : 1;
  if (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
    score = 3;
  if (score === 3 && /[^A-Za-z0-9]/.test(password)) score = 4;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "#ef4444",
    "#ef4444",
    "#f97316",
    "var(--color-accent)",
    "var(--color-success)",
  ];
  return { score, label: labels[score], color: colors[score] };
}

export default function SignupForm() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [formData, setFormData] = useState<Record<string, string> | null>(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const strength = useMemo(() => passwordStrength(password), [password]);

  function focusNext(idx: number) {
    if (idx < 5) {
      codeRefs.current[idx + 1]?.focus();
    }
  }

  function focusPrev(idx: number) {
    if (idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  }

  function handleCodeChange(idx: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...verificationCode];
    next[idx] = digit;
    setVerificationCode(next);
    setVerificationError(null);
    if (digit) focusNext(idx);
  }

  function handleCodeKeyDown(
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !verificationCode[idx]) {
      focusPrev(idx);
    }
  }

  async function sendVerificationCode() {
    if (!signUp) return;
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
    } catch (err: any) {
      setVerificationError(
        err?.errors?.[0]?.message ?? "Failed to send verification code.",
      );
    } finally {
      setResending(false);
    }
  }

  async function verifyCode() {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setVerificationError("Please enter the full 6-digit code.");
      return;
    }

    if (!signUp) return;
    setLoading(true);
    setVerificationError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });

        // Create DB user record
        if (formData) {
          await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formData,
              clerk_id: signUp.createdUserId,
              password,
              country: "Nigeria",
            }),
          });
        }

        window.location.href = "/feed";
      } else {
        setVerificationError(
          "Verification failed. Please try again.",
        );
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      setVerificationError(
        err?.errors?.[0]?.message ??
          "Invalid code. Please try again.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const confirmPassword = String(form.get("confirm_password") ?? "");
    const nextErrors: Record<string, string> = {};

    for (const field of [
      "full_name",
      "email",
      "industry",
      "career_stage",
      "city",
    ]) {
      if (!String(form.get(field) ?? "").trim())
        nextErrors[field] = "This field is required.";
    }
    const issues = passwordIssues(password);
    if (issues.length) nextErrors.password = issues[0];
    if (password !== confirmPassword)
      nextErrors.confirm_password = "Passwords must match.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !signUp) {
      setFormError("Authentication system is loading.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: body.email as string,
        password,
      });

      if (result.status === "complete") {
        // No email verification needed — proceed directly
        await setActive({ session: result.createdSessionId });

        await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            clerk_id: signUp.createdUserId,
            password,
            country: "Nigeria",
          }),
        });

        window.location.href = "/feed";
      } else if (
        result.status === "missing_requirements" &&
        result.verifications?.emailAddress?.status === "unverified"
      ) {
        // Email verification required — send code and show verification UI
        setFormData(Object.fromEntries(form.entries()) as Record<string, string>);
        setLoading(false);
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setVerifying(true);
        // Focus the first code input after render
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      } else {
        setLoading(false);
        setFormError(
          "Signup could not be completed. Please try again.",
        );
      }
    } catch (err: any) {
      setLoading(false);
      setFormError(
        err?.errors?.[0]?.message ??
          "Signup could not be completed. Please review your details and try again.",
      );
    }
  }

  /* ── Verification Screen ── */
  if (verifying) {
    const email = formData?.email ?? "";
    const code = verificationCode.join("");
    const allFilled = code.length === 6;

    return (
      <PageTransition>
        <div className="auth-stack">
          <div className="auth-card">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--color-accent-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <MailCheck size={28} style={{ color: "var(--color-accent)" }} />
              </div>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 26,
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                Check your email
              </h1>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                We sent a 6-digit verification code to
                <br />
                <strong style={{ color: "var(--color-text)" }}>{email}</strong>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              {verificationCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    codeRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (pasted.length === 6) {
                      const next = pasted.split("");
                      setVerificationCode(next);
                      codeRefs.current[5]?.focus();
                    }
                  }}
                  style={{
                    width: 44,
                    height: 52,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "'DM Mono', monospace",
                    borderRadius: 10,
                    border: `2px solid ${verificationError ? "var(--color-error)" : digit ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = digit
                      ? "var(--color-accent)"
                      : "var(--color-border)")
                  }
                />
              ))}
            </div>

            {verificationError && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--color-error)",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {verificationError}
              </p>
            )}

            <button
              className="auth-submit"
              disabled={loading || !allFilled}
              onClick={verifyCode}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={17} /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Verify email
                </>
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginTop: 16,
              }}
            >
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                disabled={resending}
                onClick={sendVerificationCode}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-accent)",
                  cursor: resending ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                {resending ? "Sending..." : "Resend code"}
              </button>
            </p>

            <button
              type="button"
              onClick={() => {
                setVerifying(false);
                setVerificationError(null);
                setVerificationCode(["", "", "", "", "", ""]);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                marginTop: 20,
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "12px 0",
                color: "var(--color-text-muted)",
                fontSize: 13,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              <ArrowLeft size={14} />
              Back to signup form
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  /* ── Signup Form ── */

  return (
    <PageTransition>
      <div className="auth-stack">
        <form className="auth-card auth-card--wide" onSubmit={submit}>
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
            Create your account
          </h1>
          <p className="auth-subtitle">
            Join Muslim professionals across Nigeria
          </p>

          <label className="auth-field">
            <span>Full Name</span>
            <input
              name="full_name"
              type="text"
              placeholder="Aisha Bello"
              autoComplete="name"
            />
            {errors.full_name ? <small>{errors.full_name}</small> : null}
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email ? <small>{errors.email}</small> : null}
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.currentTarget.value)
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="strength-track" aria-hidden="true">
              <span
                style={{
                  width: `${strength.score * 25}%`,
                  background: strength.color,
                }}
              />
            </div>
            {strength.label ? (
              <em style={{ color: strength.color }}>{strength.label}</em>
            ) : null}
            {errors.password ? <small>{errors.password}</small> : null}
          </label>

          <label className="auth-field">
            <span>Confirm Password</span>
            <input
              name="confirm_password"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            {errors.confirm_password ? (
              <small>{errors.confirm_password}</small>
            ) : null}
          </label>

          <label className="auth-field">
            <span>Industry</span>
            <select
              name="industry"
              defaultValue=""
              onChange={(e) =>
                setShowCustomIndustry(e.target.value === "Other")
              }
            >
              <option value="" disabled>
                Select industry
              </option>
              {industries.map((industry) => (
                <option key={industry}>{industry}</option>
              ))}
            </select>
            {showCustomIndustry && (
              <input
                name="industry_custom"
                type="text"
                placeholder="Type your industry..."
                style={{ marginTop: 8 }}
              />
            )}
            {errors.industry ? <small>{errors.industry}</small> : null}
          </label>

          <label className="auth-field">
            <span>Career Stage</span>
            <select name="career_stage" defaultValue="">
              <option value="" disabled>
                Select career stage
              </option>
              {careerStages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
            {errors.career_stage ? (
              <small>{errors.career_stage}</small>
            ) : null}
          </label>

          <label className="auth-field">
            <span>City</span>
            <select name="city" defaultValue="">
              <option value="" disabled>
                Select city
              </option>
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
            {errors.city ? <small>{errors.city}</small> : null}
          </label>

          <input type="hidden" name="plan" value="free" />

          {formError ? (
            <p className="auth-form-error">{formError}</p>
          ) : null}

          {/* Clerk requires this element for Smart CAPTCHA rendering */}
          <div
            id="clerk-captcha"
            data-cl-theme="dark"
            data-cl-size="normal"
            style={{
              display: "flex",
              justifyContent: "center",
              minHeight: 72,
              marginBottom: 8,
            }}
          />

          <button className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin" size={17} /> Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
          <p className="terms-line">
            By joining you agree to our Terms and Privacy Policy
          </p>

          <div className="auth-divider" />
          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </PageTransition>
  );
}
