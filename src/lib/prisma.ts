import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
  pgPool: Pool | undefined;
};

// max baixo de propósito: em serverless (Vercel), cada instância que sobe
// sob concorrência cria seu próprio Pool — sem limite aqui, um pico de
// acessos simultâneos multiplica instâncias × 10 conexões (padrão do pg) e
// estoura o teto de conexões do Postgres. Mesmo raciocínio do extras-app.
const pool =
  globalForPrisma.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

pool.on("error", (err) => {
  console.error("Erro numa conexão ociosa do pool do Postgres:", err);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
