import type { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import type { BookingDoc } from "../types/booking.js";
import type { ServiceDoc } from "../types/service.js";
import { parseObjectId } from "./ids.js";
import { attachVendors, type VendorSummary } from "./vendors.js";

export interface ServiceSummary {
  id: string;
  serviceName: string;
  category: string;
  price: number;
  location: string;
  image: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CustomerRow {
  _id: ObjectId | string;
  name: string;
  email: string;
  image?: string | null;
}

export type BookingView = BookingDoc & {
  service: ServiceSummary | null;
  vendor: VendorSummary | null;
  customer: CustomerSummary | null;
};

export async function enrichBookings(
  items: BookingDoc[],
  options: { includeCustomer: boolean }
): Promise<BookingView[]> {
  if (items.length === 0) return [];

  // 1. Services
  const serviceOids = [...new Set(items.map((b) => b.serviceId))]
    .map((id) => parseObjectId(id))
    .filter((oid): oid is ObjectId => oid !== null);

  const serviceRows = await getDB()
    .collection<ServiceDoc>("services")
    .find({ _id: { $in: serviceOids } })
    .toArray();

  const serviceMap = new Map<string, ServiceSummary>();
  for (const s of serviceRows) {
    serviceMap.set(String(s._id), {
      id: String(s._id),
      serviceName: s.serviceName,
      category: s.category,
      price: s.price,
      location: s.location,
      image: s.images[0] ?? null,
    });
  }

  // 2. Vendors (safe info, no email)
  const withVendors = await attachVendors(items);

  // 3. Customers (only when the viewer is the vendor)
  const customerMap = new Map<string, CustomerSummary>();
  if (options.includeCustomer) {
    const ids = [...new Set(items.map((b) => b.customerId))];
    const lookup: Array<ObjectId | string> = ids.flatMap((id) => {
      const oid = parseObjectId(id);
      return oid ? [oid, id] : [id];
    });

    const rows = await getDB()
      .collection<CustomerRow>("users")
      .find(
        { _id: { $in: lookup } },
        { projection: { name: 1, email: 1, image: 1 } }
      )
      .toArray();

    for (const u of rows) {
      customerMap.set(String(u._id), {
        id: String(u._id),
        name: u.name,
        email: u.email,
        image: u.image ?? null,
      });
    }
  }

  return withVendors.map((b) => ({
    ...b,
    service: serviceMap.get(b.serviceId) ?? null,
    customer: customerMap.get(b.customerId) ?? null,
  }));
}