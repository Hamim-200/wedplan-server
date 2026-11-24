import type { Filter } from "mongodb";
import { getDB } from "../config/db.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/booking.js";
import type { BookingDoc } from "../types/booking.js";
import type { ServiceDoc } from "../types/service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { enrichBookings } from "../utils/bookingViews.js";
import { parseObjectId } from "../utils/ids.js";
import { getUser } from "../utils/requestUser.js";
import { bookingQuerySchema, createBookingSchema } from "../validators/booking.schemas.js";

const bookings = () => getDB().collection<BookingDoc>("bookings");
const services = () => getDB().collection<ServiceDoc>("services");

export const createBooking = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const data = createBookingSchema.parse(req.body);

  const serviceOid = parseObjectId(data.serviceId);
  if (!serviceOid) throw ApiError.notFound("Service not found");

  const service = await services().findOne({ _id: serviceOid });
  if (!service || service.status !== "approved" || !service.isActive) {
    throw ApiError.notFound("This service is not available for booking");
  }

  if (service.vendorId === user.id) {
    throw ApiError.forbidden("You cannot book your own service");
  }

  // Event date must be today or later (compared in UTC).
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (data.eventDate < todayUtc) {
    throw ApiError.badRequest("Event date cannot be in the past");
  }

  const duplicate = await bookings().findOne({
    serviceId: data.serviceId,
    customerId: user.id,
    eventDate: data.eventDate,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (duplicate) {
    throw ApiError.conflict(
      "You already have an active booking request for this service on that date"
    );
  }

  const doc: BookingDoc = {
    serviceId: data.serviceId,
    vendorId: service.vendorId, // taken from the service, never from the client
    customerId: user.id, // taken from the verified token, never from the client
    eventDate: data.eventDate,
    eventLocation: data.eventLocation,
    message: data.message,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const result = await bookings().insertOne(doc);

  res.status(201).json({
    success: true,
    message: "Booking request sent to the vendor",
    booking: { ...doc, _id: result.insertedId },
  });
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const query = bookingQuerySchema.parse(req.query);

  const filter: Filter<BookingDoc> = { customerId: user.id };
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
    bookings: await enrichBookings(items, { includeCustomer: false }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

export const getMyBooking = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Booking not found");

  const booking = await bookings().findOne({ _id: oid });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.customerId !== user.id) {
    throw ApiError.forbidden("You can only view your own bookings");
  }

  const [view] = await enrichBookings([booking], { includeCustomer: false });
  res.json({ success: true, booking: view });
});

export const cancelMyBooking = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Booking not found");

  // One atomic step: it must be MY booking AND still pending.
  const updated = await bookings().findOneAndUpdate(
    { _id: oid, customerId: user.id, status: "pending" },
    { $set: { status: "cancelled", updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    // Work out why, so the message is accurate.
    const existing = await bookings().findOne({ _id: oid });
    if (!existing) throw ApiError.notFound("Booking not found");
    if (existing.customerId !== user.id) {
      throw ApiError.forbidden("You can only cancel your own bookings");
    }
    throw ApiError.conflict(`This booking is already ${existing.status} and cannot be cancelled`);
  }

  res.json({ success: true, message: "Booking cancelled", booking: updated });
});

export const customerStats = asyncHandler(async (req, res) => {
  const user = getUser(req);

  const rows = await bookings()
    .aggregate<{ _id: string; count: number }>([
      { $match: { customerId: user.id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const by = new Map(rows.map((r) => [r._id, r.count]));
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  res.json({
    success: true,
    stats: {
      total,
      pending: by.get("pending") ?? 0,
      accepted: by.get("accepted") ?? 0,
      rejected: by.get("rejected") ?? 0,
      cancelled: by.get("cancelled") ?? 0,
    },
  });
});