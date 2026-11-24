import { ObjectId } from "mongodb";

// Returns an ObjectId if the text is a valid 24-character id, otherwise null.
export function parseObjectId(id: string): ObjectId | null {
  return /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

// Makes user text safe to use inside a MongoDB regex search.
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}