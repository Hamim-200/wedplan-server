import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  cancelMyBooking,
  createBooking,
  customerStats,
  getMyBooking,
  listMyBookings,
} from "../controllers/customerBooking.controller.js";

const router = Router();

router.use(verifyJWT, requireRole("customer"));

router.post("/", createBooking);
router.get("/", listMyBookings);
router.get("/stats", customerStats); // must come before "/:id"
router.get("/:id", getMyBooking);
router.patch("/:id/cancel", cancelMyBooking);

export default router;