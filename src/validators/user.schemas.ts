import { z } from "zod";

export const onboardingSchema = z
  .object({
    role: z.enum(["vendor", "customer"], { error: "Please choose Vendor or Customer" }),
    businessName: z.string().trim().min(2, "Business name is too short").max(100).optional(),
  })
  .refine((data) => data.role !== "vendor" || Boolean(data.businessName), {
    message: "Business name is required for vendors",
    path: ["businessName"],
  });