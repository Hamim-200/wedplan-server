import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import meRoutes from "./routes/me.routes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  })
);

// NOTE: the Stripe webhook route (added in Phase 12) must be registered
// BEFORE this line, because Stripe needs the raw request body.
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/me", meRoutes); // temporary test routes, removed later

app.use(notFoundHandler);
app.use(errorHandler);

export default app;