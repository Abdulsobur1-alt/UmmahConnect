"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Search, Bookmark, ArrowRight, Home } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { HalalBadge } from "@/components/HalalBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ErrorState, IconBox, Tag } from "@/components/ui/Common";
import { PageTransition, Stagger } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { formatPostTime } from "@/lib/utils/time";
import { trackMetric } from "@/lib/metrics";
import type { Job, User } from "@/types";

const filters = ["All", "Remote", "Finance", "Tech", "Creative", "Healthcare"];

export function Jobs() {
  const [showPostJob, setShowPostJob] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => apiGet<Job[]>("/api/jobs") });
  const saved = useQuery({ queryKey: ["saved-jobs"], queryFn: () => apiGet<string[]>("/api/jobs/saved") });
  const postJob = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue | boolean>) => apiSend<Job>("/api/jobs", "POST", body),
    onSuccess: () => {
      setShowPostJob(false);
      toast("Job posted successfully", "success");
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => {
      setShowUpgrade(true);
      toast("Job could not be posted.", "error");
    },
  });
  const saveJob = useMutation({
    mutationFn: ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => apiSend<{ saved: boolean }>(`/api/jobs/${jobId}/save`, isSaved ? "DELETE" : "POST"),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast(data.saved ? "Job saved" : "Job removed from saved roles", "success");
      if (data.saved) trackMetric("job_saved");
    },
    onError: () => toast("Could not update saved jobs.", "error"),
  });
  const apply = useMutation({
    mutationFn: (jobId: string) => apiSend<{ applied: boolean; already_applied: boolean }>(`/api/jobs/${jobId}/apply`, "POST"),
    onSuccess: (data) => {
      toast(data.already_applied ? "You already recorded interest in this role." : "Interest recorded. The poster has been notified.", "success");
      trackMetric("job_application");
    },
    onError: () => toast("Could not record your interest. Please try again.", "error"),
  });
  const normalizedSearch = search.trim().toLowerCase();
  const filteredJobs = useMemo(() => {
    return (jobs.data ?? []).filter((job) => {
      const matchesSearch = !normalizedSearch ||
        [job.title, job.company, job.location, job.industry, job.career_stage].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      const matchesFilter =
        activeFilter === "All" ||
        job.job_type === activeFilter ||
        job.industry === activeFilter ||
        job.career_stage === activeFilter ||
        (activeFilter === "Remote" && job.is_remote);
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, jobs.data, normalizedSearch]);

  function openPostJob() {
    if (me.data?.plan !== "pro") setShowUpgrade(true);
    else setShowPostJob(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    postJob.mutate({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), halal_confirmed: true });
  }

  if (jobs.isLoading) return <div className="skeleton" />;
  if (jobs.error) return <ErrorState onRetry={() => void jobs.refetch()} title="Jobs did not load" />;

  return (
    <PageTransition>
      {/* Sticky header */}
      <div
        style={{
          padding: 12,
          position: "sticky",
          top: 72,
          zIndex: 10,
          background: "var(--color-bg-dark)",
          marginBottom: 14,
        }}
      >
        {/* Search bar */}
        <Input
          icon={<Search size={16} />}
          placeholder="Search jobs, companies..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ height: 44, padding: "0 12px", borderRadius: 12 }}
        />
        {/* Filter pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 10,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Job cards */}
      <Stagger as="div" style={{ display: "grid", gap: 10 }}>
        {filteredJobs.map((job) => {
          const isSaved = saved.data?.includes(job.id) ?? false;
          return (
            <Card
              key={job.id}
              variant="interactive"
              padding="md"
              onClick={() => setSelectedJob(job)}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Company logo/initials */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--color-success-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--color-success)",
                    flexShrink: 0,
                  }}
                >
                  {job.company.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{job.title}</strong>
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                        {job.company} · {job.location} · {job.job_type}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPostTime(job.created_at)}
                    </span>
                  </div>

                  {/* Tags */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {job.is_halal_verified && (
                      <HalalBadge />
                    )}
                    {job.is_remote && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "var(--color-bg-hover)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <Home size={11} /> Remote
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 10,
                      borderTop: "1px solid var(--color-line-light)",
                      paddingTop: 10,
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Bookmark size={14} fill={isSaved ? "var(--color-primary)" : "none"} />}
                      onClick={(e) => { e.stopPropagation(); saveJob.mutate({ jobId: job.id, isSaved }); }}
                    >
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<ArrowRight size={14} />}
                      iconPosition="right"
                      style={{ marginLeft: "auto" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </Stagger>

      {filteredJobs.length === 0 && (
        <div style={{ marginTop: 10 }}>
          <EmptyState
            icon={<Briefcase size={28} />}
            title="No matching roles"
            description="Try another search term or filter."
            variant="compact"
          />
        </div>
      )}

      {/* Floating post button for Pro users */}
      {me.data?.plan === "pro" && (
        <Button
          icon={<Plus size={24} />}
          onClick={openPostJob}
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            padding: 0,
            minHeight: 56,
            boxShadow: "0 4px 16px rgba(26,107,92,0.4)",
            zIndex: 30,
          }}
        >
          <></>
        </Button>
      )}

      {/* Post Job Modal */}
      {showPostJob ? (
        <Modal title="Post a halal-verified job" onClose={() => setShowPostJob(false)}>
          <form
            onSubmit={submit}
            style={{ display: "grid", gap: 16 }}
          >
            <Input name="title" placeholder="Job title" required />
            <Input name="company" placeholder="Company" required />
            <Input name="location" placeholder="Location" />
            <Input name="industry" placeholder="Industry" />
            <select className="input" name="job_type" defaultValue="Full-time">
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
              <option>Hybrid</option>
            </select>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="halal_confirmed" defaultChecked /> I confirm this role meets halal compliance expectations.
            </label>
            <Button
              type="submit"
              fullWidth
              loading={postJob.isPending}
              style={{ minHeight: 44 }}
            >
              Submit job
            </Button>
          </form>
        </Modal>
      ) : null}

      {/* Job Detail Modal */}
      {selectedJob ? (
        <Modal title={selectedJob.title} onClose={() => setSelectedJob(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <IconBox>{selectedJob.company.charAt(0)}</IconBox>
            <div>
              <strong style={{ fontSize: 16 }}>{selectedJob.company}</strong>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0 }}>
                {selectedJob.location}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
            {selectedJob.industry} · {selectedJob.career_stage} · {selectedJob.salary_range}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "8px 12px",
                color: "var(--color-success)",
                background: "var(--color-success-light)",
                border: "1px solid rgba(94,205,181,0.16)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {selectedJob.job_type}
            </span>
            {selectedJob.is_halal_verified && <HalalBadge />}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16, width: "100%", borderRadius: 100 }}
            onClick={() => apply.mutate(selectedJob.id)}
            disabled={apply.isPending}
          >
            Apply for this role
          </button>
        </Modal>
      ) : null}

      {showUpgrade ? <UpgradeModal onClose={() => setShowUpgrade(false)} /> : null}
    </PageTransition>
  );
}
