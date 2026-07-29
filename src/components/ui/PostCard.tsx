"use client";

import { Heart, MessageCircle, MoreHorizontal, Repeat2, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
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

type CommentData = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: { id: string; full_name: string; avatar_url: string | null } | null;
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
  currentUserId,
  index = 0,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const deletePost = useMutation({
    mutationFn: () => apiSend(`/api/posts/${post.id}`, "DELETE"),
    onSuccess: () => {
      toast("Post deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      setMenuOpen(false);
    },
    onError: () => toast("Could not delete this post.", "error"),
  });

  // Auto-resize comment textarea as the user types
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => apiGet<CommentData[]>(`/api/posts/${post.id}/comments`), enabled: commentsOpen });
  const addComment = useMutation({ mutationFn: () => apiSend(`/api/posts/${post.id}/comments`, "POST", { content: commentDraft }), onSuccess: () => {
    setCommentDraft("");
    // Reset textarea height after submission
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void comments.refetch();
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
  } });
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
            <div className="row" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {formatPostTime(post.created_at)}
              </span>
              {/* Post actions dropdown — only shown for the post author */}
              {currentUserId === post.user_id ? (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  className="btn-link post-more-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="More options"
                  style={{ padding: '4px 6px', borderRadius: 6, color: 'var(--color-text-muted)' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen ? (
                  <div
                    className="post-more-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      minWidth: 140,
                      padding: 6,
                      border: '1px solid var(--color-line)',
                      borderRadius: 10,
                      background: 'var(--color-bg-secondary)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      zIndex: 20,
                    }}
                  >
                    <button
                      className="dropdown-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 10px',
                        border: 0,
                        borderRadius: 6,
                        background: 'transparent',
                        color: 'var(--color-danger)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (confirm('Delete this post? This cannot be undone.')) {
                          deletePost.mutate();
                        }
                      }}
                      disabled={deletePost.isPending}
                    >
                      <Trash2 size={15} /> Delete post
                    </button>
                  </div>
                ) : null}
              </div>
              ) : null}
            </div>
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
      {commentsOpen ? (
        <div className="inline-comments">
          <div className="inline-comments-list">
            {comments.isLoading ? (
              <span className="muted text-13">Loading comments…</span>
            ) : (comments.data ?? []).length === 0 ? (
              <span className="muted text-13">Be the first to comment.</span>
            ) : (
              comments.data!.map((comment) => (
                <div key={comment.id} className="inline-comment">
                  <div className="inline-comment-avatar">
                    <Avatar name={comment.user?.full_name ?? "Member"} size={28} />
                  </div>
                  <div className="inline-comment-body">
                    <strong className="text-13">
                      {comment.user?.full_name ?? "Member"}
                    </strong>
                    <p className="inline-comment-text">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            className="inline-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (commentDraft.trim()) addComment.mutate();
            }}
          >
            <textarea
              ref={textareaRef}
              value={commentDraft}
              onChange={(event) => {
                setCommentDraft(event.currentTarget.value);
                autoResizeTextarea();
              }}
              maxLength={1000}
              placeholder="Add a thoughtful comment…"
              className="inline-comment-textarea"
              rows={2}
            />
            <Button size="sm" disabled={!commentDraft.trim() || addComment.isPending}>
              Reply
            </Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
