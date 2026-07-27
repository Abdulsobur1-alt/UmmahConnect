"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { trackMetric } from "@/lib/metrics";
import { formatMessageTime } from "@/lib/utils/time";
import type { Message, User } from "@/types";

export function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const users = useQuery({ queryKey: ["suggested-users"], queryFn: () => apiGet<User[]>("/api/users/suggestions") });
  const [activeUserId, setActiveUserId] = useState<string>("");
  const weekly = useQuery({ queryKey: ["weekly-count"], queryFn: () => apiGet<{ count: number; remaining: number }>("/api/messages/weekly-count") });
  const thread = useQuery({
    queryKey: ["messages", activeUserId],
    queryFn: () => apiGet<Message[]>(`/api/messages/${activeUserId}`),
    enabled: Boolean(activeUserId),
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const send = useMutation({
    mutationFn: (content: string) => apiSend<{ message: Message; weekly_count: number }>(`/api/messages/${activeUserId}`, "POST", { content }),
    onSuccess: () => {
      toast("Message sent", "success");
      trackMetric("message_sent");
      void queryClient.invalidateQueries({ queryKey: ["messages", activeUserId] });
      void queryClient.invalidateQueries({ queryKey: ["weekly-count"] });
    },
    onError: () => {
      toast("Message could not be sent.", "error");
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.data]);

  useEffect(() => {
    if (!activeUserId && users.data?.[0]) setActiveUserId(users.data[0].id);
  }, [activeUserId, users.data]);

  const active = useMemo(() => users.data?.find((user) => user.id === activeUserId), [activeUserId, users.data]);

  // Get the last message for each user to show a preview and timestamp
  const lastMessages = useMemo(() => {
    const map = new Map<string, Message>();
    (thread.data ?? []).forEach((msg) => {
      const otherId = msg.sender_id === me.data?.id ? msg.receiver_id : msg.sender_id;
      if (otherId) map.set(otherId, msg);
    });
    return map;
  }, [thread.data, me.data?.id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = String(new FormData(event.currentTarget).get("content") ?? "");
    if (content.trim()) send.mutate(content);
    event.currentTarget.reset();
  }

  if (users.isLoading) return <div className="skeleton" />;

  return (
    <PageTransition>
      <div className="screen-title mb-lg">
        <div>
          <h1>Messages</h1>
          <p className="muted">Private conversations</p>
        </div>
        <span className="pill">{weekly.data?.count ?? 0} of 10 used</span>
      </div>
      {send.error ? (
        <Card padding="sm" className="mb-md">
          <strong className="text-14">Message not sent.</strong>
          <p className="muted text-13" style={{ margin: "4px 0 0" }}>Weekly limits or network issues may be blocking this send.</p>
        </Card>
      ) : null}
      <div className="grid two-col" style={{ gap: 14 }}>
        {/* Conversation list */}
        <Card padding="none" className="flex-col" style={{ overflow: "hidden" }}>
          {(users.data ?? []).length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={24} />}
              title="No conversations"
              description="Start connecting with other professionals to begin messaging."
              variant="compact"
            />
          ) : (users.data ?? []).map((user) => {
            const isActive = user.id === activeUserId;
            const hasUnread = false; // Simplified - would come from actual data
            const lastMsg = lastMessages.get(user.id);
            return (
              <button
                key={user.id}
                onClick={() => setActiveUserId(user.id)}
                className={`conversation-btn ${isActive ? "conversation-btn--active" : ""}`}
              >
                <div className="avatar-wrap">
                  <Avatar name={user.full_name} size={40} />
                  {hasUnread && (
                    <span style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      border: "2px solid var(--color-bg-secondary)",
                    }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex-between">
                    <strong className="truncate text-15">
                      {user.full_name}
                      {hasUnread && (
                        <span style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          marginLeft: 6,
                          verticalAlign: "middle",
                        }} />
                      )}
                    </strong>
                    {lastMsg && (
                      <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0, marginLeft: 4 }}>
                        {formatMessageTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {lastMsg ? lastMsg.content.slice(0, 60) : user.industry}
                  </p>
                </div>
              </button>
            );
          })}
        </Card>

        {/* Active conversation thread */}
        <Card padding="md" className="flex-col" style={{ minHeight: 560 }}>
          {/* Header */}
          <div className="thread-header">
            <Avatar name={active?.full_name ?? "User"} size={36} />
            <div>
              <strong style={{ fontSize: 15 }}>{active?.full_name ?? "Select a conversation"}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {active?.industry} · {active?.city}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="thread-messages"
          >
            {(thread.data ?? []).length === 0 ? (
              <EmptyState
                icon={<MessageCircle size={24} />}
                title="No messages yet"
                description="Send a message to start the conversation."
                variant="compact"
              />
            ) : (
              (thread.data ?? []).map((message, idx) => {
                const mine = message.sender_id === me.data?.id;
                const prevMessage = idx > 0 ? (thread.data ?? [])[idx - 1] : null;
                const showDateHeader = prevMessage
                  ? new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString()
                  : false;
                return (
                  <div key={message.id} className="animate-fade-in-up">
                    <MessageBubble
                      content={message.content}
                      created_at={message.created_at}
                      isMine={mine}
                      showDateHeader={showDateHeader}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={submit}
            className="thread-input"
          >
            <Input
              name="content"
              placeholder="Write a message..."
              style={{ flex: 1 }}
            />
            <Button
              type="submit"
              disabled={send.isPending || !activeUserId}
              icon={<Send size={20} />}
              loading={send.isPending}
              aria-label="Send message"
              style={{ width: 48, height: 48, borderRadius: "50%", padding: 0, minHeight: 48 }}
            >
              <></>
            </Button>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}
