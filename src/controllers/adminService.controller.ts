import type { Filter } from "mongodb";
import { getDB } from "../config/db.js";
import type { ServiceDoc } from "../types/service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex, parseObjectId } from "../utils/ids.js";
import { attachVendors } from "../utils/vendors.js";
import {
  adminServiceQuerySchema,
  adminStatusSchema,
} from "../validators/service.schemas.js";

const services = () => getDB().collection<ServiceDoc>("services");

export const listAllServices = asyncHandler(async (req, res) => {
  const query = adminServiceQuerySchema.parse(req.query);

  const filter: Filter<ServiceDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ serviceName: regex }, { location: regex }];
  }

  const [items, total] = await Promise.all([
    services()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    services().countDocuments(filter),
  ]);

  res.json({
    success: true,
    services: await attachVendors(items),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

export const setServiceStatus = asyncHandler(async (req, res) => {
  const { status } = adminStatusSchema.parse(req.body);
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Service not found");

  const updated = await services().findOneAndUpdate(
    { _id: oid },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!updated) throw ApiError.notFound("Service not found");

  res.json({ success: true, message: `Service marked as ${status}`, service: updated });
});

export const deleteAnyService = asyncHandler(async (req, res) => {
  const oid = parseObjectId(String(req.params.id));
  if (!oid) throw ApiError.notFound("Service not found");

  const result = await services().deleteOne({ _id: oid });
  if (result.deletedCount === 0) throw ApiError.notFound("Service not found");

  res.json({ success: true, message: "Service deleted" });
});