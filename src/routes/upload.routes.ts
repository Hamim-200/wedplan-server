import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { imageUpload } from "../middleware/upload.js";
import { uploadToImgbb } from "../utils/imgbb.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const uploadHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please choose an image file (form field name: "image")');
  }
  const url = await uploadToImgbb(req.file.buffer, req.file.originalname);
  res.status(201).json({ success: true, url });
});

// Logged-in users (service images, profile images).
router.post("/", verifyJWT, imageUpload, uploadHandler);

// Sign-up page: the person has no account yet, so this route is public.
// It has a strict limit so nobody can abuse it.
const avatarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads, please try again later." },
});

router.post("/avatar", avatarLimiter, imageUpload, uploadHandler);

export default router;