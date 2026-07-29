"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Crown, Megaphone, MapPin, Plus } from "lucide-react";
import { useState } from "react";
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

export function Announcements() {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast(); const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const items = useQuery({ queryKey: ["announcements"], queryFn: () => apiGet<Announcement[]>("/api/announcements") });
  const create = useMutation({ mutationFn: (body: Record<string, string>) => apiSend("/api/announcements", "POST", body), onSuccess: () => { setCreating(false); toast("Announcement published", "success"); void queryClient.invalidateQueries({ queryKey: ["announcements"] }); }, onError: (error: Error) => toast(error.message === "premium_required" ? "Announcements are a Premium feature." : "Could not publish announcement.", "error") });
  const premium = isPremiumPlan(me.data?.plan);
  return <PageTransition><div className="screen-title"><div><h1>Announcements</h1><p className="muted">Events, workshops, classes, and important community updates.</p></div>{premium ? <Button icon={<Plus size={17}/>} onClick={() => setCreating(true)}>Create announcement</Button> : <Button variant="accent" icon={<Crown size={17}/>} onClick={() => window.location.href="/settings"}>Promote with Premium</Button>}</div>
    {items.isLoading ? <div className="skeleton" /> : (items.data ?? []).length === 0 ? <EmptyState icon={<Megaphone size={28}/>} title="No announcements yet" description="Premium members can promote their next event, workshop, or class here." /> : <div className="grid two-col">{items.data!.map((item) => <Card key={item.id} padding="lg" className="announcement-card"><div className="row"><span className="pill">{item.kind}</span><span className="muted text-12">by {item.author_name}</span></div><h2>{item.title}</h2><p className="muted">{item.body}</p>{item.startsAt ? <p className="row text-13"><CalendarDays size={14}/>{new Date(item.startsAt).toLocaleString()}</p> : null}{item.location ? <p className="row text-13"><MapPin size={14}/>{item.location}</p> : null}{item.ctaUrl ? <a className="btn btn-primary" href={item.ctaUrl} target="_blank" rel="noreferrer">Learn more</a> : null}</Card>)}</div>}
    {creating ? <Modal title="Promote an announcement" onClose={() => setCreating(false)}><form className="edit-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate(Object.fromEntries(form) as Record<string,string>); }}><select className="input" name="kind" defaultValue="event"><option value="event">Event</option><option value="workshop">Workshop</option><option value="class">Class</option><option value="announcement">Announcement</option></select><Input name="title" placeholder="Title" required/><textarea className="textarea" name="body" placeholder="Tell members what they need to know" rows={5} required/><Input name="location" placeholder="Online or location (optional)"/><Input name="starts_at" type="datetime-local"/><Input name="cta_url" type="url" placeholder="Registration link (optional)"/><Input name="expires_at" type="datetime-local"/><Button fullWidth loading={create.isPending}>Publish announcement</Button></form></Modal> : null}</PageTransition>;
}
