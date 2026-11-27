import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  cancelSubscription,
  createCheckoutSession,
  getCheckoutResult,
  getSubscription,
} from "../controllers/payment.controller.js";

const router = Router();

// Vendors only. (The webhook is registered separately in app.ts.)
router.use(verifyJWT, requireRole("vendor"));

router.post("/checkout", createCheckoutSession);
router.get("/subscription", getSubscription);
router.post("/cancel", cancelSubscription);
router.get("/session/:sessionId", getCheckoutResult);

export default router;