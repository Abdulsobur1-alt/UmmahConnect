"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, UserPlus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiSend } from "@/lib/api/client";

type PublicProfile = { id: string; full_name: string; industry: string; career_stage: string; city: string; country: string; bio: string; skills: string[]; avatar_url: string | null; show_photo: boolean; open_to_opportunities: boolean; };

export function ProfilePreviewModal({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile-preview", profileId], queryFn: () => apiGet<PublicProfile>(`/api/profiles/${profileId}`) });
  const connect = useMutation({
    mutationFn: () => apiSend("/api/connections", "POST", { receiver_id: profileId }),
    onSuccess: () => { toast("Connection request sent", "success"); void queryClient.invalidateQueries({ queryKey: ["suggested-users"] }); },
    onError: (error: Error) => toast(error.message === "connection_request_exists" ? "A connection request already exists." : "Connection request could not be sent.", "error"),
  });

  return <Modal title="Member profile" onClose={onClose} size="md">
    {profile.isLoading ? <div className="skeleton" style={{ minHeight: 240 }} /> : profile.error || !profile.data ? <p className="muted">This member profile is no longer available.</p> : (
      <div className="profile-preview">
        <div className="profile-preview-head"><Avatar name={profile.data.full_name} src={profile.data.show_photo ? profile.data.avatar_url : null} size={72} /><div><h3 className="font-display">{profile.data.full_name}</h3><p className="muted">{[profile.data.career_stage, profile.data.industry].filter(Boolean).join(" · ") || "Member"}</p>{(profile.data.city || profile.data.country) ? <p className="profile-preview-location"><MapPin size={14} /> {[profile.data.city, profile.data.country].filter(Boolean).join(", ")}</p> : null}</div></div>
        {profile.data.open_to_opportunities ? <span className="pill pill--active">Open to opportunities</span> : null}
        {profile.data.bio ? <p className="profile-preview-bio">{profile.data.bio}</p> : null}
        {profile.data.skills?.length ? <div className="row row--wrap profile-preview-skills">{profile.data.skills.map((skill) => <span className="pill" key={skill}>{skill}</span>)}</div> : null}
        <Button variant="primary" icon={<UserPlus size={17} />} loading={connect.isPending} onClick={() => connect.mutate()}>{connect.isSuccess ? "Request sent" : "Connect"}</Button>
      </div>
    )}
  </Modal>;
}
