import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";
import type { UserRole } from "../types/auth.js";

export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to do this"));
    }
    next();
  };
}