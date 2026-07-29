"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Crown, Megaphone, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageTransition } from "@/components/ui/PageTransition";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { isPremiumPlan } from "@/lib/plans";
import type { User } from "@/types";

type Announcement = { id: string; kind: string; title: string; body: string; location: string | null; startsAt: string | null; ctaUrl: string | null; author_name: string; createdAt: string };

const kindFilters = ["All", "Event", "Workshop", "Class", "Announcement"] as const;
type KindFilter = (typeof kindFilters)[number];

export function Announcements() {
  const [creating, setCreating] = useState(false);
  const [activeKind, setActiveKind] = useState<KindFilter>("All");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const items = useQuery({ queryKey: ["announcements"], queryFn: () => apiGet<Announcement[]>("/api/announcements") });
  const create = useMutation({
    mutationFn: (body: Record<string, string>) => apiSend("/api/announcements", "POST", body),
    onSuccess: () => { setCreating(false); toast("Announcement published", "success"); void queryClient.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (error: Error) => toast(error.message === "premium_required" ? "Announcements are a Premium feature." : "Could not publish announcement.", "error"),
  });

  const filtered = useMemo(() => {
    if (activeKind === "All") return items.data ?? [];
    return (items.data ?? []).filter((item) => item.kind.toLowerCase() === activeKind.toLowerCase());
  }, [items.data, activeKind]);

  const premium = isPremiumPlan(me.data?.plan);

  return (
    <PageTransition>
      <div className="screen-title">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Events, workshops, classes, and important community updates.</p>
        </div>
        {premium ? (
          <Button icon={<Plus size={17}/>} onClick={() => setCreating(true)}>Create announcement</Button>
        ) : (
          <Button variant="accent" icon={<Crown size={17}/>} onClick={() => window.location.href="/settings"}>Promote with Premium</Button>
        )}
      </div>

      {items.isLoading ? (
        <div className="skeleton" />
      ) : (items.data ?? []).length === 0 ? (
        <EmptyState icon={<Megaphone size={28}/>} title="No announcements yet" description="Premium members can promote their next event, workshop, or class here." />
      ) : (
        <>
          {/* Kind filter pills */}
          <div className="discover-tabs" style={{ marginBottom: 16 }}>
            {kindFilters.map((kind) => (
              <button
                key={kind}
                className={`discover-tab ${activeKind === kind ? "discover-tab--active" : ""}`}
                onClick={() => setActiveKind(kind)}
              >
                {kind}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Megaphone size={24}/>} title={`No ${activeKind.toLowerCase()} announcements`} description="Check back later or try a different category." variant="compact" />
          ) : (
          <div className="grid two-col">
            {filtered.map((item) => (
              <Card key={item.id} padding="lg" className="announcement-card">
                <div className="row">
                  <span className="pill">{item.kind}</span>
                  <span className="muted text-12">by {item.author_name}</span>
                </div>
                <h2>{item.title}</h2>
                <p className="muted" style={{ lineHeight: 1.6 }}>{item.body}</p>
                {item.startsAt ? (
                  <p className="row text-13">
                    <CalendarDays size={14}/>
                    {new Date(item.startsAt).toLocaleString()}
                  </p>
                ) : null}
                {item.location ? (
                  <p className="row text-13">
                    <MapPin size={14}/>
                    {item.location}
                  </p>
                ) : null}
                {item.ctaUrl ? (
                  <a className="btn btn-primary" href={item.ctaUrl} target="_blank" rel="noreferrer">
                    Learn more
                  </a>
                ) : null}
              </Card>
            ))}
          </div>
          )}
        </>
      )}

      {creating ? (
        <Modal title="Promote an announcement" onClose={() => setCreating(false)}>
          <form className="edit-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate(Object.fromEntries(form) as Record<string,string>); }}>
            <select className="input" name="kind" defaultValue="event">
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
              <option value="class">Class</option>
              <option value="announcement">Announcement</option>
            </select>
            <Input name="title" placeholder="Title" required/>
            <textarea className="textarea" name="body" placeholder="Tell members what they need to know" rows={5} required/>
            <Input name="location" placeholder="Online or location (optional)"/>
            <Input name="starts_at" type="datetime-local"/>
            <Input name="cta_url" type="url" placeholder="Registration link (optional)"/>
            <Input name="expires_at" type="datetime-local"/>
            <Button fullWidth loading={create.isPending}>Publish announcement</Button>
          </form>
        </Modal>
      ) : null}
    </PageTransition>
  );
}
