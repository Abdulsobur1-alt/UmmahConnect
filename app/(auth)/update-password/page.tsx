"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      setError(err?.message ?? "Failed to update password.");
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <main className="page auth-page">
        <form className="card grid auth-card" onSubmit={submit}>
          <Link href="/" className="brand">
            Ummah <span>Connect</span>
          </Link>
          <h1 className="font-display">Choose a new password</h1>
          <input
            className="input"
            name="password"
            type="password"
            placeholder="New password"
            required
            minLength={8}
          />
          {error ? <p className="muted">{error}</p> : null}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
