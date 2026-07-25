"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Compass, Home, MessageCircle, Settings,
  Sparkles, UserRound, ChevronDown, LogOut, Bell, X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { apiGet } from "@/lib/api/client";
import type { Notification, User } from "@/types";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/mentorship", label: "Mentorship", icon: Sparkles },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

const bottomTabs = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dismissedNotif, setDismissedNotif] = useState<string | null>(null);
  const [dropdownAnimating, setDropdownAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => apiGet<User>("/api/users/me") });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<Notification[]>("/api/notifications"),
    enabled: Boolean(currentUser),
  });
  const latestNotification = notifications.find((n) => !n.is_read);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Animate dropdown
  const toggleDropdown = useCallback(() => {
    if (!showDropdown) {
      setDropdownAnimating(true);
      setShowDropdown(true);
    } else {
      setDropdownAnimating(false);
      setTimeout(() => setShowDropdown(false), 150);
    }
  }, [showDropdown]);

  return (
    <div className="app-shell">
      {/* Bismillah header */}
      <div className="app-header-bismillah">
        <span lang="ar" dir="rtl">بسم الله الرحمن الرحيم</span>
      </div>

      {/* Desktop top nav */}
      <nav className="app-nav app-nav--desktop" style={{ position: "sticky", top: 0 }}>
        <div className="container app-nav-inner">
          <Link href="/feed" className="brand transition-fast">
            Ummah <span>Connect</span>
          </Link>
          <div className="nav-links" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link-active" : ""} transition-fast`}
                >
                  <span className="row">
                    <Icon size={16} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Avatar dropdown — desktop */}
          <div
            className="desktop-only desktop-header-right"
            ref={dropdownRef}
          >
            <Link
              href="/settings"
              className="plan-badge transition-fast hover-lift"
            >
              {currentUser?.plan === "free" ? "Free" : currentUser?.plan ?? "..."}
            </Link>
            <button
              className="avatar-dropdown-trigger"
              onClick={toggleDropdown}
              aria-label="User menu"
            >
              <Avatar name={currentUser?.full_name ?? "U"} size={32} />
              <ChevronDown
                size={14}
                className={`chevron-icon ${showDropdown ? "chevron-icon--open" : ""}`}
              />
            </button>
            {showDropdown ? (
              <div
                className={`dropdown-menu ${dropdownAnimating ? "animate-scale-in" : ""}`}
              >
                <Link
                  href="/settings"
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  <Settings size={16} /> Settings
                </Link>
                <button
                  className="dropdown-item"
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Notification banner at top of page */}
      {latestNotification && dismissedNotif !== latestNotification.id ? (
        <div className="notif-banner animate-notification-slide"
        >
          <Bell size={16} className="bell-icon" />
          <span className="banner-text">{latestNotification.content}</span>
          <button className="notif-banner-close"
            onClick={() => setDismissedNotif(latestNotification.id)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Main content */}
      <main className="container app-main animate-fade-in">{children}</main>

      {/* Mobile bottom tab bar — exactly 5 tabs */}
      <nav className="bottom-nav">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href === "/feed" && pathname === "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-item ${isActive ? "bottom-nav-item--active" : ""}`}
            >
              <Icon size={22} />
              <span>{tab.label}</span>
              {isActive ? <span className="tab-indicator" /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
