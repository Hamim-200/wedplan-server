import type { Filter, Sort } from "mongodb";
import { getDB } from "../config/db.js";
import { SERVICE_CATEGORIES } from "../constants/service.js";
import type { ServiceDoc } from "../types/service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex, parseObjectId } from "../utils/ids.js";
import { getUser } from "../utils/requestUser.js";
import { attachVendors } from "../utils/vendors.js";
import { browseQuerySchema, featuredQuerySchema } from "../validators/browse.schemas.js";

const services = () => getDB().collection<ServiceDoc>("services");

const PUBLIC_FILTER = { status: "approved", isActive: true } as const;

const SORTS: Record<string, Sort> = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
};

export const browseServices = asyncHandler(async (req, res) => {
  const q = browseQuerySchema.parse(req.query);

  const filter: Filter<ServiceDoc> = { ...PUBLIC_FILTER };

  if (q.category) filter.category = q.category;
  if (q.location) {
    filter.location = new RegExp(escapeRegex(q.location), "i");
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {
      ...(q.minPrice !== undefined ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { $lte: q.maxPrice } : {}),
    };
  }
  if (q.search) {
    const regex = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [
      { serviceName: regex },
      { description: regex },
      { location: regex },
      { category: regex },
    ];
  }

  const [items, total] = await Promise.all([
    services()
      .find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .toArray(),
    services().countDocuments(filter),
  ]);

  res.json({
    success: true,
    services: await attachVendors(items),
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  });
});

export const featuredServices = asyncHandler(async (req, res) => {
  const { limit } = featuredQuerySchema.parse(req.query);
  const items = await services()
    .find(PUBLIC_FILTER)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  res.json({ success: true, services: await attachVendors(items) });
});

export const categoryCounts = asyncHandler(async (_req, res) => {
  const rows = await services()
    .aggregate<{ _id: string; count: number }>([
      { $match: PUBLIC_FILTER },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts = new Map(rows.map((r) => [r._id, r.count]));
  res.json({
    success: true,
    categories: SERVICE_CATEGORIES.map((name) => ({
      name,
      count: counts.get(name) ?? 0,
    })),
  });
});

export const locationList = asyncHandler(async (_req, res) => {
  const locations = await services().distinct("location", PUBLIC_FILTER);
  locations.sort((a, b) => a.localeCompare(b));
  res.json({ success: true, locations });
});

// Needs login. Hidden services return 404 unless the viewer owns it or is admin.
export const getServiceDetails = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Service not found");

  const service = await services().findOne({ _id: oid });
  if (!service) throw ApiError.notFound("Service not found");

  const isPublic = service.status === "approved" && service.isActive;
  const canPreview = user.role === "admin" || service.vendorId === user.id;
  if (!isPublic && !canPreview) throw ApiError.notFound("Service not found");

  const [withVendor] = await attachVendors([service]);

  res.json({
    success: true,
    service: withVendor,
    // Tells the frontend whether to show the booking form.
    bookable: isPublic && user.role === "customer",
  });
});