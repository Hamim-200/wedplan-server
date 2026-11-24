export const SERVICE_CATEGORIES = [
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_STATUSES = ["pending", "approved", "rejected"] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const FREE_PLAN_ACTIVE_LIMIT = 3;