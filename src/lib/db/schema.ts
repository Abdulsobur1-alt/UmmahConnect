import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ─── Enums ─── */

export const planEnum = pgEnum("plan", ["free", "pro", "sponsor"]);
export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "declined",
]);

/* ─── 1. Users ─── */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  industry: text("industry"),
  careerStage: text("career_stage"),
  country: text("country").notNull().default("Nigeria"),
  city: text("city"),
  bio: text("bio"),
  skills: text("skills").array().default([]),
  plan: planEnum("plan").notNull().default("free"),
  showPhoto: boolean("show_photo").notNull().default(true),
  openToOpportunities: boolean("open_to_opportunities").notNull().default(false),
  bannerUrl: text("banner_url"),
  avatarUrl: text("avatar_url"),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 2. Waitlist ─── */
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  city: text("city").notNull(),
  industry: text("industry").notNull(),
  refCode: text("ref_code").unique(),
  referredBy: text("referred_by"),
  referralCount: integer("referral_count").notNull().default(0),
  position: integer("position").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 3. Posts ─── */
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  communityId: uuid("community_id"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 4. Post Likes ─── */
export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.userId] }),
  }),
);

/* ─── 5. Comments ─── */
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 6. Communities ─── */
export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(false),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 7. Community Members ─── */
export const communityMembers = pgTable(
  "community_members",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.communityId, table.userId] }),
  }),
);

/* ─── 8. Connections ─── */
export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: connectionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 9. Messages ─── */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isDeletedBySender: boolean("is_deleted_by_sender").notNull().default(false),
  isDeletedByReceiver: boolean("is_deleted_by_receiver").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 10. Message Weekly Counts ─── */
export const messageWeeklyCounts = pgTable(
  "message_weekly_counts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.weekStart] }),
  }),
);

/* ─── 11. Jobs ─── */
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  postedBy: uuid("posted_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description"),
  industry: text("industry"),
  location: text("location"),
  isRemote: boolean("is_remote").notNull().default(false),
  jobType: text("job_type"),
  careerStage: text("career_stage"),
  salaryRange: text("salary_range"),
  isHalalVerified: boolean("is_halal_verified").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 12. Mentorship Profiles ─── */
export const mentorshipProfiles = pgTable("mentorship_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  industries: text("industries").array().default([]),
  languages: text("languages").array().default([]),
  valuesTags: text("values_tags").array().default([]),
  careerStage: text("career_stage"),
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 13. Mentorship Requests ─── */
export const mentorshipRequests = pgTable("mentorship_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  menteeId: uuid("mentee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 14. Event Listings ─── */
export const eventListings = pgTable("event_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  locationType: text("location_type").notNull(),
  locationDetail: text("location_detail"),
  targetIndustry: text("target_industry"),
  bannerUrl: text("banner_url"),
  isActive: boolean("is_active").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(false),
  viewsCount: integer("views_count").notNull().default(0),
  clicksCount: integer("clicks_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 15. Notifications ─── */
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 16. Subscriptions ─── */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  paystackSubscriptionCode: text("paystack_subscription_code").unique(),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackReference: text("paystack_reference").unique(),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── 17. Rate Limits ─── */
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    action: text("action").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueConstraint: uniqueIndex("rate_limits_identifier_action_window_key").on(
      table.identifier,
      table.action,
      table.windowStart,
    ),
  }),
);

/* ─── Relations ─── */
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  postLikes: many(postLikes),
  connectionsSent: many(connections, { relationName: "requester" }),
  connectionsReceived: many(connections, { relationName: "receiver" }),
  messagesSent: many(messages, { relationName: "sender" }),
  messagesReceived: many(messages, { relationName: "receiver" }),
  mentorshipProfile: many(mentorshipProfiles),
  mentorshipRequestsAsMentee: many(mentorshipRequests, { relationName: "mentee" }),
  mentorshipRequestsAsMentor: many(mentorshipRequests, { relationName: "mentor" }),
  notifications: many(notifications),
  jobsPosted: many(jobs),
  subscriptions: many(subscriptions),
  eventListings: many(eventListings),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  likes: many(postLikes),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  members: many(communityMembers),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  receiver: one(users, {
    fields: [connections.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
