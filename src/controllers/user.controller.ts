import { ObjectId, type Filter } from "mongodb";
import { getDB } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseObjectId } from "../utils/ids.js";
import { getUser } from "../utils/requestUser.js";
import { onboardingSchema, profileSchema } from "../validators/user.schemas.js";

export const completeOnboarding = asyncHandler(async (req, res) => {
  const user = getUser(req);

  if (user.role === "admin") {
    throw ApiError.forbidden("Admin accounts do not need this step");
  }

  const { role, businessName } = onboardingSchema.parse(req.body);

  const users = getDB().collection("users");
  const filter = ObjectId.isValid(user.id)
    ? { _id: new ObjectId(user.id) }
    : { _id: user.id as unknown as ObjectId };

  const existing = await users.findOne(filter);
  if (!existing) throw ApiError.notFound("User not found");

  // The role can be chosen only once, and only for brand new accounts.
  if (existing.roleSelected !== false) {
    throw ApiError.conflict("Your account type has already been chosen");
  }

  await users.updateOne(filter, {
    $set: {
      role,
      roleSelected: true,
      ...(role === "vendor" ? { businessName } : {}),
      updatedAt: new Date(),
    },
  });

  res.json({ success: true, message: "Account type saved", role });
});

// ---------- Profile ----------

interface UserRow {
  _id: ObjectId | string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  businessName?: string | null;
  phone?: string | null;
  bio?: string | null;
  subscriptionPlan?: string;
  updatedAt?: Date;
}

const profiles = () => getDB().collection<UserRow>("users");

function idFilter(id: string): Filter<UserRow> {
  const oid = parseObjectId(id);
  const ids: Array<ObjectId | string> = oid ? [oid, id] : [id];
  return { _id: { $in: ids } };
}

function toProfile(u: UserRow) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: u.role ?? "customer",
    businessName: u.businessName ?? null,
    phone: u.phone ?? null,
    bio: u.bio ?? null,
  };
}

export const getMyProfile = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const row = await profiles().findOne(idFilter(user.id));
  if (!row) throw ApiError.notFound("User not found");
  res.json({ success: true, profile: toProfile(row) });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const data = profileSchema.parse(req.body);

  if (user.role === "vendor" && data.businessName === undefined) {
    throw ApiError.badRequest("Business name is required for vendors");
  }

  // Only these fields can ever change. Role, block status and plan are never touched.
  const changes: Partial<UserRow> = { name: data.name, updatedAt: new Date() };
  if (data.image !== undefined) changes.image = data.image;
  if (data.phone !== undefined) changes.phone = data.phone;
  if (data.bio !== undefined) changes.bio = data.bio;
  if (user.role === "vendor") changes.businessName = data.businessName;

  await profiles().updateOne(idFilter(user.id), { $set: changes });

  const updated = await profiles().findOne(idFilter(user.id));
  if (!updated) throw ApiError.notFound("User not found");

  res.json({ success: true, message: "Profile updated", profile: toProfile(updated) });
});