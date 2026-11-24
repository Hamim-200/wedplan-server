import type { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { parseObjectId } from "./ids.js";
import { isPremiumActive } from "./premium.js";

export interface VendorSummary {
  id: string;
  name: string;
  image: string | null;
  businessName: string | null;
  isPremium: boolean;
}

// Describes the part of a Better Auth user that we read here.
interface UserRow {
  _id: ObjectId | string;
  name: string;
  image?: string | null;
  businessName?: string | null;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: Date | null;
}

// Adds a safe "vendor" object (no email) to every service in the list.
export async function attachVendors<T extends { vendorId: string }>(
  items: T[]
): Promise<Array<T & { vendor: VendorSummary | null }>> {
  const ids = [...new Set(items.map((item) => item.vendorId))];
  if (ids.length === 0) return [];

  // Better Auth may store _id as ObjectId or string, so we search for both.
  const lookup: Array<ObjectId | string> = ids.flatMap((id) => {
    const oid = parseObjectId(id);
    return oid ? [oid, id] : [id];
  });

  const users = await getDB()
    .collection<UserRow>("users")
    .find(
      { _id: { $in: lookup } },
      {
        projection: {
          name: 1,
          image: 1,
          businessName: 1,
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
        },
      }
    )
    .toArray();

  const map = new Map<string, VendorSummary>();
  for (const u of users) {
    map.set(String(u._id), {
      id: String(u._id),
      name: u.name,
      image: u.image ?? null,
      businessName: u.businessName ?? null,
      isPremium: isPremiumActive({
        subscriptionPlan: u.subscriptionPlan === "premium" ? "premium" : "free",
        subscriptionExpiresAt: u.subscriptionExpiresAt
          ? new Date(u.subscriptionExpiresAt)
          : null,
      }),
    });
  }

  return items.map((item) => ({ ...item, vendor: map.get(item.vendorId) ?? null }));
}