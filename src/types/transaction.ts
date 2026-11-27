import type { ObjectId } from "mongodb";
import type { TransactionStatus } from "../constants/transaction.js";

export interface TransactionDoc {
  _id?: ObjectId;
  vendorId: string;
  plan: string;
  amount: number; // in cents
  currency: string;
  stripeSessionId: string;
  stripeSubscriptionId: string | null;
  status: TransactionStatus;
  createdAt: Date;
}