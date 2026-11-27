import type { Filter, ObjectId } from "mongodb";
import { parseObjectId } from "./ids.js";

// Describes the only part of a user document that we filter on.
export interface UserIdRow {
    _id: ObjectId | string;
}

// Better Auth may store _id as ObjectId or string, so we match both.
export function userIdFilter(id: string): Filter<UserIdRow> {
    const oid = parseObjectId(id);
    const ids: Array<ObjectId | string> = oid ? [oid, id] : [id];
    return { _id: { $in: ids } };
}