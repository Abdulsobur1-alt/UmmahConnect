"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Crown, Sparkles, Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { apiSend } from "@/lib/api/client";

type UpgradeModalProps = {
  onClose: () => void;
};

type SubscribeResponse = {
  authorization_url: string;
  reference: string;
};

const features = [
  { label: "Professional profile with banner & photo", free: true, pro: true },
  { label: "Public communities", free: true, pro: true },
  { label: "Browse jobs and mentorship", free: true, pro: true },
  { label: "Connections", free: "30 max", pro: "Unlimited" },
  { label: "Messages per week", free: "10/week", pro: "Unlimited" },
  { label: "Chat appearance themes", free: false, pro: true },
  { label: "Post job listings", free: false, pro: true },
  { label: "Full mentorship matching", free: false, pro: true },
  { label: "Private groups & communities", free: false, pro: true },
  { label: "Profile analytics", free: false, pro: true },
  { label: "Verified badge eligibility", free: false, pro: true },
];

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const subscribe = useMutation({
    mutationFn: () => apiSend<SubscribeResponse>("/api/payments/subscribe", "POST", { plan: "pro" }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
  });

  return (
    <Modal title="Upgrade your plan" onClose={onClose} size="lg">
      <div className="plan-comparison-grid">
        {/* Free plan card */}
        <div className="plan-card-compare">
          <div className="plan-card-compare-header">
            <h3 className="plan-card-compare-name">Free</h3>
            <div className="plan-card-compare-price">₦0<span>/month</span></div>
            <p className="plan-card-compare-desc">For getting started</p>
          </div>
          <div className="plan-card-compare-features">
            {features.map((feature) => (
              <div key={feature.label} className="plan-feature-row">
                {feature.free === true ? (
                  <Check size={14} className="plan-feature-check" />
                ) : (
                  <span className="plan-feature-value plan-feature-value--free">{String(feature.free)}</span>
                )}
                <span className={`plan-feature-label${feature.free === true ? "" : " plan-feature-label--muted"}`}>
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro plan card — featured */}
        <div className="plan-card-compare plan-card-compare--featured">
          <div className="plan-card-compare-badge">
            <Sparkles size={12} /> Most Popular
          </div>
          <div className="plan-card-compare-header">
            <h3 className="plan-card-compare-name plan-card-compare-name--pro">
              <Crown size={18} /> Pro
            </h3>
            <div className="plan-card-compare-price plan-card-compare-price--pro">₦9,000<span>/month</span></div>
            <p className="plan-card-compare-desc">For ambitious professionals</p>
          </div>
          <div className="plan-card-compare-features">
            {features.map((feature) => (
              <div key={feature.label} className="plan-feature-row">
                {feature.pro === true ? (
                  <Check size={14} className="plan-feature-check plan-feature-check--pro" />
                ) : (
                  <span className="plan-feature-value">{String(feature.pro)}</span>
                )}
                <span className="plan-feature-label">{feature.label}</span>
              </div>
            ))}
          </div>
          <button
            className="plan-upgrade-btn"
            disabled={subscribe.isPending}
            onClick={() => subscribe.mutate()}
          >
            {subscribe.isPending ? (
              <>Opening Paystack…</>
            ) : (
              <>
                <Star size={16} /> Upgrade to Pro
              </>
            )}
          </button>
          {subscribe.error ? (
            <p className="plan-error-msg">Payment could not be started. Please try again.</p>
          ) : null}
        </div>
      </div>

      <p className="plan-footer-text">
        Secure payment via <strong>Paystack</strong>. You can cancel anytime. No hidden fees.
      </p>
    </Modal>
  );
}
