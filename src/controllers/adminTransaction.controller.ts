import type { Filter } from "mongodb";
import { getDB } from "../config/db.js";
import type { TransactionDoc } from "../types/transaction.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { attachVendors } from "../utils/vendors.js";
import { transactionQuerySchema } from "../validators/admin.schemas.js";

const transactions = () => getDB().collection<TransactionDoc>("transactions");

// Read-only on purpose: there is no route that can change a payment record.
export const listTransactions = asyncHandler(async (req, res) => {
  const query = transactionQuerySchema.parse(req.query);

  const filter: Filter<TransactionDoc> = {};
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    transactions()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    transactions().countDocuments(filter),
  ]);

  res.json({
    success: true,
    transactions: await attachVendors(items),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});