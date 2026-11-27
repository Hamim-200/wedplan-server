export const TRANSACTION_STATUSES = ["pending", "paid", "failed", "cancelled"] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];