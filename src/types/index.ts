export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

export type Plan = "free" | "pro" | "sponsor";

export type User = {
  id: string;
  full_name: string;
  email: string;
  industry: string;
  career_stage: string;
  city: string;
  country: string;
  bio: string;
  skills: string[];
  plan: Plan;
  show_photo: boolean;
  open_to_opportunities: boolean;
  allow_connection_requests: boolean;
  onboarding_completed: boolean;
  is_verified: boolean;
  notification_settings: Record<string, boolean | string>;
  banner_url: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  community_id: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  created_at: string;
  user: User;
};

export type Community = {
  id: string;
  name: string;
  icon: string;
  description: string;
  is_private: boolean;
  member_count: number;
  created_at?: string;
  is_joined?: boolean;
};

export type Job = {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  location: string;
  is_remote: boolean;
  job_type: string;
  industry: string;
  is_halal_verified: boolean;
  career_stage: string;
  salary_range: string;
  created_at: string;
};

export type EventListing = {
  id: string;
  sponsor_id: string;
  title: string;
  event_date: string;
  location_type: string;
  location_detail: string;
  is_active: boolean;
  views_count: number;
  clicks_count: number;
};

export type MentorProfile = {
  user_id: string;
  full_name: string;
  role: string;
  city: string;
  match_score: number;
  industries: string[];
  values_tags: string[];
  bio: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  user: User;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  reference_id?: string;
};
