export type UserRole = "admin" | "vendor" | "customer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  subscriptionPlan: "free" | "premium";
  subscriptionExpiresAt: Date | null;
}