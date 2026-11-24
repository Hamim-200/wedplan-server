import { z } from "zod";
import { SERVICE_CATEGORIES, SERVICE_STATUSES } from "../constants/service.js";

// Only accept images hosted on ImgBB (https://i.ibb.co/...).
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

export const createServiceSchema = z.object({
  serviceName: z.string().trim().min(3, "Name must be at least 3 characters").max(100),
  category: z.enum(SERVICE_CATEGORIES, { error: "Please choose a valid category" }),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000),
  price: z.coerce.number().positive("Price must be greater than 0").max(10_000_000),
  location: z.string().trim().min(2, "Location is required").max(100),
  images: z.array(imgbbUrl).min(1, "Add at least 1 image").max(4, "Maximum 4 images"),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const availabilitySchema = z.object({ isActive: z.boolean() });

export const adminStatusSchema = z.object({ status: z.enum(SERVICE_STATUSES) });

export const adminServiceQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SERVICE_STATUSES).optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});