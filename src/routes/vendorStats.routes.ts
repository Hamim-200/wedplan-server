import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import { vendorStats } from "../controllers/vendorBooking.controller.js";

const router = Router();

router.get("/", verifyJWT, requireRole("vendor"), vendorStats);

export default router;