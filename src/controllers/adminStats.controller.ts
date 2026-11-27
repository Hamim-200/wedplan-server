import { getDB } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminStats = asyncHandler(async (_req, res) => {
  const db = getDB();
  const users = db.collection("users");
  const services = db.collection("services");
  const transactions = db.collection("transactions");

  const [
    totalUsers,
    totalVendors,
    totalCustomers,
    totalServices,
    pendingServices,
    approvedServices,
    rejectedServices,
    totalTransactions,
    revenueRows,
  ] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ role: "vendor" }),
    users.countDocuments({ role: "customer" }),
    services.countDocuments({}),
    services.countDocuments({ status: "pending" }),
    services.countDocuments({ status: "approved" }),
    services.countDocuments({ status: "rejected" }),
    transactions.countDocuments({}),
    transactions
      .aggregate<{ _id: null; total: number }>([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray(),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      approvedServices,
      rejectedServices,
      totalTransactions,
      revenueCents: revenueRows[0]?.total ?? 0,
    },
  });
});