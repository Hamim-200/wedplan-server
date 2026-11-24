import type { Request } from "express";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "./ApiError.js";

// After verifyJWT runs, req.user exists. This gives TypeScript a guaranteed value.
export function getUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}