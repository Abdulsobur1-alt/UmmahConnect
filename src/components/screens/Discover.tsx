"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Globe, Users, CalendarDays, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/Common";
import { PageTransition, Stagger } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import type { Community, EventListing, Job, User } from "@/types";

export function Discover() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const communities = useQuery({ queryKey: ["communities"], queryFn: () => apiGet<Community[]>("/api/communities") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const users = useQuery({ queryKey: ["suggested-users"], queryFn: () => apiGet<User[]>("/api/users/suggestions") });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => apiGet<Job[]>("/api/jobs") });
  const events = useQuery({ queryKey: ["events"], queryFn: () => apiGet<EventListing[]>("/api/events") });
  const connect = useMutation({
    mutationFn: (receiver_id: string) => apiSend("/api/connections", "POST", { receiver_id }),
    onSuccess: () => {
      toast("Connection request sent", "success");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast("Connection request could not be sent.", "error");
    },
  });
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const joinCommunity = useMutation({
    mutationFn: (communityId: string) => apiSend(`/api/communities/${communityId}/join`, "POST"),
    onSuccess: (_, communityId) => {
      setJoinedCommunities((previous) => new Set(previous).add(communityId));
      toast("Joined community", "success");
      void queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (error: Error, communityId) => {
      if (error.message === "already_member") {
        setJoinedCommunities((previous) => new Set(previous).add(communityId));
        return;
      }
      toast("Could not join this community. Please try again.", "error");
    },
  });

  // Shared styles to avoid repetition
  const sectionTitle = { fontSize: 18, fontWeight: 700, margin: "0 0 12px" };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCommunities = useMemo(() => {
    const list = communities.data ?? [];
    if (!normalizedSearch) return list;
    return list.filter((community) =>
      [community.name, community.description].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [communities.data, normalizedSearch]);

  const suggestedUsers = useMemo(() => {
    return (users.data ?? []).filter(
      (user) => user.id !== me.data?.id && user.industry && user.industry !== "Other" && user.industry !== ""
    );
  }, [me.data?.id, users.data]);

  const halalJobs = (jobs.data ?? []).slice(0, 3);
  const upcomingEvents = (events.data ?? []).slice(0, 2);

  if (communities.isLoading) return <div className="skeleton" />;
  if (communities.error) return <ErrorState onRetry={() => void communities.refetch()} title="Discover did not load" />;

  return (
    <PageTransition>
      <Stagger as="div" className="discover-grid">
      {/* SECTION 1 — Search bar */}
      <Input
        icon={<Search size={16} />}
        placeholder="Search professionals, communities, topics..."
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        className="search-input"
      />

      {/* SECTION 2 — People you may know */}
      <section>
        <h2 className="section-title">People you may know</h2>
        {suggestedUsers.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="No suggestions yet"
            description="Complete your profile to get personalized connection recommendations."
            variant="compact"
          />
        ) : (
          <div className="discover-scroll">
            {suggestedUsers.slice(0, 8).map((user) => (
              <Card
                key={user.id}
                variant="interactive"
                padding="md"
                className="user-card"
              >
                <div className="avatar-center">
                  <Avatar name={user.full_name} size={52} />
                </div>
                <strong className="user-name"
                >
                  {user.full_name}
                </strong>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    margin: "2px 0 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.industry}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "2px 0 8px" }}>{user.city}</p>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<UserPlus size={14} />}
                  disabled={connect.isPending}
                  onClick={() => connect.mutate(user.id)}
                >
                  Connect
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3 — Communities for you */}
      <section>
        <h2 style={sectionTitle}>Communities for you</h2>
        {connect.error ? (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
            Connection request could not be sent.
          </p>
        ) : null}
        {(search ? filteredCommunities : communities.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Globe size={24} />}
            title="No communities found"
            description={search ? "Try a different search term." : "No communities match your profile yet."}
            variant="compact"
          />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {(search ? filteredCommunities : communities.data ?? []).slice(0, 6).map((community) => {
              const isJoined = joinedCommunities.has(community.id) || community.is_joined;
              return (
                <div
                  key={community.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-line-light)",
                  }}
                >
                  <Avatar name={community.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 15 }}>{community.name}</strong>
                    {community.description && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-muted)",
                          margin: "2px 0 0",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {community.description}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                      {community.member_count.toLocaleString()} members
                    </p>
                  </div>
                  <Button
                    variant={isJoined ? "primary" : "outline"}
                    size="sm"
                    disabled={Boolean(isJoined) || joinCommunity.isPending}
                    onClick={() => joinCommunity.mutate(community.id)}
                  >
                    {isJoined ? "Joined" : joinCommunity.isPending ? "Joining..." : "Join"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4 — Halal Job Picks */}
      {halalJobs.length > 0 && (
        <section>
          <h2 style={sectionTitle}>Halal Job Picks</h2>
          <Stagger as="div" style={{ display: "grid", gap: 8 }}>
            {halalJobs.map((job) => (
              <Card key={job.id} padding="md" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{job.title}</strong>
                    <span className="halal-badge">✓ HALAL</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                    {job.company} · {job.location}
                    {job.is_remote ? " · Remote" : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View &rarr;
                </Button>
              </Card>
            ))}
          </Stagger>
        </section>
      )}

      {/* SECTION 5 — Upcoming Islamic Events */}
      {upcomingEvents.length > 0 && (
        <section>
          <h2 style={sectionTitle}>Upcoming Islamic Events</h2>
          <Stagger as="div" style={{ display: "grid", gap: 8 }}>
            {upcomingEvents.map((event) => (
              <Card variant="sponsored" key={event.id} padding="md">
                <span className="sponsored-label">
                  <CalendarDays size={12} /> Sponsored
                </span>
                <h3 style={{ margin: "6px 0 2px", fontSize: 15, fontWeight: 700 }}>{event.title}</h3>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                  {event.event_date} · {event.location_detail}
                </p>
              </Card>
            ))}
          </Stagger>
        </section>
      )}

      {/* Empty state for no search results */}
      {search &&
        filteredCommunities.length === 0 &&
        suggestedUsers.filter((u) =>
          [u.full_name, u.industry, u.city].some((v) => v.toLowerCase().includes(normalizedSearch)),
        ).length === 0 && (
          <EmptyState
            icon={<Search size={28} />}
            title="No results found"
            description="Try a different search term."
          />
        )}
    </Stagger>
    </PageTransition>
  );
}
