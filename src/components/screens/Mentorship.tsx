"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Crown, Send, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/Common";
import { PageTransition, Stagger } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { isPremiumPlan } from "@/lib/plans";
import type { MentorProfile, User } from "@/types";

const mentorTabs = ["Find Mentors", "My Requests"] as const;
type MentorTab = (typeof mentorTabs)[number];

export function Mentorship() {
  const [activeTab, setActiveTab] = useState<MentorTab>("Find Mentors");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requestedMentorId, setRequestedMentorId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const mentors = useQuery({ queryKey: ["mentor-matches"], queryFn: () => apiGet<MentorProfile[]>("/api/mentorship/matches"), retry: false });
  const profiles = useQuery({ queryKey: ["mentor-profiles"], queryFn: () => apiGet<MentorProfile[]>("/api/mentorship/profiles"), enabled: Boolean(mentors.error) });
  const myRequests = useQuery({
    queryKey: ["my-mentorship-requests"],
    queryFn: () => apiGet<any[]>("/api/mentorship/requests"),
    enabled: activeTab === "My Requests" && isPremiumPlan(me.data?.plan),
    retry: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestMentorship = useMutation({
    mutationFn: ({ mentor_id, message }: { mentor_id: string; message: string }) => apiSend("/api/mentorship/requests", "POST", { mentor_id, message }),
    onSuccess: (_, { mentor_id: mentorId }) => {
      setRequestedMentorId(mentorId);
      setRequestMessage("");
      toast("Request sent", "success");
      void queryClient.invalidateQueries({ queryKey: ["my-mentorship-requests"] });
    },
    onError: () => {
      toast("Request could not be sent.", "error");
    },
  });
  const currentUser = me.data;
  const list = mentors.data ?? profiles.data ?? [];

  if (mentors.error && me.error) return <ErrorState onRetry={() => { void mentors.refetch(); void me.refetch(); }} title="Mentorship did not load" />;
  if (mentors.isLoading || me.isLoading) return <div className="skeleton" />;

  const profileTags = currentUser ? [currentUser.industry, currentUser.career_stage, currentUser.city].filter(Boolean) : [];

  return (
    <PageTransition>
      <div className="screen-title"><div><h1>Mentorship</h1><p className="muted">Match with mentors by industry, stage, language, location, and values.</p></div></div>

      {/* Tab bar */}
      <div className="discover-tabs" style={{ marginBottom: 16 }}>
        {mentorTabs.map((tab) => (
          <button
            key={tab}
            className={`discover-tab ${activeTab === tab ? "discover-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "My Requests" ? (
        /* ─── My Requests Tab ─── */
        <section>
          {!isPremiumPlan(me.data?.plan) ? (
            <Card variant="sponsored" padding="lg">
              <div className="row space-between" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="row"><Crown color="var(--color-accent)" /><div><strong>Premium feature</strong><p className="muted" style={{ margin: "4px 0 0" }}>Upgrade to send mentorship requests and track them.</p></div></div>
                <Button variant="accent" icon={<Crown size={16} />} onClick={() => window.location.href = "/settings"}>Upgrade</Button>
              </div>
            </Card>
          ) : myRequests.isLoading ? (
            <div className="skeleton" />
          ) : (myRequests.data ?? []).length === 0 ? (
            <EmptyState icon={<Send size={28} />} title="No requests yet" description="Browse mentors and send a request to get started." />
          ) : (
            <div className="grid" style={{ gap: 8 }}>
              {myRequests.data!.map((req: any) => (
                <Card key={req.id} padding="md">
                  <div className="row space-between">
                    <div>
                      <strong className="text-14">Request to {req.mentorId}</strong>
                      <p className="muted text-13" style={{ margin: '2px 0 0' }}>Status: <span style={{ color: req.status === 'accepted' ? 'var(--color-success)' : 'var(--color-accent)' }}>{req.status}</span></p>
                    </div>
                    {req.message && <p className="muted text-12" style={{ maxWidth: 240 }}>&ldquo;{req.message}&rdquo;</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* ─── Find Mentors Tab ─── */
        <>
      {profileTags.length > 0 ? (
        <Card padding="lg" style={{ marginBottom: 18, background: "var(--color-bg-secondary)" }}>
          <div className="row"><Sparkles color="var(--color-success)" /><div><strong>Your match profile</strong><p style={{ color: "var(--color-text-muted)", marginBottom: 0 }}>Based on your profile data</p></div></div>
          <div className="row" style={{ flexWrap: "wrap", marginTop: 10, gap: 8 }}>{profileTags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}</div>
        </Card>
      ) : null}

      {mentors.error ? <Card variant="sponsored" padding="lg" style={{ marginBottom: 18 }}>
        <div className="row space-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="row"><Crown color="var(--color-accent)" /><div><strong>Unlock full mentorship matching</strong><p className="muted" style={{ margin: "4px 0 0" }}>Free users can browse mentors — upgrade to send requests and see scored matches.</p></div></div>
          <Button variant="accent" icon={<Crown size={16} />} onClick={() => window.location.href = "/settings"}>Upgrade</Button>
        </div>
      </Card> : null}

      {requestMentorship.error ? <Card padding="md" style={{ marginBottom: 18 }}><strong>Request not sent.</strong><p className="muted">Please try again or check your account access.</p></Card> : null}

      <Stagger as="section" className="grid three-col" style={{ gap: "var(--item-gap)" }}>
        {list.length > 0 ? list.map((mentor) => {
          const isOpen = expanded === mentor.user_id;
          const requested = requestedMentorId === mentor.user_id;
          const matchPct = mentor.match_score ?? 0;
          const matchColor = matchPct >= 80 ? "var(--color-success)" : matchPct >= 50 ? "var(--color-accent)" : "var(--color-text-muted)";
          return (
            <Card padding="lg" key={mentor.user_id}>
              <div className="row space-between" style={{ marginBottom: 8 }}>
                <span className="pill" style={{ background: matchPct >= 80 ? "var(--color-success-light)" : "var(--color-bg-hover)", color: matchColor }}>{matchPct}% match</span>
                <Button variant="ghost" size="sm" icon={isOpen ? <X size={16} /> : <ChevronDown size={16} />} onClick={() => setExpanded(isOpen ? null : mentor.user_id)}><></></Button>
              </div>
              <h2 className="font-display" style={{ fontSize: 26, margin: "4px 0" }}>{mentor.full_name}</h2>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 8px" }}><strong>{mentor.role}</strong> · {mentor.city}</p>
              <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>{mentor.industries.slice(0, 3).map((industry) => <span className="pill" key={industry} style={{ fontSize: 11 }}>{industry}</span>)}</div>
              {isOpen ? <>
                <div style={{ height: 1, background: "var(--color-line-light)", margin: "12px 0" }} />
                {mentor.bio && <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{mentor.bio}</p>}
                {mentor.values_tags.length > 0 && <div className="row" style={{ flexWrap: "wrap", gap: 4, marginTop: 8 }}>{mentor.values_tags.map((tag) => <span className="pill" key={tag} style={{ fontSize: 11 }}>{tag}</span>)}</div>}
                <textarea
                  className="textarea"
                  placeholder="Write a brief message explaining why you'd like mentorship..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.currentTarget.value)}
                  rows={3}
                  style={{ marginTop: 12, fontSize: 13, minHeight: 60 }}
                />
                <Button
                  variant={mentors.error ? "accent" : "primary"}
                  fullWidth
                  style={{ marginTop: 8 }}
                  disabled={requestMentorship.isPending || requested || !requestMessage.trim()}
                  onClick={() => requestMentorship.mutate({ mentor_id: mentor.user_id, message: requestMessage.trim() })}
                >
                  {requested ? "Request sent ✓" : mentors.error ? <><Crown size={14} /> Upgrade to connect</> : "Send request"}
                </Button>
              </> : null}
            </Card>
          );
        }) : (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState
              icon={<UserRound size={28} />}
              title="No mentors found yet"
              description="Mentors will appear here based on your profile and match data. Make sure your profile is complete."
            />
          </div>
        )}
      </Stagger>
      </>
      )}
    </PageTransition>
  );
}
