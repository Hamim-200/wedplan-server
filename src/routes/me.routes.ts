import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get("/", verifyJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get("/admin-only", verifyJWT, requireRole("admin"), (_req, res) => {
  res.json({ success: true, message: "Hello admin" });
});

router.get("/vendor-only", verifyJWT, requireRole("vendor"), (_req, res) => {
  res.json({ success: true, message: "Hello vendor" });
});

export default router;