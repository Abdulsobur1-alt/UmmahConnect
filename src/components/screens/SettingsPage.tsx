"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, Crown, Eye, KeyRound, Lock, Shield } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageTransition } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import type { User } from "@/types";

const tabs = ["Account", "Privacy", "Plan", "Notifications"];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Account");
  const [showPlan, setShowPlan] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const update = useMutation({
    mutationFn: (body: Partial<User>) => apiSend<{ success: true }>("/api/users/me", "PATCH", body),
    onSuccess: () => {
      toast("Settings saved", "success");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => {
      toast("Could not save. Try again.", "error");
    },
  });

  if (me.isLoading) return <div className="skeleton" />;
  if (me.error || !me.data) {
    return <Card padding="lg">Settings did not load. Please refresh and try again.</Card>;
  }
  const currentUser = me.data;

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({ full_name: String(form.get("full_name") ?? ""), city: String(form.get("city") ?? "") });
  }

  return (
    <PageTransition>
      <div className="screen-title"><div><h1>Settings</h1><p className="muted">Control profile visibility, account details, plan access, and alerts.</p></div></div>
      <div className="row" style={{ flexWrap: "wrap", marginBottom: 18 }}>{tabs.map((tab) => <Button key={tab} variant={activeTab === tab ? "primary" : "ghost"} size="sm" onClick={() => setActiveTab(tab)}>{tab}</Button>)}</div>
      <Card padding="lg">
        {activeTab === "Account" ? (
          <form className="grid" onSubmit={saveAccount}>
            <div className="row"><Shield color="var(--color-primary)" /><strong>Account profile</strong></div>
            <Input name="full_name" placeholder="Full name" defaultValue={currentUser.full_name} />
            <div className="account-email" aria-label="Account email">
              <span>Email address</span>
              <strong>{currentUser.email}</strong>
              <small>Email changes are managed through account verification.</small>
            </div>
            <Input name="city" placeholder="City" defaultValue={currentUser.city} />
            <div className="row row--wrap" style={{ gap: 10 }}>
              <Button type="submit" loading={update.isPending}>Save account</Button>
              <Link href="/reset-password"><Button variant="ghost" icon={<KeyRound size={17} />}>Change password</Button></Link>
            </div>
          </form>
        ) : null}
        {activeTab === "Privacy" ? (
          <div className="grid">
            <div className="row"><Lock color="var(--color-primary)" /><strong>Privacy controls</strong></div>
            <div className="row space-between" style={{ cursor: "pointer" }}>
              <span className="row"><Eye size={18} /> Show profile photo</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={currentUser.show_photo} onChange={(event) => update.mutate({ show_photo: event.currentTarget.checked })} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="row space-between" style={{ cursor: "pointer" }}>
              <span>Open to opportunities</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={currentUser.open_to_opportunities} onChange={(event) => update.mutate({ open_to_opportunities: event.currentTarget.checked })} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="row space-between" style={{ cursor: "pointer" }}>
              <span>Allow connection requests</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        ) : null}
        {activeTab === "Plan" ? (
          <div className="grid">
            <div className="row"><Crown color="var(--color-accent)" /><strong>Current plan: {currentUser.plan === "pro" ? "Pro" : currentUser.plan === "free" ? "Free" : currentUser.plan}</strong></div>
            <p className="muted" style={{ fontSize: 13 }}>Free includes 10 messages per week. Pro unlocks unlimited messaging, full mentorship, private groups, profile analytics, and job posting.</p>
            <Button variant="accent" onClick={() => setShowPlan(true)} style={{ justifySelf: "start" }}>Compare plans</Button>
          </div>
        ) : null}
        {activeTab === "Notifications" ? (
          <div className="grid">
            <div className="row"><Bell color="var(--color-primary)" /><strong>Notification preferences</strong></div>
            {["Connection requests", "New messages", "Mentorship updates", "Matching jobs", "Sponsored events"].map((item) => (
              <div key={item} className="row space-between" style={{ cursor: "pointer" }}>
                <span>{item}</span>
                <label className="toggle-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      {showPlan ? (
        <Modal title="Plan comparison" onClose={() => setShowPlan(false)}>
          <div className="grid" style={{ gap: 12 }}>
            <Card padding="md" style={{ borderColor: "var(--color-line)", boxShadow: "none" }}>
              <h3 style={{ fontFamily: "var(--font-display)", margin: "0 0 8px" }}>Free</h3>
              <strong style={{ fontSize: 28, display: "block", marginBottom: 8 }}>₦0/month</strong>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Professional profile, public communities, 30 connections, 10 messages per week, browse jobs and mentorship.</p>
            </Card>
            <Card padding="md" variant="sponsored">
              <h3 style={{ fontFamily: "var(--font-display)", margin: "0 0 8px" }}>Pro</h3>
              <strong style={{ fontSize: 28, display: "block", marginBottom: 8 }}>₦9,000/month</strong>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Unlimited connections and messaging, job posting, full mentorship matching, halal job alerts, analytics, private groups.</p>
            </Card>
            <Card padding="md" style={{ borderColor: "var(--color-line)", boxShadow: "none" }}>
              <h3 style={{ fontFamily: "var(--font-display)", margin: "0 0 8px" }}>Event Sponsor</h3>
              <strong style={{ fontSize: 28, display: "block", marginBottom: 8 }}>From ₦49,000/event</strong>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>For organisations only: featured events, sponsored slots, targeting, analytics, and Verified Organiser badge.</p>
            </Card>
          </div>
        </Modal>
      ) : null}
    </PageTransition>
  );
}
