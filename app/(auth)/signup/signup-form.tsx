"use client";

import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);




  const strength = useMemo(() => passwordStrength(password), [password]);



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

    setLoading(true);

    try {
      const supabase = createClient();

      // Determine industry value (handle "Other" with custom input)
      const industry =
        body.industry === "Other" && body.industry_custom
          ? body.industry_custom
          : body.industry;

      const { error, data } = await supabase.auth.signUp({
        email: body.email as string,
        password,
        options: {
          data: {
            full_name: body.full_name,
            industry,
            career_stage: body.career_stage,
            city: body.city,
          },
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      if (error) {
        setFormError(error.message);
        setLoading(false);
        return;
      }

      setLoading(false);

      if (data?.user?.identities?.length === 0) {
        // User already exists
        setFormError("An account with this email already exists. Please sign in.");
        return;
      }

      // Ensure we have a session (email confirmation is disabled in Supabase)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await supabase.auth.signInWithPassword({
          email: body.email as string,
          password,
        });
      }

      // Redirect to feed — requireAuth() will auto-create the DB record
      // using the user_metadata we stored above (industry, city, etc.)
      window.location.href = "/feed";
    } catch (err: any) {
      setLoading(false);
      setFormError(
        err?.message ?? "Signup could not be completed. Please try again.",
      );
    }
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
