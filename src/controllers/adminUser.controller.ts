import type { Filter, ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex, parseObjectId } from "../utils/ids.js";
import { getUser } from "../utils/requestUser.js";
import { userQuerySchema } from "../validators/admin.schemas.js";
import type { Request } from "express";

interface UserDoc {
  _id: ObjectId | string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  isBlocked?: boolean;
  roleSelected?: boolean;
  businessName?: string | null;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: Date | null;
  createdAt?: Date;
}

const users = () => getDB().collection<UserDoc>("users");

// Better Auth may store _id as ObjectId or string, so we match both.
function idFilter(id: string): Filter<UserDoc> {
  const oid = parseObjectId(id);
  return { _id: { $in: oid ? [oid, id] : [id] } };
}

function toSafeUser(u: UserDoc) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: u.role ?? "customer",
    isBlocked: u.isBlocked === true,
    businessName: u.businessName ?? null,
    subscriptionPlan: u.subscriptionPlan ?? "free",
    subscriptionExpiresAt: u.subscriptionExpiresAt ?? null,
    createdAt: u.createdAt ?? null,
  };
}

const PROJECTION = {
  name: 1,
  email: 1,
  image: 1,
  role: 1,
  isBlocked: 1,
  businessName: 1,
  subscriptionPlan: 1,
  subscriptionExpiresAt: 1,
  createdAt: 1,
} as const;

export const listUsers = asyncHandler(async (req, res) => {
  const query = userQuerySchema.parse(req.query);

  const filter: Filter<UserDoc> = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    users()
      .find(filter, { projection: PROJECTION })
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    users().countDocuments(filter),
  ]);

  res.json({
    success: true,
    users: items.map(toSafeUser),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const user = await users().findOne(idFilter(String(req.params.id)), {
    projection: PROJECTION,
  });
  if (!user) throw ApiError.notFound("User not found");

  const id = String(user._id);
  const db = getDB();
  const role = user.role ?? "customer";

  let servicesCount = 0;
  let bookingsCount = 0;
  if (role === "vendor") {
    [servicesCount, bookingsCount] = await Promise.all([
      db.collection("services").countDocuments({ vendorId: id }),
      db.collection("bookings").countDocuments({ vendorId: id }),
    ]);
  } else if (role === "customer") {
    bookingsCount = await db.collection("bookings").countDocuments({ customerId: id });
  }

  res.json({
    success: true,
    user: toSafeUser(user),
    stats: { services: servicesCount, bookings: bookingsCount },
  });
});

async function setBlocked(req: Request, blocked: boolean) {
  const admin = getUser(req);
  const target = await users().findOne(idFilter(String(req.params.id)));
  if (!target) throw ApiError.notFound("User not found");

  if (String(target._id) === admin.id) {
    throw ApiError.badRequest("You cannot block your own account");
  }
  if (target.role === "admin") {
    throw ApiError.forbidden("Admin accounts cannot be blocked");
  }

  await users().updateOne(
    { _id: target._id },
    { $set: { isBlocked: blocked, updatedAt: new Date() } }
  );
  return target;
}

export const blockUser = asyncHandler(async (req, res) => {
  await setBlocked(req, true);
  res.json({ success: true, message: "User blocked" });
});

export const unblockUser = asyncHandler(async (req, res) => {
  await setBlocked(req, false);
  res.json({ success: true, message: "User unblocked" });
});