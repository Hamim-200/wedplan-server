import { getDB } from "../config/db.js";
import { FREE_PLAN_ACTIVE_LIMIT } from "../constants/service.js";
import type { ServiceDoc } from "../types/service.js";
import { userIdFilter, type UserIdRow } from "../utils/userFilter.js";

const users = () => getDB().collection<UserIdRow>("users");

export async function activatePremium(vendorId: string, expiresAt: Date) {
    await users().updateOne(userIdFilter(vendorId), {
        $set: {
            subscriptionPlan: "premium",
            subscriptionExpiresAt: expiresAt,
            updatedAt: new Date(),
        },
    });
}

// Free vendors keep their 3 oldest active services. The rest become inactive.
export async function enforceFreeLimit(vendorId: string) {
    const services = getDB().collection<ServiceDoc>("services");

    const active = await services
        .find(
            { vendorId, isActive: true, status: { $ne: "rejected" } },
            { projection: { _id: 1 } }
        )
        .sort({ createdAt: 1 })
        .toArray();

    const extra = active.slice(FREE_PLAN_ACTIVE_LIMIT).map((service) => service._id);
    if (extra.length > 0) {
        await services.updateMany(
            { _id: { $in: extra } },
            { $set: { isActive: false, updatedAt: new Date() } }
        );
    }
}

export async function downgradeToFree(vendorId: string) {
    await users().updateOne(userIdFilter(vendorId), {
        $set: {
            subscriptionPlan: "free",
            subscriptionExpiresAt: null,
            updatedAt: new Date(),
        },
    });
    await enforceFreeLimit(vendorId);
}