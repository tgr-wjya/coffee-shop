import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "../types";

const client = postgres(getEnv("DATABASE_URL"));
export const db = drizzle(client);
