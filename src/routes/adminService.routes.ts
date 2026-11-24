import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  deleteAnyService,
  listAllServices,
  setServiceStatus,
} from "../controllers/adminService.controller.js";

const router = Router();

router.use(verifyJWT, requireRole("admin"));

router.get("/", listAllServices);
router.patch("/:id/status", setServiceStatus);
router.delete("/:id", deleteAnyService);

export default router;