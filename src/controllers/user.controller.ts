import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUser } from "../utils/requestUser.js";
import { onboardingSchema } from "../validators/user.schemas.js";

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