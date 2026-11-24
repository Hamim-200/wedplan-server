import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { ensureIndexes } from "./config/indexes.js";

async function start() {
  await connectDB();

  // A failed index build should not stop the API from starting.
  await ensureIndexes().catch((err) => {
    console.error("Could not create indexes:", err);
  });

  app.listen(env.PORT, () => {
    console.log(`WedPlan server running on http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});