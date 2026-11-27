import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import { listTransactions } from "../controllers/adminTransaction.controller.js";

const router = Router();

router.get("/", verifyJWT, requireRole("admin"), listTransactions);

export default router;