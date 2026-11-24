import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Reads ONE file from the form field named "image", max 5 MB, kept in memory.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest("Only JPG, PNG, WEBP or GIF images are allowed"));
    }
  },
}).single("image");