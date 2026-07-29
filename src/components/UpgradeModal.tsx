"use client";

import { useMutation } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { Modal } from "@/components/Modal";
import { apiSend } from "@/lib/api/client";

type UpgradeModalProps = {
  onClose: () => void;
};

type SubscribeResponse = {
  authorization_url: string;
  reference: string;
};

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const subscribe = useMutation({
    mutationFn: () => apiSend<SubscribeResponse>("/api/payments/subscribe", "POST", { plan: "pro" }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
  });

  return (
    <Modal title="Upgrade to Pro" onClose={onClose}>
      <div className="grid" style={{ gap: 16 }}>
        <p className="muted" style={{ margin: "4px 0 0", lineHeight: 1.7, fontSize: 15 }}>
          Upgrade to unlock job posting, full mentor access, private communities, and unlimited messaging. Grow with professionals who share your values.
        </p>
        <div className="card" style={{ padding: 16, boxShadow: "none" }}>
          <div className="row">
            <Crown color="var(--color-accent)" />
            <div>
              <strong style={{ fontSize: 16 }}>Professional plan</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 }}>Built for Muslim professionals actively growing their network and visibility.</p>
            </div>
          </div>
        </div>
        {subscribe.error ? <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>Payment could not be started. Please try again.</p> : null}
        <button className="btn btn-primary" disabled={subscribe.isPending} onClick={() => subscribe.mutate()} style={{ width: "100%" }}>
          {subscribe.isPending ? "Opening Paystack..." : "Continue to Paystack"}
        </button>
      </div>
    </Modal>
  );
}
