"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, Briefcase, Crown, CreditCard, Eye, KeyRound, Lock, MessageCircle, Shield, Sparkles, Star, ThumbsUp, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
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
  const [showUpgrade, setShowUpgrade] = useState(false);
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

  function saveNotification(key: string, enabled: boolean) {
    update.mutate({ notification_settings: { ...currentUser.notification_settings, [key]: enabled } } as Partial<User>);
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
                <input type="checkbox" defaultChecked={currentUser.allow_connection_requests} onChange={(event) => update.mutate({ allow_connection_requests: event.currentTarget.checked })} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        ) : null}
        {activeTab === "Plan" ? (
          <div className="grid">
            <div className="plan-status-row">
              <div className="row">
                <Crown color={currentUser.plan === "pro" ? "var(--color-accent)" : "var(--color-text-muted)"} />
                <strong>Current plan</strong>
              </div>
              <span className={`plan-status-badge plan-status-badge--${currentUser.plan === "pro" ? (currentUser.subscription_status === "at_risk" ? "at_risk" : "pro") : "free"}`}>
                {currentUser.plan === "pro" ? "PRO" : "FREE"}
              </span>
            </div>

            {currentUser.plan === "pro" ? (
              <div className="plan-detail-card">
                <div className="plan-detail-row">
                  <span className="plan-detail-label">Status</span>
                  <span className={`plan-detail-value plan-status-dot--${currentUser.subscription_status === "at_risk" ? "at_risk" : "active"}`}>
                    {currentUser.subscription_status === "at_risk" ? "Payment at risk" : "Active"}
                  </span>
                </div>
                {currentUser.subscription_period_end ? (
                  <div className="plan-detail-row">
                    <span className="plan-detail-label">Renewal date</span>
                    <span className="plan-detail-value">
                      {new Date(currentUser.subscription_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                ) : null}
                {(currentUser.subscription_status === "at_risk" || currentUser.subscription_status === "cancelled") ? (
                  <p className="muted" style={{ fontSize: 13 }}>
                    {currentUser.subscription_status === "at_risk"
                      ? "Your last payment failed. Update your payment method to keep Pro features."
                      : "Your subscription has been cancelled."}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13 }}>
                Free includes 10 messages per week, 30 connections, and public communities.
                Pro unlocks unlimited messaging, job posting, full mentorship, private groups, analytics, and more.
              </p>
            )}

            <div className="row" style={{ gap: 10 }}>
              {currentUser.plan === "free" ? (
                <Button variant="accent" onClick={() => setShowPlan(true)}>Compare plans</Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowPlan(true)}>Compare plans</Button>
              )}
            </div>
          </div>
        ) : null}
        {activeTab === "Notifications" ? (
          <div className="grid">
            <div className="row"><Bell color="var(--color-primary)" /><strong>Notification preferences</strong></div>
            <p className="muted" style={{ fontSize: 13, margin: "0 0 4px" }}>Choose which updates you receive. Disabled types are silently skipped server-side.</p>
            {[
              { key: "connection_request", label: "Connection requests", icon: Users },
              { key: "connection_accepted", label: "Connection accepted", icon: Users },
              { key: "message_received", label: "New messages", icon: MessageCircle },
              { key: "post_liked", label: "Post likes", icon: ThumbsUp },
              { key: "comment_received", label: "Comments on posts", icon: MessageCircle },
              { key: "mentorship_request", label: "Mentorship requests", icon: Sparkles },
              { key: "mentorship_accepted", label: "Mentorship accepted", icon: Sparkles },
              { key: "job_match", label: "Matching jobs", icon: Briefcase },
              { key: "event_sponsored", label: "Sponsored events", icon: Bell },
              { key: "payment_failed", label: "Payment updates", icon: CreditCard },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="row space-between" style={{ cursor: "pointer", padding: "4px 0" }}>
                <span className="row" style={{ gap: 8 }}>
                  <Icon size={16} className="muted" />
                  {label}
                </span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={currentUser.notification_settings[key] !== false} onChange={(event) => saveNotification(key, event.currentTarget.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      {showPlan ? (
        <Modal title="Compare plans" onClose={() => setShowPlan(false)} size="lg">
          <div className="plan-comparison-grid">
            {/* Free card */}
            <div className="plan-card-compare">
              <div className="plan-card-compare-header">
                <h3 className="plan-card-compare-name">Free</h3>
                <div className="plan-card-compare-price">₦0<span>/month</span></div>
                <p className="plan-card-compare-desc">For getting started</p>
              </div>
              <div className="plan-card-compare-actions">
                <span className="plan-card-compare-current">Current plan</span>
              </div>
            </div>

            {/* Pro card — featured */}
            <div className="plan-card-compare plan-card-compare--featured">
              <div className="plan-card-compare-badge"><Sparkles size={12} /> Most Popular</div>
              <div className="plan-card-compare-header">
                <h3 className="plan-card-compare-name plan-card-compare-name--pro">
                  <Crown size={18} /> Pro
                </h3>
                <div className="plan-card-compare-price plan-card-compare-price--pro">₦9,000<span>/month</span></div>
                <p className="plan-card-compare-desc">For ambitious professionals</p>
              </div>
              <div className="plan-card-compare-actions">
                {currentUser.plan === "pro" ? (
                  <span className="plan-card-compare-current">Current plan</span>
                ) : (
                  <button className="plan-upgrade-btn" onClick={() => { setShowPlan(false); setShowUpgrade(true); }}>
                    <Star size={16} /> Upgrade to Pro
                  </button>
                )}
              </div>
            </div>

            {/* Sponsor card */}
            <div className="plan-card-compare">
              <div className="plan-card-compare-header">
                <h3 className="plan-card-compare-name">Event Sponsor</h3>
                <div className="plan-card-compare-price">₦49k<span>/event</span></div>
                <p className="plan-card-compare-desc">For organisations</p>
              </div>
              <div className="plan-card-compare-actions">
                <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>Featured events, targeting & analytics</p>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
      {showUpgrade ? (
        <UpgradeModal onClose={() => setShowUpgrade(false)} />
      ) : null}
    </PageTransition>
  );
}
