import { getDB } from "./db.js";

export async function ensureIndexes() {
  const db = getDB();

  await db.collection("services").createIndexes([
    { key: { status: 1, isActive: 1, createdAt: -1 }, name: "public_newest" },
    { key: { status: 1, isActive: 1, category: 1 }, name: "public_category" },
    { key: { status: 1, isActive: 1, price: 1 }, name: "public_price" },
    { key: { vendorId: 1, createdAt: -1 }, name: "vendor_services" },
  ]);

  await db.collection("bookings").createIndexes([
    { key: { customerId: 1, createdAt: -1 }, name: "customer_bookings" },
    { key: { vendorId: 1, createdAt: -1 }, name: "vendor_bookings" },
    { key: { vendorId: 1, status: 1 }, name: "vendor_status" },
    {
      key: { serviceId: 1, customerId: 1, eventDate: 1 },
      name: "duplicate_check",
    },
  ]);

  await db.collection("transactions").createIndexes([
    // One transaction per Checkout session, so a repeated webhook can never create a duplicate.
    { key: { stripeSessionId: 1 }, name: "unique_session", unique: true },
    { key: { vendorId: 1, createdAt: -1 }, name: "vendor_transactions" },
  ]);

  console.log("MongoDB indexes are ready");
}