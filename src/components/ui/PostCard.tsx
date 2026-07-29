"use client";

import { Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatPostTime } from "@/lib/utils/time";
import { apiGet, apiSend } from "@/lib/api/client";
import type { Post } from "@/types";

type PostCardProps = {
  post: Post;
  isExpanded: boolean;
  isLiked: boolean;
  isAnimatingLike: boolean;
  onToggleExpand: (postId: string) => void;
  onLike: (postId: string) => void;
  onRepost?: (postId: string) => void;
  currentUserId?: string;
  index?: number;
};

/**
 * PostCard — a reusable post card component for feed and profile timelines.
 */
export function PostCard({
  post,
  isExpanded,
  isLiked,
  isAnimatingLike,
  onToggleExpand,
  onLike,
  onRepost,
  index = 0,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const queryClient = useQueryClient();
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => apiGet<any[]>(`/api/posts/${post.id}/comments`), enabled: commentsOpen });
  const addComment = useMutation({ mutationFn: () => apiSend(`/api/posts/${post.id}/comments`, "POST", { content: commentDraft }), onSuccess: () => { setCommentDraft(""); void comments.refetch(); void queryClient.invalidateQueries({ queryKey: ["posts"] }); } });
  const contentLong = post.content.length > 200;
  const displayContent = isExpanded || !contentLong ? post.content : post.content.slice(0, 200) + "...";

  return (
    <Card
      variant="interactive"
      padding="md"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Header */}
      <div className="row" style={{ alignItems: "flex-start" }}>
        <Link href={`/profiles/${post.user_id}`} aria-label={`View ${post.user?.full_name ?? "member"} profile`}><Avatar name={post.user?.full_name ?? "User"} size={42} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-between">
            <div>
              <Link href={`/profiles/${post.user_id}`} className="post-author-link"><strong style={{ fontSize: 15 }}>{post.user?.full_name ?? "Unknown"}</strong></Link>
              <div className="muted" style={{ fontSize: 13 }}>
                {[post.user?.industry, post.user?.city].filter(Boolean).join(" · ") || ""}
              </div>
            </div>
            <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", marginLeft: 8 }}>
              {formatPostTime(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginTop: 10 }}>
        <p className="post-content" style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: "rgba(255,255,255,0.9)" }}>
          {displayContent}
        </p>
        {contentLong && (
          <button
            className="btn-link transition-fast"
            style={{ fontSize: 13, marginTop: 4, color: "var(--color-text-muted)" }}
            onClick={() => onToggleExpand(post.id)}
          >
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="post-actions">
        <Button
          variant="ghost"
          size="sm"
          className="post-action-btn"
          onClick={() => onLike(post.id)}
          style={{
            color: isLiked ? "#f87171" : "inherit",
          }}
        >
          <Heart
            size={16}
            style={{
              transition: "transform 0.15s ease",
              transform: isAnimatingLike ? "scale(1.3)" : "scale(1)",
            }}
            fill={isLiked ? "#f87171" : "none"}
          />{" "}
          {post.likes_count}
        </Button>
        <Button variant="ghost" size="sm" className="post-action-btn" onClick={() => setCommentsOpen((value) => !value)}>
          <MessageCircle size={16} /> {post.comments_count}
        </Button>
        <Button variant="ghost" size="sm" className="post-action-btn" onClick={() => onRepost?.(post.id)}>
          <Repeat2 size={16} /> {post.reposts_count ?? 0}
        </Button>
        <Button variant="ghost" size="sm" className="post-action-btn" style={{ marginLeft: "auto" }} onClick={() => { const url = `${window.location.origin}/posts/${post.id}`; if (navigator.share) void navigator.share({ title: "Ummah Connect", text: post.content, url }); else void navigator.clipboard.writeText(url); }}>
          <Share2 size={16} /> Share
        </Button>
      </div>
      {commentsOpen ? <div className="inline-comments"><div className="inline-comments-list">{comments.isLoading ? <span className="muted text-13">Loading comments…</span> : (comments.data ?? []).length === 0 ? <span className="muted text-13">Be the first to comment.</span> : comments.data!.map((comment) => <div key={comment.id} className="inline-comment"><strong>Member</strong><span>{comment.content}</span></div>)}</div><form className="inline-comment-form" onSubmit={(event) => { event.preventDefault(); if (commentDraft.trim()) addComment.mutate(); }}><input value={commentDraft} onChange={(event) => setCommentDraft(event.currentTarget.value)} maxLength={1000} placeholder="Add a thoughtful comment…"/><Button size="sm" disabled={!commentDraft.trim() || addComment.isPending}>Reply</Button></form></div> : null}
    </Card>
  );
}
