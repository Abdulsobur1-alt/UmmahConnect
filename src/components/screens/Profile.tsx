"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Edit3, MapPin, MessageCircle, Mail, Users, FileText, Globe, Briefcase, CheckCircle2 } from "lucide-react";
import { PostCard } from "@/components/ui/PostCard";
import { FormEvent, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";
import { formatPostTime } from "@/lib/utils/time";
import { InfoCard, ProgressBar, Tag } from "@/components/ui/Common";
import { MOCK_CURRENT_USER } from "@/lib/mock";
import type { Post, User } from "@/types";

export function Profile() {
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => apiGet<Post[]>("/api/posts") });
  const weekly = useQuery({ queryKey: ["weekly-count"], queryFn: () => apiGet<{ count: number; remaining: number }>("/api/messages/weekly-count") });
  const connections = useQuery({
    queryKey: ["connections-count"],
    queryFn: () => apiGet<{ id: string }[]>(`/api/users/${me.data?.id}/connections`),
    enabled: Boolean(me.data?.id),
  });
  const update = useMutation({
    mutationFn: (body: Partial<User>) => apiSend<User>(`/api/users/${me.data?.id}`, "PATCH", body),
    onSuccess: () => {
      setEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      toast("Profile updated", "success");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => {
      toast("Could not save. Please try again.", "error");
    },
  });

  if (me.isLoading) return <div className="skeleton" />;
  const currentUser = me.data ?? MOCK_CURRENT_USER;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({
      full_name: String(form.get("full_name") ?? ""),
      industry: String(form.get("industry") ?? ""),
      career_stage: String(form.get("career_stage") ?? ""),
      city: String(form.get("city") ?? ""),
      bio: String(form.get("bio") ?? ""),
    });
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
      update.mutate({ avatar_url: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  async function handleBannerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/banner', { method: 'POST', body: formData });
      if (res.ok) {
        const { url } = await res.json();
        await update.mutateAsync({ banner_url: url });
      }
    } catch (err) {
      console.error('Banner upload error:', err);
    } finally {
      setUploadingBanner(false);
    }
  }

  const displayAvatar = avatarPreview || currentUser.avatar_url;
  const displayBanner = bannerPreview || currentUser.banner_url;
  const userPosts = posts.data?.filter((post) => post.user_id === currentUser.id) ?? [];

  return (
    <div className="animate-fade-in">
      {/* Success toast */}
      {savedSuccess ? (
        <div className="success-banner animate-fade-in-down"
        >
          <CheckCircle2 size={18} /> Profile updated successfully
        </div>
      ) : null}

      {/* 1. Cover banner */}
      <div
        className="profile-banner transition-normal"
        style={{
          background: displayBanner
            ? `url(${displayBanner}) center/cover no-repeat`
            : "linear-gradient(120deg, var(--color-primary), var(--color-accent))",
        }}
      >
        <button
          className="banner-upload-btn transition-fast"
          onClick={() => bannerInputRef.current?.click()}
          aria-label="Upload banner image"
        >
          {uploadingBanner ? <span className="spin" style={{ fontSize: 10 }}>⟳</span> : <Camera size={16} />}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={handleBannerChange}
        />
      </div>

      {/* 2. Avatar + Edit button */}
      <div
        className="profile-avatar-row animate-fade-in"
      >
        <div className="profile-avatar-inner">
          <div className="profile-avatar-border transition-normal"
          >
            <Avatar name={currentUser.full_name} size={80} src={displayAvatar} />
          </div>
          <button
            className="avatar-upload-btn transition-fast hover-lift"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile picture"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Edit3 size={14} />}
          onClick={() => setEditing(true)}
        >
          Edit Profile
        </Button>
      </div>

      {/* 3. Name + Industry + Location + Bio + Skills */}
      <div className="profile-content-inner animate-fade-in">
        <h1 className="profile-name font-display"
        >
          {currentUser.full_name}
        </h1>

        <p className="profile-meta">
          {[currentUser.industry, currentUser.career_stage].filter(Boolean).join(" · ") || "No industry set"}
        </p>

        <p className="profile-meta-sm">
          <MapPin size={12} />
          {currentUser.city}, {currentUser.country}
        </p>

        {currentUser.bio ? (
          <div className="animate-fade-in profile-bio">
            {currentUser.bio.length > 150 && !bioExpanded
              ? currentUser.bio.slice(0, 150) + "..."
              : currentUser.bio}
            {currentUser.bio.length > 150 && (
              <button
                className="btn-link transition-fast"
                style={{ marginLeft: 4, fontSize: 13, color: "rgba(255,255,255,0.55)" }}
                onClick={() => setBioExpanded(!bioExpanded)}
              >
                {bioExpanded ? "see less" : "see more"}
              </button>
            )}
          </div>
        ) : null}

        {currentUser.skills.length > 0 && (
          <div className="skill-bar animate-fade-in"
          >
            {currentUser.skills.map((skill) => (
              <Tag key={skill} className="transition-fast">{skill}</Tag>
            ))}
          </div>
        )}
      </div>

      {/* 4. Stats row */}
      <div className="profile-stats-row stagger-children"
      >
        {[
          { label: "Connections", value: String(connections.data?.length ?? 0), icon: Users },
          { label: "Posts", value: String(userPosts.length), icon: FileText },
          { label: "Communities", value: "—", icon: Globe },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-item">
            <div className="stat-value">{value}</div>
            <div className="stat-label"
            >
              <Icon size={12} /> {label}
            </div>
          </div>
        ))}
      </div>

      {/* 5. Open to Opportunities */}
      {currentUser.open_to_opportunities && (
        <div className="profile-opp-banner animate-fade-in"
        >
          <Briefcase size={16} />
          ✓ Open to Opportunities
        </div>
      )}

      {/* 6. Connections & Posts */}
      <div className="profile-content stagger-children">
        {/* Connections Section */}
        <Card
          variant="interactive"
          padding="md"
          style={{ marginTop: 14 }}
        >
          <div className="flex-between mb-sm">
            <h3 className="text-bold" style={{ margin: 0, fontSize: 18 }}>Connections</h3>
            <Button variant="ghost" size="sm" className="see-all-btn">See all</Button>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Connect with professionals to grow your network
          </p>
        </Card>

        {/* Posts Section */}
        <div style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif" }}>
            Posts
          </h3>
          {userPosts.length > 0 ? (
            userPosts.map((post, index) => (
              <div key={post.id} style={{ marginBottom: 8 }}>
                <PostCard
                  post={post}
                  isExpanded={false}
                  isLiked={false}
                  isAnimatingLike={false}
                  onToggleExpand={() => {}}
                  onLike={() => {}}
                  index={index}
                />
              </div>
            ))
          ) : (
            <EmptyState
              icon={<FileText size={24} />}
              title="No posts yet"
              description="Share your first post with the community."
              variant="compact"
            />
          )}
        </div>

        <InfoCard
          icon={<MessageCircle size={16} color="var(--color-primary)" />}
          title="Weekly messaging counter"
          description="Free users can send and receive messages from anyone, including Pro users. Sending is limited to 10 messages per week."
          extra={
            <>
              <ProgressBar value={weekly.data?.count ?? 0} height={8} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "6px 0 0" }}>
                {weekly.data?.count ?? 0} of 10 messages used this week
              </p>
            </>
          }
        />

        <InfoCard
          icon={<Mail size={16} color="var(--color-primary)" />}
          title="Opportunities"
          description={currentUser.open_to_opportunities ? "Open to relevant roles and collaborations." : "Not currently open to opportunities."}
          extra={
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Tag variant={currentUser.open_to_opportunities ? "green" : "dark"}>
                {currentUser.open_to_opportunities ? "Open to Opportunities" : "Not open to opportunities"}
              </Tag>
            </div>
          }
        />
      </div>

      {/* Edit Modal */}
      {editing ? (
        <Modal title="Edit profile" onClose={() => setEditing(false)}>
          <form className="edit-form" onSubmit={submit}
          >
            <Input name="full_name" defaultValue={currentUser.full_name} placeholder="Full name" />
            <Input name="industry" defaultValue={currentUser.industry} placeholder="Industry" />
            <Input name="career_stage" defaultValue={currentUser.career_stage} placeholder="Career stage" />
            <Input name="city" defaultValue={currentUser.city} placeholder="City" />
            <textarea className="textarea" name="bio" defaultValue={currentUser.bio} placeholder="Bio" rows={4} />
            <Button
              fullWidth
              loading={update.isPending}
              style={{ borderRadius: 100, minHeight: 44 }}
            >
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
