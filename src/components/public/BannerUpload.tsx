"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

interface BannerUploadProps {
  bannerUrl: string | null;
  isOwner: boolean;
}

export function BannerUpload({ bannerUrl, isOwner }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/banner", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        const patchRes = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banner_url: url }),
        });
        if (patchRes.ok) {
          window.location.reload();
        }
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="public-banner-wrap" style={{ position: "relative" }}>
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div className="public-banner-empty" />
      )}
      {isOwner ? (
        <button
          className="banner-overlay-btn transition-fast"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload banner image"
        >
          {uploading ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
          <span>{uploading ? "Uploading…" : "Change banner"}</span>
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}
