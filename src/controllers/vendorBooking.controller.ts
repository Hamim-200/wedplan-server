import type { Filter } from "mongodb";
import { getDB } from "../config/db.js";
import type { BookingDoc } from "../types/booking.js";
import type { ServiceDoc } from "../types/service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { enrichBookings } from "../utils/bookingViews.js";
import { parseObjectId } from "../utils/ids.js";
import { isPremiumActive } from "../utils/premium.js";
import { getUser } from "../utils/requestUser.js";
import { bookingQuerySchema } from "../validators/booking.schemas.js";
import type { Request } from "express";

const bookings = () => getDB().collection<BookingDoc>("bookings");
const services = () => getDB().collection<ServiceDoc>("services");

export const listVendorBookings = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const query = bookingQuerySchema.parse(req.query);

  const filter: Filter<BookingDoc> = { vendorId: user.id };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    bookings()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    bookings().countDocuments(filter),
  ]);

  res.json({
    success: true,
    bookings: await enrichBookings(items, { includeCustomer: true }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

// Shared by accept and reject.
async function decide(req: Request, status: "accepted" | "rejected") {
  const user = getUser(req);
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Booking not found");

  // One atomic step: it must be MY booking AND still pending.
  const updated = await bookings().findOneAndUpdate(
    { _id: oid, vendorId: user.id, status: "pending" },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    const existing = await bookings().findOne({ _id: oid });
    if (!existing) throw ApiError.notFound("Booking not found");
    if (existing.vendorId !== user.id) {
      throw ApiError.forbidden("You can only manage booking requests for your own services");
    }
    throw ApiError.conflict(`This request was already ${existing.status}`);
  }

  return updated;
}

export const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await decide(req, "accepted");
  res.json({ success: true, message: "Booking accepted", booking });
});

export const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await decide(req, "rejected");
  res.json({ success: true, message: "Booking rejected", booking });
});

export const vendorStats = asyncHandler(async (req, res) => {
  const user = getUser(req);

  const [totalServices, activeServices, pendingBookings, acceptedBookings] = await Promise.all([
    services().countDocuments({ vendorId: user.id }),
    services().countDocuments({ vendorId: user.id, status: "approved", isActive: true }),
    bookings().countDocuments({ vendorId: user.id, status: "pending" }),
    bookings().countDocuments({ vendorId: user.id, status: "accepted" }),
  ]);

  const premium = isPremiumActive(user);

  res.json({
    success: true,
    stats: {
      totalServices,
      activeServices,
      pendingBookings,
      acceptedBookings,
      subscriptionPlan: premium ? "premium" : "free",
      subscriptionExpiresAt: premium ? user.subscriptionExpiresAt : null,
    },
  });
});