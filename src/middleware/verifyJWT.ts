import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId, type Document, type Filter } from "mongodb";
import { env } from "../config/env.js";
import { getDB } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { UserRole } from "../types/auth.js";

// Better Auth publishes its public keys here. jose downloads and caches them.
const jwks = createRemoteJWKSet(new URL("/api/auth/jwks", env.BETTER_AUTH_URL));

const VALID_ROLES: UserRole[] = ["admin", "vendor", "customer"];

export const verifyJWT = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length).trim();

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.BETTER_AUTH_URL,
      audience: env.BETTER_AUTH_URL,
    });
    if (typeof payload.id !== "string") throw new Error("Token has no user id");
    userId = payload.id;
  } catch {
    // Covers bad signature, expired token, wrong issuer, garbage text.
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const filter: Filter<Document> = ObjectId.isValid(userId)
    ? { _id: new ObjectId(userId) }
    : { _id: userId as unknown as ObjectId };

  const user = await getDB().collection("users").findOne(filter);
  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (user.isBlocked === true) {
    throw ApiError.forbidden("Your account has been blocked");
  }

  const role: UserRole = VALID_ROLES.includes(user.role) ? user.role : "customer";

  req.user = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role,
    isBlocked: false,
    subscriptionPlan: user.subscriptionPlan === "premium" ? "premium" : "free",
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
  };

  next();
});