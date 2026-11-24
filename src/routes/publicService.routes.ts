import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import {
  browseServices,
  categoryCounts,
  featuredServices,
  getServiceDetails,
  locationList,
} from "../controllers/publicService.controller.js";

const router = Router();

// Public (no login)
router.get("/", browseServices);
router.get("/featured", featuredServices);
router.get("/categories", categoryCounts);
router.get("/locations", locationList);

// Private (login required). Keep this LAST so "/featured" is not read as an id.
router.get("/:id", verifyJWT, getServiceDetails);

export default router;