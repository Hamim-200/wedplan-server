import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import {
  completeOnboarding,
  getMyProfile,
  updateMyProfile,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/me/onboarding", verifyJWT, completeOnboarding);
router.get("/me", verifyJWT, getMyProfile);
router.patch("/me", verifyJWT, updateMyProfile);

export default router;