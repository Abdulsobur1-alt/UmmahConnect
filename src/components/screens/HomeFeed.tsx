"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, CheckCircle, Send, Star, Sunrise,
  MessageSquare, Sparkles, X,
} from "lucide-react";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PostCard } from "@/components/ui/PostCard";
import { Tag } from "@/components/ui/Common";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { trackMetric } from "@/lib/metrics";
import type { Community, EventListing, Post, User } from "@/types";

type Prayer = { name: string; time: string; minutes_until: number };

function LoadingFeed() {
  return (
    <div className="grid stagger-children">
      <div className="skeleton" style={{ minHeight: 120 }} />
      <div className="skeleton" style={{ minHeight: 160 }} />
      <div className="skeleton" style={{ minHeight: 100 }} />
    </div>
  );
}

/* Live countdown hook for prayer times */
function useCountdown(prayerData: Prayer | undefined) {
  const [display, setDisplay] = useState((prayerData?.minutes_until ?? 0) * 60);

  useEffect(() => {
    if (!prayerData || !prayerData.time) {
      setDisplay(0);
      return;
    }

    const prayerTime = prayerData.time;

    function calc() {
      const now = new Date();
      const watNow = new Date(now.getTime() + 60 * 60 * 1000);
      const clean = prayerTime.split(" ")[0];
      const [h, m] = clean.split(":").map(Number);
      const targetSeconds = (h * 60 + m) * 60;
      const currentSeconds =
        watNow.getUTCHours() * 60 * 60 + watNow.getUTCMinutes() * 60 + watNow.getUTCSeconds();
      setDisplay(
        targetSeconds >= currentSeconds
          ? targetSeconds - currentSeconds
          : 24 * 60 * 60 - currentSeconds + targetSeconds,
      );
    }

    calc();
    const interval = setInterval(calc, 1_000);
    return () => clearInterval(interval);
  }, [prayerData]);

  return display;
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? `${hours}h ` : ""}${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function PaymentCelebration() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setVisible(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      router.replace(url.pathname + url.search);
    } else if (payment === "failed") {
      toast("Payment did not complete. You can try again from Settings.", "error");
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      router.replace(url.pathname + url.search);
      setVisible(false);
    } else {
      setVisible(false);
    }
  }, [searchParams, router, toast]);

  if (!visible) return null;

  return (
    <div className="payment-celebration animate-scale-in">
      <button className="payment-celebration-close" onClick={() => setVisible(false)} aria-label="Dismiss">
        <X size={14} />
      </button>
      <CheckCircle size={24} className="payment-celebration-icon" />
      <div>
        <strong className="payment-celebration-title">Payment successful! 🎉</strong>
        <p className="payment-celebration-text">
          Welcome to Pro! You now have unlimited messaging, job posting, mentorship matching, and more.
        </p>
      </div>
    </div>
  );
}

export function HomeFeed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => apiGet<Post[]>("/api/posts") });
  const communities = useQuery({ queryKey: ["communities"], queryFn: () => apiGet<Community[]>("/api/communities") });
  const events = useQuery({ queryKey: ["events"], queryFn: () => apiGet<EventListing[]>("/api/events") });
  const prayer = useQuery({ queryKey: ["prayer-times"], queryFn: () => apiGet<Prayer>("/api/prayer-times") });
  const prayerMinutesUntil = useCountdown(prayer.data);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [animatingLike, setAnimatingLike] = useState<string | null>(null);
  const createPost = useMutation({
    mutationFn: (content: string) => apiSend<Post>("/api/posts", "POST", { content }),
    onSuccess: () => {
      toast("Post shared with your community", "success");
      trackMetric("post_created");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      toast("Post could not be shared.", "error");
    },
  });
  const toggleLike = useMutation({
    mutationFn: (postId: string) => apiSend<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`, "POST"),
    onSuccess: (data, postId) => {
      setAnimatingLike(postId);
      setTimeout(() => setAnimatingLike(null), 300);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    },
  });
  const repost = useMutation({
    mutationFn: (postId: string) => apiSend<{ reposted: boolean }>(`/api/posts/${postId}/repost`, "POST"),
    onSuccess: (data) => { toast(data.reposted ? "Post reposted" : "Repost removed", "success"); void queryClient.invalidateQueries({ queryKey: ["posts"] }); },
    onError: () => toast("Could not repost this update.", "error"),
  });

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("content") ?? "");
    if (content.trim()) createPost.mutate(content);
    event.currentTarget.reset();
    if (composeRef.current) composeRef.current.style.height = "auto";
  }

  const currentUser = me.data;
  const event = events.data?.[0];
  const greeting = currentUser ? `Assalamu Alaikum, ${currentUser.full_name.split(" ")[0]} 👋` : "Assalamu Alaikum 👋";

  function toggleExpand(postId: string) {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Payment success celebration (wrapped in Suspense for useSearchParams) */}
      <Suspense fallback={null}>
        <PaymentCelebration />
      </Suspense>

      {/* Feed header */}
      <div className="mb-lg">
        <div className="animate-fade-in text-16 text-muted-color mb-sm">
          {greeting}
        </div>
        {/* Prayer time strip */}
        <div className="card hover-lift prayer-strip mb-md">
          <Sunrise size={16} color="var(--color-success)" />
          <span className="text-13" style={{ color: "rgba(255,255,255,0.8)" }}>
            {prayer.data
              ? `Next prayer: ${prayer.data.name} · ${prayer.data.time} · in ${formatCountdown(prayerMinutesUntil)}`
              : "🌙 Maghrib · 7:42 PM · in 34 min"}
          </span>
        </div>

        {/* Compose box */}
        <form className="card transition-normal compose-card" onSubmit={submitPost}
          onFocusCapture={(e) => {
            const card = e.currentTarget;
            card.style.borderColor = "rgba(26,107,92,0.4)";
            card.style.boxShadow = "0 0 0 3px rgba(26,107,92,0.1)";
          }}
          onBlurCapture={(e) => {
            const card = e.currentTarget;
            card.style.borderColor = "rgba(255,255,255,0.06)";
            card.style.boxShadow = "none";
          }}
        >
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Avatar name={currentUser?.full_name ?? "User"} size={36} />
            <textarea
              ref={composeRef}
              className="textarea transition-normal"
              name="content"
              placeholder="Share something with your community..."
              rows={2}
              style={{
                resize: "none",
                minHeight: 44,
                fontSize: 14,
                padding: "10px 14px",
                transition: "min-height 0.2s ease",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 200) + "px";
              }}
              onFocus={(e) => { e.currentTarget.style.minHeight = "72px"; }}
              onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.style.minHeight = "44px"; }}
            />
          </div>
          <div className="flex-between mt-md">
            <span className="compose-supporting-text">Share an update with your community</span>
            <Button
              type="submit"
              disabled={createPost.isPending}
              loading={createPost.isPending}
              icon={<Send size={14} />}
              className="post-submit-btn"
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>

      {/* Feed grid */}
      <div className="grid two-col" style={{ gap: 16 }}>
        <section className="grid stagger-children">
          {/* Error state */}
          {posts.error ? (
            <Card padding="xl" style={{ textAlign: "center" }}>
              <div className="text-14" style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <strong style={{ fontSize: 18 }}>Couldn&apos;t load your feed</strong>
              <p className="muted" style={{ margin: "6px 0 16px" }}>Check your connection and try again.</p>
              <Button variant="accent" size="sm" onClick={() => void posts.refetch()}>Retry</Button>
            </Card>
          ) : posts.isLoading ? (
            <LoadingFeed />
          ) : (posts.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Sparkles size={28} />}
              title="No posts yet"
              description="Be the first to share something meaningful with your community."
            />
          ) : (
            (posts.data ?? []).map((post, index) => {
              const isExpanded = expandedPosts.has(post.id);
              const isLiked = likedPosts.has(post.id);
              const isAnimatingLike = animatingLike === post.id;

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  isExpanded={isExpanded}
                  isLiked={isLiked}
                  isAnimatingLike={isAnimatingLike}
                  onToggleExpand={toggleExpand}
                  onLike={(postId) => toggleLike.mutate(postId)}
                  onRepost={(postId) => repost.mutate(postId)}
                  index={index}
                />
              );
            })
          )}
        </section>

        {/* Sidebar */}
        <aside className="grid stagger-children" style={{ gap: 12, alignContent: "start" }}>
          {/* Sponsored event */}
          {event ? (
            <article className="sponsored-card hover-lift transition-normal p-sm">
              <div className="flex-between">
                <span className="sponsored-label-small">
                  <Star size={12} /> Sponsored
                </span>
                <CalendarDays size={14} color="var(--color-accent)" />
              </div>
              <h3 className="text-15 text-bold" style={{ margin: "8px 0 4px" }}>{event.title}</h3>
              <p className="muted text-13" style={{ margin: 0 }}>
                {event.event_date} · {event.location_detail}
              </p>
              <button
                className="btn btn-accent transition-fast hover-lift mt-sm"
                style={{ fontSize: 13, minHeight: 36, padding: "0 14px" }}
                onClick={() => void apiSend(`/api/events/${event.id}/click`, "POST")}
              >
                Register interest
              </button>
            </article>
          ) : null}

          {/* Community quick-links */}
          {(communities.data ?? []).length > 0 ? (
            <article className="card transition-normal p-sm">
              <strong className="text-14" style={{ marginBottom: 10, display: "block" }}>Community quick-links</strong>
              <div className="community-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 6, paddingBottom: 4 }}>
                {(communities.data ?? []).slice(0, 6).map((community) => (
                  <Tag key={community.id} className="transition-fast hover-lift cursor-pointer">{community.name}</Tag>
                ))}
              </div>
            </article>
          ) : null}

          <article className="card transition-normal p-sm">
            <div className="row">
              <MessageSquare size={15} color="var(--color-text-muted)" />
              <strong className="text-13">Private messaging</strong>
            </div>
            <p className="muted text-12" style={{ margin: "4px 0 0" }}>
              Messages open after a connection is accepted.
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}
