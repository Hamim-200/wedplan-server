import { z } from "zod";
import { SERVICE_CATEGORIES } from "../constants/service.js";

export const browseQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  location: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9),
});

export const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});