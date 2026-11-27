import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import { adminStats } from "../controllers/adminStats.controller.js";

const router = Router();

router.get("/", verifyJWT, requireRole("admin"), adminStats);

export default router;