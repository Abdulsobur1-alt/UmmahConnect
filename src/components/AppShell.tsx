"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Compass, Home, MessageCircle, Settings, Megaphone,
  Sparkles, UserRound, ChevronDown, LogOut, Bell, MoreHorizontal,
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
  { href: "/announcements", label: "Announcements", icon: Megaphone },
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
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [dropdownAnimating, setDropdownAnimating] = useState(false);
  const [maxVisibleNav, setMaxVisibleNav] = useState(navItems.length);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreNavRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const measuredWidthsRef = useRef<number[] | null>(null);
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
      if (moreNavRef.current && !moreNavRef.current.contains(event.target as Node)) {
        setShowMoreNav(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const closeMoreOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMoreNav(false);
    };
    document.addEventListener("keydown", closeMoreOnEscape);
    return () => document.removeEventListener("keydown", closeMoreOnEscape);
  }, []);

  // Layouts persist between App Router navigations. Never leave an open menu
  // floating over the destination page after a navigation completes.
  useEffect(() => {
    setShowMoreNav(false);
  }, [pathname]);

  // Fluid More menu — measure actual rendered DOM widths at each zoom level so
  // the nav container flexes naturally based on real space. Uses ResizeObserver
  // for window/zoom changes and MutationObserver for when items move between
  // the visible nav row and the "More" dropdown.
  useEffect(() => {
    const navInner = document.querySelector('.app-nav-inner') as HTMLElement | null;
    if (!navInner) return;

    function checkFit() {
      const container = navInner as HTMLElement;
      const brand = container.querySelector('.brand') as HTMLElement | null;
      const rightControls = container.querySelector('.desktop-header-right') as HTMLElement | null;
      if (!brand || !rightControls) return;

      const available = container.clientWidth - brand.offsetWidth - rightControls.offsetWidth - 18;
      const gap = 6;
      const moreBtnWidth = 86;

      // Measure actual rendered nav link widths from the DOM
      const linkEls = container.querySelectorAll('.nav-links > .nav-link') as NodeListOf<HTMLElement>;

      if (linkEls.length > 0) {
        // Cache when all items are visible (first paint or after fitting again)
        if (linkEls.length === navItems.length) {
          measuredWidthsRef.current = Array.from(linkEls).map(el => el.offsetWidth + gap);
        }
      }

      const widths = measuredWidthsRef.current;
      if (!widths || widths.length === 0) return;

      const totalAllItems = widths.reduce((sum, w) => sum + w, 0);

      if (totalAllItems + moreBtnWidth <= available) {
        // Everything fits — show all; cached widths will be refreshed on next
        // cycle because all items are now visible again.
        setMaxVisibleNav(prev => prev !== navItems.length ? navItems.length : prev);
        return;
      }

      // Not every item fits — count how many visible items + More button do
      let used = moreBtnWidth;
      let count = 0;
      for (const w of widths) {
        if (used + w > available) break;
        used += w;
        count++;
      }
      let newCount = Math.max(2, Math.min(count, navItems.length));

      // Overflow safeguard: if the DOM scrolls beyond its container despite
      // our calculation (e.g., stale cached widths after zoom-in), back off.
      const navLinksEl = container.querySelector('.nav-links') as HTMLElement | null;
      if (navLinksEl && navLinksEl.scrollWidth > navLinksEl.clientWidth + 2) {
        newCount = Math.max(2, newCount - 1);
      }

      setMaxVisibleNav(prev => prev !== newCount ? newCount : prev);
    }

    function scheduleCheck() {
      requestAnimationFrame(checkFit);
    }

    // Observe parent for resize (window resize, zoom, etc.)
    const resizeObserver = new ResizeObserver(scheduleCheck);
    resizeObserver.observe(navInner);

    // Observe nav-links for content changes (items moving between row and dropdown)
    const navLinks = navInner.querySelector('.nav-links') as HTMLElement | null;
    let mutationObserver: MutationObserver | null = null;
    if (navLinks) {
      mutationObserver = new MutationObserver(scheduleCheck);
      mutationObserver.observe(navLinks, { childList: true });
    }

    // Initial measurement
    scheduleCheck();

    return () => {
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  const visibleItems = navItems.slice(0, maxVisibleNav);
  const overflowItems = navItems.slice(maxVisibleNav);

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
          <div className="nav-links" ref={navLinksRef} aria-label="Main navigation">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link nav-link--${item.href.slice(1)} ${active ? "nav-link-active" : ""} transition-fast`}
                >
                  <span className="row">
                    <Icon size={16} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {overflowItems.length > 0 ? (
              <div className="desktop-nav-more" style={{ display: "block" }} ref={moreNavRef}>
                <button
                  className={`nav-link nav-link-more ${overflowItems.some((item) => pathname === item.href) ? "nav-link-active" : ""}`}
                  onClick={() => setShowMoreNav((value) => !value)}
                >
                  <MoreHorizontal size={17} /> More
                </button>
                {showMoreNav ? (
                  <div className="desktop-more-menu animate-scale-in">
                    {overflowItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="dropdown-item"
                          onClick={() => setShowMoreNav(false)}
                        >
                          <Icon size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {/* Avatar dropdown — desktop */}
          <div
            className="desktop-only desktop-header-right"
            ref={dropdownRef}
          >
            <Link href="/notifications" className="desktop-notification-button" aria-label="Notifications">
              <Bell size={19} />
              {latestNotification ? <span className="desktop-notification-dot" /> : null}
            </Link>
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

      {/* Compact mobile app bar */}
      <header className="mobile-app-header">
        <Link href="/feed" className="mobile-brand" aria-label="Ummah Connect home">
          Ummah <span>Connect</span>
        </Link>
        <div className="mobile-header-actions">
          <Link href="/notifications" className="mobile-icon-button" aria-label="Notifications">
            <Bell size={19} />
            {latestNotification ? <span className="mobile-notification-dot" /> : null}
          </Link>
          <Link href="/profile" className="mobile-profile-link" aria-label="Your profile">
            <Avatar name={currentUser?.full_name ?? "U"} size={34} />
          </Link>
        </div>
      </header>

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
