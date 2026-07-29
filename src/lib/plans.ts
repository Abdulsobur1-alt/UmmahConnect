export function isPremiumPlan(plan: string | null | undefined) {
  return plan === "pro" || plan === "sponsor";
}

export function isFreePlan(plan: string | null | undefined) {
  return !isPremiumPlan(plan);
}
