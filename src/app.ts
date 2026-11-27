import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { stripeWebhook } from "./controllers/webhook.controller.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import vendorServiceRoutes from "./routes/vendorService.routes.js";
import adminServiceRoutes from "./routes/adminService.routes.js";
import publicServiceRoutes from "./routes/publicService.routes.js";
import customerBookingRoutes from "./routes/customerBooking.routes.js";
import vendorBookingRoutes from "./routes/vendorBooking.routes.js";
import vendorStatsRoutes from "./routes/vendorStats.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminUserRoutes from "./routes/adminUser.routes.js";
import adminStatsRoutes from "./routes/adminStats.routes.js";
import adminTransactionRoutes from "./routes/adminTransaction.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(compression());

// The Stripe webhook MUST come before express.json(), because Stripe's signature
// is checked against the raw, unparsed body.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

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

app.use(express.json({ limit: "1mb" }));

// A friendly message for anyone who opens the server link in a browser.
app.get("/", (_req, res) => {
  res.json({
    success: true,
    name: "WedPlan API",
    message: "The WedPlan API server is running. Open the website to use WedPlan.",
    health: "/api/health",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/vendor/services", vendorServiceRoutes);
app.use("/api/admin/services", adminServiceRoutes);
app.use("/api/services", publicServiceRoutes);
app.use("/api/customer/bookings", customerBookingRoutes);
app.use("/api/vendor/bookings", vendorBookingRoutes);
app.use("/api/vendor/stats", vendorStatsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/stats", adminStatsRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;