import { Router } from "express";
import { getDB } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    await getDB().command({ ping: 1 });
    res.json({
      success: true,
      message: "WedPlan API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;