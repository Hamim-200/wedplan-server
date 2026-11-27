import { z } from "zod";
import { TRANSACTION_STATUSES } from "../constants/transaction.js";

export const userQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(["admin", "vendor", "customer"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const transactionQuerySchema = z.object({
  status: z.enum(TRANSACTION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});