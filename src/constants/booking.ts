export const BOOKING_STATUSES = ["pending", "accepted", "rejected", "cancelled"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// A booking in one of these states blocks a duplicate request.
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "accepted"];