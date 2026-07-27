"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiSend } from "@/lib/api/client";
import { trackMetric } from "@/lib/metrics";

export function Onboarding() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const form = new FormData(event.currentTarget);
    const skills = String(form.get("skills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20);
    try {
      await apiSend("/api/users/me", "PATCH", { skills, open_to_opportunities: form.get("open_to_opportunities") === "on", allow_connection_requests: form.get("allow_connection_requests") === "on", onboarding_completed: true });
      trackMetric("onboarding_completed", { skills_count: skills.length, mentorship_interest: form.get("mentorship_interest") === "on" });
      router.replace("/feed");
    } catch { setError("We could not save your preferences. Please try again."); setSaving(false); }
  }
  return <div className="onboarding-shell"><Card padding="lg" className="onboarding-card"><span className="eyebrow">Welcome to Ummah Connect</span><h1>Make your network more relevant</h1><p className="muted">A few preferences help us surface better people, mentorship, and opportunities. You can change these anytime.</p><form className="grid" onSubmit={submit}><Input name="skills" label="Skills" placeholder="e.g. Product design, Figma, Research" /><label className="onboarding-choice"><input name="open_to_opportunities" type="checkbox" /> <span><strong>Open to opportunities</strong><small>Let relevant employers and connections know you are open.</small></span></label><label className="onboarding-choice"><input name="mentorship_interest" type="checkbox" /> <span><strong>Interested in mentorship</strong><small>We&apos;ll highlight mentorship when it fits your profile.</small></span></label><label className="onboarding-choice"><input name="allow_connection_requests" type="checkbox" defaultChecked /> <span><strong>Allow connection requests</strong><small>You stay in control and can turn this off in Settings.</small></span></label>{error ? <p className="form-error">{error}</p> : null}<Button type="submit" loading={saving}>Finish setup</Button></form></Card></div>;
}
