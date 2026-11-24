import type { ObjectId } from "mongodb";
import type { BookingStatus } from "../constants/booking.js";

export interface BookingDoc {
  _id?: ObjectId;
  serviceId: string;
  vendorId: string;
  customerId: string;
  eventDate: Date;
  eventLocation: string;
  message: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}