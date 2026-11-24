import { MongoClient, type Db } from "mongodb";
import { env } from "./env.js";

const client = new MongoClient(env.MONGODB_URI);

let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  await client.connect();
  db = client.db(env.DB_NAME);
  console.log(`MongoDB connected to database "${env.DB_NAME}"`);
  return db;
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
}