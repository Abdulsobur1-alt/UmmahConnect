import type { User } from "@/types";

export const MOCK_CURRENT_USER: User = {
  id: "mock-user-id",
  full_name: "Aisha Bello",
  email: "aisha@example.com",
  industry: "Tech & Software",
  career_stage: "Mid-Level",
  city: "Lagos",
  country: "Nigeria",
  bio: "A passionate software developer and community builder connecting Muslim professionals across Nigeria.",
  skills: ["Leadership", "Community Building", "Networking"],
  plan: "free",
  show_photo: true,
  open_to_opportunities: true,
  banner_url: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
};
