"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Users, MessageCircle, Briefcase, Sparkles, CreditCard, BellOff, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition, Stagger } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { formatPostTime } from "@/lib/utils/time";
import type { Notification, User } from "@/types";

const iconByType: Record<string, typeof Bell> = {
  connection_request: Users,
  connection_accepted: Users,
  message_received: MessageCircle,
  mentorship_request: Sparkles,
  mentorship_accepted: Sparkles,
  job_match: Briefcase,
  event_sponsored: Bell,
  post_liked: Bell,
  comment_received: MessageCircle,
  payment_failed: CreditCard,
};

const labelByType: Record<string, string> = {
  connection_request: "Connection request",
  connection_accepted: "Connection accepted",
  message_received: "New message",
  mentorship_request: "Mentorship request",
  mentorship_accepted: "Mentorship accepted",
  job_match: "Job match",
  event_sponsored: "Sponsored event",
  post_liked: "Post liked",
  comment_received: "New comment",
  payment_failed: "Payment update",
};

function groupNotifications(items: Notification[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  
  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const item of items) {
    const date = new Date(item.created_at);
    if (Number.isNaN(date.getTime())) {
      groups[3].items.push(item);
      continue;
    }
    const dateStr = date.toDateString();
    if (dateStr === today) groups[0].items.push(item);
    else if (dateStr === yesterday) groups[1].items.push(item);
    else if (Date.now() - date.getTime() < 7 * 86400000) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function Notifications() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => apiGet<Notification[]>("/api/notifications") });
  const markAll = useMutation({
    mutationFn: () => apiSend("/api/notifications/read", "POST"),
    onSuccess: () => {
      toast("All marked as read", "success");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast("Could not mark notifications as read. Try again.", "error"),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => apiSend(`/api/notifications/${id}/read`, "POST"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast("Could not mark this notification as read. Try again.", "error"),
  });
  const removeOne = useMutation({
    mutationFn: (id: string) => apiSend(`/api/notifications/${id}`, "DELETE"),
    onSuccess: () => {
      toast("Notification deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast("Could not delete this notification. Try again.", "error"),
  });
  const acceptConnection = useMutation({
    mutationFn: (input: { connectionId: string; notificationId: string }) => apiSend(`/api/connections/${input.connectionId}`, "PATCH", { status: "accepted" }),
    onSuccess: async (_, input) => {
      toast("Connection accepted", "success");
      await apiSend(`/api/notifications/${input.notificationId}/read`, "POST");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["message-conversations"] });
    },
    onError: () => {
      toast("Could not accept connection.", "error");
    },
  });
  const declineConnection = useMutation({
    mutationFn: (input: { connectionId: string; notificationId: string }) => apiSend(`/api/connections/${input.connectionId}`, "PATCH", { status: "declined" }),
    onSuccess: async (_, input) => {
      toast("Connection request declined", "success");
      await apiSend(`/api/notifications/${input.notificationId}/read`, "POST");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast("Could not decline connection request.", "error"),
  });

  const grouped = useMemo(() => groupNotifications(notifications.data ?? []), [notifications.data]);

  function viewNotification(notification: Notification) {
    if (!notification.is_read) markOne.mutate(notification.id);
    if (notification.type === "job_match") router.push("/jobs");
    else if (notification.type === "event_sponsored") router.push("/announcements");
    else if (notification.type === "post_liked" || notification.type === "comment_received") router.push(notification.reference_id ? `/posts/${notification.reference_id}` : "/feed");
    else if (notification.type === "message_received" || notification.type === "connection_accepted") router.push("/messages");
  }

  if (notifications.isLoading) return <div className="skeleton" />;
  if (notifications.error) return (
    <Card padding="lg">
      <strong>Notifications did not load</strong>
      <Button variant="primary" style={{ marginTop: 12 }} onClick={() => void notifications.refetch()}>Retry</Button>
    </Card>
  );

  return (
    <PageTransition>
      <div className="screen-title notifications-header">
        <div><h1>Notifications</h1><p className="muted">Connection, message, mentorship, job, and sponsored event updates.</p></div>
        <Button variant="primary" icon={<CheckCheck size={17} />} onClick={() => markAll.mutate()}>Mark all as read</Button>
      </div>
      {acceptConnection.error ? (
        <Card padding="sm" className="mb-md">
          <strong>Connection was not accepted.</strong>
          <p className="muted text-13" style={{ margin: "4px 0 0" }}>This notification may point to an older request.</p>
        </Card>
      ) : null}
      
      {grouped.length === 0 ? (
        <EmptyState
          icon={<BellOff size={28} />}
          title="All caught up!"
          description="No notifications yet. We'll let you know when something new arrives."
        />
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="mb-lg">
            <h3 className="notif-group-label">
              {group.label}
            </h3>
            <Stagger as="div" className="grid" style={{ gap: 8 }}>
              {group.items.map((notification) => {
                const IconComponent = iconByType[notification.type] || Bell;
                const typeLabel = labelByType[notification.type] ?? notification.type.replaceAll("_", " ");
                return (                    <Card
                    key={notification.id}
                    padding="md"
                    className={`row notification-card${notification.is_read ? "" : " notification-card--unread"}`}
                    style={{
                      borderColor: notification.is_read ? "var(--color-line)" : "rgba(94, 205, 181, 0.45)",
                    }}
                    onClick={() => viewNotification(notification)}
                  >
                    <div
                      className="notif-icon"
                      style={{
                        background: notification.is_read ? "var(--color-bg-hover)" : "var(--color-primary-light)",
                        color: notification.is_read ? "var(--color-text-muted)" : "var(--color-primary)",
                      }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div className="flex-1">
                      <strong className="notif-item-title">
                        {notification.content}
                      </strong>
                      <p className="notif-item-meta">
                        {typeLabel} · {formatPostTime(notification.created_at) || "Recently"}
                      </p>
                    </div>
                    <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                      {!notification.is_read && (
                        <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>New</span>
                      )}
                      {notification.type === "connection_request" && notification.reference_id ? (
                        <Button
                          variant="accent"
                          size="sm"
                          disabled={acceptConnection.isPending}
                          onClick={(event) => { event.stopPropagation(); acceptConnection.mutate({ connectionId: notification.reference_id!, notificationId: notification.id }); }}
                        >
                          Accept
                        </Button>
                      ) : null}
                      {notification.type === "connection_request" && notification.reference_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={declineConnection.isPending}
                          onClick={(event) => { event.stopPropagation(); declineConnection.mutate({ connectionId: notification.reference_id!, notificationId: notification.id }); }}
                        >
                          Decline
                        </Button>
                      ) : null}
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={markOne.isPending}
                          onClick={(event) => { event.stopPropagation(); markOne.mutate(notification.id); }}
                        >
                          Read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removeOne.isPending}
                        icon={<Trash2 size={15} />}
                        aria-label="Delete notification"
                        onClick={(event) => { event.stopPropagation(); removeOne.mutate(notification.id); }}
                      ><></></Button>
                    </div>
                  </Card>
                );
              })}
            </Stagger>
          </div>
        ))
      )}
    </PageTransition>
  );
}
