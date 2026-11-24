import type { AuthUser } from "../types/auth.js";

// A vendor is Premium only if the plan is "premium" AND it has not expired.
export function isPremiumActive(
  user: Pick<AuthUser, "subscriptionPlan" | "subscriptionExpiresAt">
): boolean {
  return (
    user.subscriptionPlan === "premium" &&
    user.subscriptionExpiresAt !== null &&
    new Date(user.subscriptionExpiresAt) > new Date()
  );
}