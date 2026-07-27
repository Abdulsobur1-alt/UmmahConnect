"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Users, MessageCircle, Briefcase, Sparkles, CreditCard, BellOff } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition, Stagger } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { formatPostTime } from "@/lib/utils/time";
import type { Notification, User } from "@/types";

const iconByType: Record<string, typeof Bell> = {
  connection: Users,
  message: MessageCircle,
  job: Briefcase,
  mentor: Sparkles,
  mentorship: Sparkles,
  payment: CreditCard,
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
    const dateStr = new Date(item.created_at).toDateString();
    if (dateStr === today) groups[0].items.push(item);
    else if (dateStr === yesterday) groups[1].items.push(item);
    else if (Date.now() - new Date(item.created_at).getTime() < 7 * 86400000) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => apiGet<Notification[]>("/api/notifications") });
  const markAll = useMutation({
    mutationFn: () => apiSend("/api/notifications/read", "POST"),
    onSuccess: () => {
      toast("All marked as read", "success");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const markOne = useMutation({ mutationFn: (id: string) => apiSend(`/api/notifications/${id}/read`, "POST"), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const acceptConnection = useMutation({
    mutationFn: (input: { connectionId: string; notificationId: string }) => apiSend(`/api/connections/${input.connectionId}`, "PATCH", { status: "accepted" }),
    onSuccess: (_, input) => {
      toast("Connection accepted", "success");
      void markOne.mutate(input.notificationId);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast("Could not accept connection.", "error");
    },
  });

  const grouped = useMemo(() => groupNotifications(notifications.data ?? []), [notifications.data]);

  if (notifications.isLoading) return <div className="skeleton" />;
  if (notifications.error) return (
    <Card padding="lg">
      <strong>Notifications did not load</strong>
      <Button variant="primary" style={{ marginTop: 12 }} onClick={() => void notifications.refetch()}>Retry</Button>
    </Card>
  );

  return (
    <PageTransition>
      <div className="screen-title">
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
                return (                    <Card
                    key={notification.id}
                    padding="md"
                    className="row"
                    style={{
                      borderColor: notification.is_read ? "var(--color-line)" : "var(--color-accent)",
                    }}
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
                        {notification.type} · {formatPostTime(notification.created_at)}
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
                          onClick={() => acceptConnection.mutate({ connectionId: notification.reference_id!, notificationId: notification.id })}
                        >
                          Accept
                        </Button>
                      ) : null}
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markOne.mutate(notification.id)}
                        >
                          Read
                        </Button>
                      )}
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
