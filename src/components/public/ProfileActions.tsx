'use client';

import { useState } from 'react';
import { GatedButton } from '@/components/ui/GatedButton';

interface ProfileActionsProps {
  user: { id: string } | null;
  profileId: string;
}

export function ProfileActions({ user, profileId }: ProfileActionsProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function connect() {
    setStatus('loading');
    const response = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: profileId }),
    });
    if (response.ok) {
      setStatus('sent');
    } else {
      setStatus('error');
    }
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this profile? (e.g. spam, impersonation, harassment)");
    if (!reason?.trim()) return;
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reported_user_id: profileId, reason }) });
    setStatus(response.ok ? "sent" : "error");
  }

  async function block() {
    if (!window.confirm("Block this member? They will no longer be able to connect with you.")) return;
    const response = await fetch(`/api/trust/block/${profileId}`, { method: "POST" });
    setStatus(response.ok ? "sent" : "error");
  }

  return (
    <div>
      <GatedButton
        user={user}
        onAction={() => void connect()}
        className="btn btn-primary"
        style={{ marginTop: 16 }}
      >
        {status === 'loading' ? 'Connecting...' : status === 'sent' ? 'Request Sent' : 'Connect'}
      </GatedButton>
      {user ? <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn btn-ghost" type="button" onClick={() => void report()}>Report</button>
        <button className="btn btn-ghost" type="button" onClick={() => void block()}>Block</button>
      </div> : null}
      {status === 'error' ? (
        <p className="muted" style={{ marginTop: 8 }}>Could not send connection request. Please try again.</p>
      ) : null}
    </div>
  );
}
