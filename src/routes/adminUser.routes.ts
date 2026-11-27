import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  blockUser,
  getUserDetails,
  listUsers,
  unblockUser,
} from "../controllers/adminUser.controller.js";

const router = Router();

router.use(verifyJWT, requireRole("admin"));

router.get("/", listUsers);
router.get("/:id", getUserDetails);
router.patch("/:id/block", blockUser);
router.patch("/:id/unblock", unblockUser);

export default router;