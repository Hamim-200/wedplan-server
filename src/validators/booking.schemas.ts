import { z } from "zod";
import { BOOKING_STATUSES } from "../constants/booking.js";

// "2026-12-25" -> a Date at midnight UTC. Rejects impossible dates like 2026-02-31.
const eventDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD")
  .refine((value) => {
    const d = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }, "Please enter a real date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  eventDate,
  eventLocation: z.string().trim().min(3, "Event location is required").max(150),
  message: z.string().trim().max(1000, "Message is too long").default(""),
});

export const bookingQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});