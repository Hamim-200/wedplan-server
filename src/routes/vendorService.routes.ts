import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createService,
  deleteMyService,
  getMyService,
  listMyServices,
  setAvailability,
  updateMyService,
} from "../controllers/vendorService.controller.js";

const router = Router();

// Every route in this file: logged in + vendor only.
router.use(verifyJWT, requireRole("vendor"));

router.post("/", createService);
router.get("/", listMyServices);
router.get("/:id", getMyService);
router.patch("/:id", updateMyService);
router.patch("/:id/availability", setAvailability);
router.delete("/:id", deleteMyService);

export default router;