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

// Only accept profile images hosted on ImgBB.
const imgbbUrl = z
  .string()
  .url("Image must be a valid URL")
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "ibb.co" || url.hostname.endsWith(".ibb.co"))
      );
    } catch {
      return false;
    }
  }, "Images must be uploaded through WedPlan (ImgBB links only)");

// .strict() rejects any extra field, so sending "role" or "subscriptionPlan" gives a 400.
export const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    image: imgbbUrl.optional(),
    businessName: z.string().trim().min(2, "Business name is too short").max(100).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^(\+?[0-9][0-9\s-]{5,18})?$/, "Enter a valid phone number")
      .optional(),
    bio: z.string().trim().max(300, "Bio must be 300 characters or less").optional(),
  })
  .strict();