import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { completeOnboarding } from "../controllers/user.controller.js";

const router = Router();

router.post("/me/onboarding", verifyJWT, completeOnboarding);

export default router;