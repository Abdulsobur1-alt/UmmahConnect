"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, MessageCircle, Palette, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { trackMetric } from "@/lib/metrics";
import { isPremiumPlan } from "@/lib/plans";
import type { Message, User } from "@/types";

const messageThemes = ["emerald", "midnight", "gold"] as const;
type MessageTheme = (typeof messageThemes)[number];

function getMessageTheme(settings?: User["notification_settings"]): MessageTheme {
  const theme = settings?.message_theme;
  return typeof theme === "string" && messageThemes.includes(theme as MessageTheme)
    ? theme as MessageTheme
    : "emerald";
}

export function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const conversations = useQuery({ queryKey: ["message-conversations"], queryFn: () => apiGet<User[]>("/api/messages/conversations") });
  const [activeUserId, setActiveUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [messageTheme, setMessageTheme] = useState<MessageTheme>("emerald");
  const scrollRef = useRef<HTMLDivElement>(null);
  const thread = useQuery({
    queryKey: ["messages", activeUserId],
    queryFn: () => apiGet<Message[]>(`/api/messages/${activeUserId}`),
    enabled: Boolean(activeUserId),
  });
  const send = useMutation({
    mutationFn: (content: string) => apiSend<{ message: Message; weekly_count: number }>(`/api/messages/${activeUserId}`, "POST", { content }),
    onSuccess: () => {
      setDraft("");
      toast("Message sent", "success");
      trackMetric("message_sent");
      void queryClient.invalidateQueries({ queryKey: ["messages", activeUserId] });
    },
    onError: (error: Error) => toast(
      error.message === "connection_required"
        ? "Messages are available after the connection is accepted."
        : "Message could not be sent.",
      "error",
    ),
  });
  const saveTheme = useMutation({
    mutationFn: (theme: MessageTheme) => apiSend("/api/users/me", "PATCH", {
      notification_settings: { ...me.data?.notification_settings, message_theme: theme },
    }),
    onSuccess: (_data, theme) => {
      setMessageTheme(theme);
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast("Chat appearance could not be saved.", "error"),
  });

  useEffect(() => {
    if (!activeUserId && conversations.data?.[0]) setActiveUserId(conversations.data[0].id);
  }, [activeUserId, conversations.data]);
  useEffect(() => {
    if (me.data) setMessageTheme(getMessageTheme(me.data.notification_settings));
  }, [me.data]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.data]);

  const active = useMemo(
    () => conversations.data?.find((user) => user.id === activeUserId),
    [activeUserId, conversations.data],
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim()) send.mutate(draft.trim());
  }

  if (conversations.isLoading) return <div className="skeleton" />;

  return (
    <PageTransition>
      <div className="screen-title mb-lg">
        <div>
          <h1>Messages</h1>
          <p className="muted">Private conversations with your accepted connections.</p>
        </div>
        <span className="pill">Connection-only</span>
      </div>
      <div className="messages-layout" style={{ gap: 14 }}>
        <Card padding="none" className="flex-col message-inbox" style={{ overflow: "hidden" }}>
          <div className="message-inbox-header"><strong>Connections</strong><span>{conversations.data?.length ?? 0}</span></div>
          {(conversations.data ?? []).length === 0 ? (
            <EmptyState icon={<LockKeyhole size={24} />} title="No connected members yet" description="Send a connection request in Discover. Messaging becomes available once it is accepted." variant="compact" />
          ) : conversations.data!.map((user) => (
            <button key={user.id} onClick={() => setActiveUserId(user.id)} className={`conversation-btn ${user.id === activeUserId ? "conversation-btn--active" : ""}`}>
              <Avatar name={user.full_name} size={40} />
              <div className="flex-1">
                <strong className="truncate text-15">{user.full_name}</strong>
                <p className="conversation-subtitle">Connected · {user.industry || "Member"}</p>
              </div>
            </button>
          ))}
        </Card>

        <Card padding="md" className={`flex-col message-thread-panel message-theme--${messageTheme}`} style={{ minHeight: 560 }}>
          <div className="thread-header">
            <Avatar name={active?.full_name ?? "User"} size={36} />
            <div className="flex-1">
              <strong style={{ fontSize: 15 }}>{active?.full_name ?? "Choose a connection"}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {active ? `Connected · ${active.industry || "Member"}${active.city ? ` · ${active.city}` : ""}` : "Private conversations are connection-only"}
              </p>
            </div>
            {active ? <span className="pill message-connected-pill">Connected</span> : null}
          </div>

          {isPremiumPlan(me.data?.plan) ? (
            <div className="message-theme-picker" aria-label="Chat appearance">
              <Palette size={15} aria-hidden="true" />
              <span>Chat appearance</span>
              {messageThemes.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`message-theme-swatch message-theme-swatch--${theme} ${messageTheme === theme ? "is-active" : ""}`}
                  onClick={() => saveTheme.mutate(theme)}
                  disabled={saveTheme.isPending}
                  aria-label={`Use ${theme} chat theme`}
                  title={`${theme[0].toUpperCase()}${theme.slice(1)} theme`}
                />
              ))}
            </div>
          ) : null}

          <div ref={scrollRef} className="thread-messages">
            {!activeUserId ? (
              <EmptyState icon={<MessageCircle size={24} />} title="Choose a connection" description="Your private conversation will appear here." variant="compact" />
            ) : thread.isLoading ? <div className="skeleton" /> : (thread.data ?? []).length === 0 ? (
              <EmptyState icon={<MessageCircle size={24} />} title="Start the conversation" description="Send a thoughtful first message to your connection." variant="compact" />
            ) : (thread.data ?? []).map((message, index, list) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                created_at={message.created_at}
                isMine={message.sender_id === me.data?.id}
                isRead={message.is_read}
                showDateHeader={index > 0 && new Date(message.created_at).toDateString() !== new Date(list[index - 1].created_at).toDateString()}
              />
            ))}
          </div>

          <form onSubmit={submit} className="thread-input message-composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              maxLength={2000}
              disabled={!activeUserId || send.isPending}
              placeholder={activeUserId ? "Write a message…" : "Choose a connection to write a message"}
              aria-label="Message"
              className="message-composer-textarea"
              rows={1}
            />
            <Button type="submit" disabled={send.isPending || !activeUserId || !draft.trim()} icon={<Send size={20} />} loading={send.isPending} aria-label="Send message" style={{ width: 48, height: 48, borderRadius: "50%", padding: 0, minHeight: 48 }}><></></Button>
          </form>
          {activeUserId ? <div className="message-composer-meta">Private to accepted connections · {draft.length}/2000</div> : null}
        </Card>
      </div>
    </PageTransition>
  );
}
