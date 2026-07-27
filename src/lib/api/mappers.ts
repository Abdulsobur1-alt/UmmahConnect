// Local type definitions matching the Drizzle schema column names
// mappers accept both camelCase (Drizzle) and snake_case (legacy) field names

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  industry: string | null;
  career_stage: string | null;
  country: string;
  city: string | null;
  bio: string | null;
  skills: string[];
  plan: string;
  show_photo: boolean;
  open_to_opportunities: boolean;
  avatar_url: string | null;
  created_at: string | null;
}

export interface PostRow {
  id: string;
  user_id: string;
  content: string;
  community_id: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
}

export interface CommunityRow {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  is_private: boolean;
  member_count: number | null;
  created_at: string | null;
}

export interface JobRow {
  id: string;
  posted_by: string | null;
  title: string;
  company: string;
  description: string | null;
  industry: string | null;
  location: string | null;
  is_remote: boolean;
  job_type: string | null;
  career_stage: string | null;
  salary_range: string | null;
  is_halal_verified: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface EventListingRow {
  id: string;
  sponsor_id: string | null;
  title: string;
  event_date: string | null;
  location_type: string | null;
  location_detail: string | null;
  is_active: boolean;
  views_count: number | null;
  clicks_count: number | null;
  created_at: string | null;
}

export interface MessageRow {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string | null;
}

export interface NotificationRow {
  id: string;
  user_id: string | null;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string | null;
  reference_id: string | null;
}

/** Read a string field preferring snake_case, falling back to camelCase */
function s(obj: any, snake: string, camel: string): string {
  return obj[snake] ?? obj[camel] ?? '';
}

/** Read a number field preferring snake_case, falling back to camelCase */
function n(obj: any, snake: string, camel: string): number {
  return obj[snake] ?? obj[camel] ?? 0;
}

/** Read a boolean field preferring snake_case, falling back to camelCase */
function b(obj: any, snake: string, camel: string): boolean {
  return obj[snake] ?? obj[camel] ?? false;
}

/** Read an array field preferring snake_case, falling back to camelCase */
function a(obj: any, snake: string, camel: string): string[] {
  return obj[snake] ?? obj[camel] ?? [];
}

export function publicProfileDto(user: any) {
  return {
    id: user.id,
    full_name: s(user, 'full_name', 'fullName'),
    industry: s(user, 'industry', 'industry'),
    career_stage: s(user, 'career_stage', 'careerStage'),
    city: s(user, 'city', 'city'),
    country: s(user, 'country', 'country') || 'Nigeria',
    bio: s(user, 'bio', 'bio'),
    skills: a(user, 'skills', 'skills'),
    open_to_opportunities: b(user, 'open_to_opportunities', 'openToOpportunities'),
    allow_connection_requests: b(user, 'allow_connection_requests', 'allowConnectionRequests'),
    onboarding_completed: b(user, 'onboarding_completed', 'onboardingCompleted'),
    is_verified: b(user, 'is_verified', 'isVerified'),
    notification_settings: user.notification_settings ?? user.notificationSettings ?? {},
    banner_url: s(user, 'banner_url', 'bannerUrl') || null,
  avatar_url: s(user, 'avatar_url', 'avatarUrl') || null,
    created_at: s(user, 'created_at', 'createdAt'),
  };
}

export function userDto(user: any) {
  return {
    id: user.id,
    full_name: s(user, 'full_name', 'fullName'),
    email: s(user, 'email', 'email'),
    industry: s(user, 'industry', 'industry'),
    career_stage: s(user, 'career_stage', 'careerStage'),
    city: s(user, 'city', 'city'),
    country: s(user, 'country', 'country') || 'Nigeria',
    bio: s(user, 'bio', 'bio'),
    skills: a(user, 'skills', 'skills'),
    plan: s(user, 'plan', 'plan') || 'free',
    show_photo: b(user, 'show_photo', 'showPhoto'),
    open_to_opportunities: b(user, 'open_to_opportunities', 'openToOpportunities'),
    allow_connection_requests: b(user, 'allow_connection_requests', 'allowConnectionRequests'),
    onboarding_completed: b(user, 'onboarding_completed', 'onboardingCompleted'),
    is_verified: b(user, 'is_verified', 'isVerified'),
    notification_settings: user.notification_settings ?? user.notificationSettings ?? {},
    avatar_url: s(user, 'avatar_url', 'avatarUrl') || null,
    banner_url: s(user, 'banner_url', 'bannerUrl') || null,
    created_at: s(user, 'created_at', 'createdAt'),
  };
}

export function postDto(post: any) {
  return {
    id: post.id,
    user_id: s(post, 'user_id', 'userId'),
    content: post.content ?? '',
    community_id: post.community_id ?? post.communityId ?? null,
    likes_count: n(post, 'likes_count', 'likesCount'),
    comments_count: n(post, 'comments_count', 'commentsCount'),
    created_at: s(post, 'created_at', 'createdAt'),
    user: post.users ? userDto(post.users) : null,
  };
}

export function communityDto(community: any) {
  return {
    id: community.id,
    name: community.name ?? '',
    icon: s(community, 'icon', 'icon'),
    description: s(community, 'description', 'description'),
    is_private: b(community, 'is_private', 'isPrivate'),
    member_count: n(community, 'member_count', 'memberCount'),
  };
}

export function jobDto(job: any) {
  return {
    id: job.id,
    posted_by: s(job, 'posted_by', 'postedBy'),
    title: job.title ?? '',
    company: job.company ?? '',
    description: s(job, 'description', 'description'),
    industry: s(job, 'industry', 'industry'),
    location: s(job, 'location', 'location'),
    is_remote: b(job, 'is_remote', 'isRemote'),
    job_type: s(job, 'job_type', 'jobType'),
    career_stage: s(job, 'career_stage', 'careerStage'),
    salary_range: s(job, 'salary_range', 'salaryRange'),
    is_halal_verified: b(job, 'is_halal_verified', 'isHalalVerified'),
    is_active: b(job, 'is_active', 'isActive'),
    created_at: s(job, 'created_at', 'createdAt'),
  };
}

export function eventDto(event: any) {
  return {
    id: event.id,
    sponsor_id: s(event, 'sponsor_id', 'sponsorId'),
    title: event.title ?? '',
    event_date: s(event, 'event_date', 'eventDate'),
    location_type: s(event, 'location_type', 'locationType'),
    location_detail: s(event, 'location_detail', 'locationDetail'),
    is_active: b(event, 'is_active', 'isActive'),
    views_count: n(event, 'views_count', 'viewsCount'),
    clicks_count: n(event, 'clicks_count', 'clicksCount'),
  };
}

export function messageDto(message: any) {
  return {
    id: message.id,
    sender_id: s(message, 'sender_id', 'senderId'),
    receiver_id: s(message, 'receiver_id', 'receiverId'),
    content: message.content ?? '',
    is_read: b(message, 'is_read', 'isRead'),
    created_at: s(message, 'created_at', 'createdAt'),
  };
}

export function notificationDto(notification: any) {
  return {
    id: notification.id,
    user_id: s(notification, 'user_id', 'userId'),
    type: notification.type ?? '',
    content: notification.content ?? '',
    is_read: b(notification, 'is_read', 'isRead'),
    created_at: s(notification, 'created_at', 'createdAt'),
    reference_id: notification.reference_id ?? notification.referenceId ?? undefined,
  };
}
