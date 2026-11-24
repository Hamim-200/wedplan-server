import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  acceptBooking,
  listVendorBookings,
  rejectBooking,
} from "../controllers/vendorBooking.controller.js";

const router = Router();

router.use(verifyJWT, requireRole("vendor"));

router.get("/", listVendorBookings);
router.patch("/:id/accept", acceptBooking);
router.patch("/:id/reject", rejectBooking);

export default router;