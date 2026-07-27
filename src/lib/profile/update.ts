const fieldMap: Record<string, string> = {
  name: "fullName", full_name: "fullName", fullName: "fullName",
  avatar_url: "avatarUrl", avatarUrl: "avatarUrl", banner_url: "bannerUrl", bannerUrl: "bannerUrl",
  career_stage: "careerStage", careerStage: "careerStage",
  open_to_opportunities: "openToOpportunities", openToOpportunities: "openToOpportunities",
  show_photo: "showPhoto", showPhoto: "showPhoto",
  allow_connection_requests: "allowConnectionRequests", allowConnectionRequests: "allowConnectionRequests",
  onboarding_completed: "onboardingCompleted", onboardingCompleted: "onboardingCompleted",
  notification_settings: "notificationSettings", notificationSettings: "notificationSettings",
};

const allowed = new Set(["name", "full_name", "fullName", "bio", "industry", "careerStage", "career_stage", "city", "skills", "openToOpportunities", "open_to_opportunities", "avatarUrl", "avatar_url", "bannerUrl", "banner_url", "showPhoto", "show_photo", "allowConnectionRequests", "allow_connection_requests", "onboardingCompleted", "onboarding_completed", "notificationSettings", "notification_settings"]);

export function profileUpdateFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) if (allowed.has(key)) update[fieldMap[key] ?? key] = value;
  return update;
}
