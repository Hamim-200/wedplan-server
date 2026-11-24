import type { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/booking.js";
import { FREE_PLAN_ACTIVE_LIMIT } from "../constants/service.js";
import type { AuthUser } from "../types/auth.js";
import type { BookingDoc } from "../types/booking.js";
import type { ServiceDoc } from "../types/service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseObjectId } from "../utils/ids.js";
import { isPremiumActive } from "../utils/premium.js";
import { getUser } from "../utils/requestUser.js";
import {
  availabilitySchema,
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.schemas.js";

const services = () => getDB().collection<ServiceDoc>("services");
const bookings = () => getDB().collection<BookingDoc>("bookings");

// Free vendors may have at most 3 active (non-rejected) services.
async function assertWithinPlanLimit(user: AuthUser, excludeId?: ObjectId) {
  if (isPremiumActive(user)) return;

  const count = await services().countDocuments({
    vendorId: user.id,
    isActive: true,
    status: { $ne: "rejected" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

  if (count >= FREE_PLAN_ACTIVE_LIMIT) {
    throw ApiError.forbidden(
      `Free plan allows up to ${FREE_PLAN_ACTIVE_LIMIT} active services. Upgrade to Premium to publish more.`
    );
  }
}

// Finds a service and makes sure it belongs to this vendor (404 or 403 otherwise).
async function findOwnedService(idParam: string, user: AuthUser) {
  const oid = parseObjectId(idParam);
  if (!oid) throw ApiError.notFound("Service not found");

  const service = await services().findOne({ _id: oid });
  if (!service) throw ApiError.notFound("Service not found");
  if (service.vendorId !== user.id) {
    throw ApiError.forbidden("You can only manage your own services");
  }
  return service;
}

export const createService = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const data = createServiceSchema.parse(req.body);

  await assertWithinPlanLimit(user);

  const now = new Date();
  const doc: ServiceDoc = {
    vendorId: user.id,
    ...data,
    status: "pending",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await services().insertOne(doc);

  res.status(201).json({
    success: true,
    message: "Service submitted and is waiting for admin approval",
    service: { ...doc, _id: result.insertedId },
  });
});

export const listMyServices = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const list = await services().find({ vendorId: user.id }).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, count: list.length, services: list });
});

export const getMyService = asyncHandler(async (req, res) => {
  const service = await findOwnedService(String(req.params.id), getUser(req));
  res.json({ success: true, service });
});

export const updateMyService = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const service = await findOwnedService(String(req.params.id), user);
  const changes = updateServiceSchema.parse(req.body);

  // Any edit goes back to the admin for review.
  const updated = await services().findOneAndUpdate(
    { _id: service._id },
    { $set: { ...changes, status: "pending", updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  res.json({
    success: true,
    message: "Service updated and sent for admin review",
    service: updated,
  });
});

export const setAvailability = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const { isActive } = availabilitySchema.parse(req.body);
  const service = await findOwnedService(String(req.params.id), user);

  if (isActive && service.status !== "rejected") {
    await assertWithinPlanLimit(user, service._id);
  }

  const updated = await services().findOneAndUpdate(
    { _id: service._id },
    { $set: { isActive, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  res.json({
    success: true,
    message: isActive ? "Service is now active" : "Service is now inactive",
    service: updated,
  });
});

export const deleteMyService = asyncHandler(async (req, res) => {
  const service = await findOwnedService(String(req.params.id), getUser(req));

  const activeBookings = await bookings().countDocuments({
    serviceId: String(service._id),
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (activeBookings > 0) {
    throw ApiError.conflict(
      "This service has pending or accepted bookings. Handle those first, or set the service to inactive instead."
    );
  }

  await services().deleteOne({ _id: service._id });
  res.json({ success: true, message: "Service deleted" });
});