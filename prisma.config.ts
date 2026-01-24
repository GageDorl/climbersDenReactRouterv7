import "dotenv/config"; // Optional: automatically loads .env file variables
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"), // Use the env() helper to reference the environment variable
  },
});
