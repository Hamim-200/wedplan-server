import type { ObjectId } from "mongodb";
import type { ServiceCategory, ServiceStatus } from "../constants/service.js";

export interface ServiceDoc {
  _id?: ObjectId;
  vendorId: string;
  serviceName: string;
  category: ServiceCategory;
  description: string;
  price: number;
  location: string;
  images: string[];
  status: ServiceStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}