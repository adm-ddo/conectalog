import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations rodam contra a conexão direta (sem pooler) — o pooler do
// Neon roda em modo transaction, que não suporta os advisory locks que o
// `prisma migrate` usa. O app em si (src/lib/prisma.ts) usa a conexão com
// pooler via DATABASE_URL, separadamente.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"],
  },
});
