"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle, FileText, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/Common";
import { PageTransition } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  reporterId: string;
  reportedUserId: string | null;
  createdAt: string;
};

const statusFilters = ["All", "Pending", "Resolved", "Dismissed"] as const;
type StatusFilter = (typeof statusFilters)[number];

export function Moderation() {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("Pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ["moderation-reports"], queryFn: () => apiGet<Report[]>("/api/reports") });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => apiSend(`/api/reports/${id}`, "PATCH", { status }),
    onSuccess: () => { toast("Report updated", "success"); void queryClient.invalidateQueries({ queryKey: ["moderation-reports"] }); },
    onError: () => toast("Could not update report.", "error"),
  });
  const ban = useMutation({
    mutationFn: (userId: string) => apiSend(`/api/users/${userId}`, "PATCH", { is_banned: true }),
    onSuccess: () => { toast("User banned", "success"); void queryClient.invalidateQueries({ queryKey: ["moderation-reports"] }); },
    onError: () => toast("Could not ban user.", "error"),
  });

  const filtered = activeStatus === "All"
    ? (reports.data ?? [])
    : (reports.data ?? []).filter((r) => r.status.toLowerCase() === activeStatus.toLowerCase());

  if (reports.isLoading) return <div className="skeleton" />;
  if (reports.error) return <ErrorState onRetry={() => void reports.refetch()} title="Moderation queue did not load" message="Only designated administrators can review member reports." />;

  return (
    <PageTransition className="grid">
      <div className="screen-title">
        <div>
          <h1>Moderation queue</h1>
          <p className="muted">Review safety reports with care and document every decision.</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="discover-tabs">
        {statusFilters.map((status) => (
          <button
            key={status}
            className={`discover-tab ${activeStatus === status ? "discover-tab--active" : ""}`}
            onClick={() => setActiveStatus(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Shield size={28} />}
          title="Queue is clear"
          description={activeStatus === "Pending" ? "No pending reports to review." : `No ${activeStatus.toLowerCase()} reports.`}
        />
      ) : (
        filtered.map((report) => (
          <Card key={report.id} padding="md">
            <div className="flex-between mb-sm">
              <div className="row" style={{ gap: 8 }}>
                <strong>{report.reason}</strong>
                <span className={`pill`} style={{
                  background: report.status === "resolved" ? "var(--color-success-light)" : report.status === "dismissed" ? "var(--color-bg-hover)" : "var(--color-accent-light)",
                  color: report.status === "resolved" ? "var(--color-success)" : report.status === "dismissed" ? "var(--color-text-muted)" : "var(--color-accent)",
                }}>
                  {report.status}
                </span>
              </div>
              <span className="muted text-12">{new Date(report.createdAt).toLocaleDateString()}</span>
            </div>

            {report.reportedUserId && (
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <FileText size={13} className="muted" />
                <span className="muted text-13">Reported user: <code style={{ fontSize: 12 }}>{report.reportedUserId.slice(0, 8)}...</code></span>
              </div>
            )}

            <div className="muted text-13" style={{ padding: "8px 10px", background: "var(--color-bg-dark)", borderRadius: 8, marginBottom: 8 }}>
              {report.details || "No additional details supplied."}
            </div>

            {report.status === "pending" && (
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => review.mutate({ id: report.id, status: "resolved" })}>
                  Resolve
                </Button>
                <Button variant="ghost" size="sm" icon={<XCircle size={13} />} onClick={() => review.mutate({ id: report.id, status: "dismissed" })}>
                  Dismiss
                </Button>
                {report.reportedUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Ban size={13} />}
                    disabled={ban.isPending}
                    onClick={() => { if (confirm(`Ban user ${report.reportedUserId!.slice(0, 8)}...?`)) ban.mutate(report.reportedUserId!); }}
                    style={{ marginLeft: "auto", color: "var(--color-danger)" }}
                  >
                    Ban user
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </PageTransition>
  );
}
