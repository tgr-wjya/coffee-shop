import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/types";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: getEnv("DATABASE_URL"),
	},
});
