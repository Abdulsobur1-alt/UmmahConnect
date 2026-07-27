"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiGet, apiSend } from "@/lib/api/client";

type Report = { id: string; reason: string; details: string | null; status: string; createdAt: string };

export function Moderation() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ["moderation-reports"], queryFn: () => apiGet<Report[]>("/api/reports") });
  const review = useMutation({ mutationFn: ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => apiSend(`/api/reports/${id}`, "PATCH", { status }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["moderation-reports"] }) });
  if (reports.isLoading) return <div className="skeleton" />;
  if (reports.error) return <Card padding="lg"><h1>Moderation access required</h1><p className="muted">Only designated administrators can review member reports.</p></Card>;
  return <div className="grid"><div className="screen-title"><div><h1>Moderation queue</h1><p className="muted">Review safety reports with care and document every decision.</p></div></div>{reports.data?.length ? reports.data.map((report) => <Card key={report.id} padding="md"><div className="flex-between"><strong>{report.reason}</strong><span className="pill">{report.status}</span></div><p className="muted">{report.details || "No additional details supplied."}</p>{report.status === "pending" ? <div className="row" style={{ gap: 8 }}><Button size="sm" onClick={() => review.mutate({ id: report.id, status: "resolved" })}>Resolve</Button><Button variant="ghost" size="sm" onClick={() => review.mutate({ id: report.id, status: "dismissed" })}>Dismiss</Button></div> : null}</Card>) : <Card padding="lg">No reports in the queue.</Card>}</div>;
}
