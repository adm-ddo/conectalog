import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Cria a Empresa (cooperativa) inicial + o primeiro Usuario MASTER, a
// partir das envs — mesmo espírito do seed-master.ts do extras-app.
// Constrói o próprio PrismaClient (em vez de importar src/lib/prisma.ts)
// e usa bcrypt direto (em vez de src/lib/senha.ts, que tem `server-only`)
// pelo mesmo motivo do extras-app: evitar o alias "@/" e o guard de
// `server-only` num script Node puro rodado via tsx.

const nomeEmpresa = process.env.EMPRESA_NOME ?? "Minha Cooperativa";
const email = process.env.MASTER_EMAIL;
const senha = process.env.MASTER_PASSWORD;
const nomeUsuario = process.env.MASTER_NOME ?? "Administrador";

if (!email || !senha) {
  console.error(
    "Defina MASTER_EMAIL e MASTER_PASSWORD no .env antes de rodar este script."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existente = await prisma.usuario.findUnique({ where: { email: email! } });
  if (existente) {
    console.log(`Usuario ${email} já existe (id ${existente.id}). Nada a fazer.`);
    return;
  }

  const empresa = await prisma.empresa.create({ data: { nome: nomeEmpresa } });
  const senhaHash = await bcrypt.hash(senha!, 10);
  const usuario = await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nome: nomeUsuario,
      email: email!,
      senhaHash,
      role: "MASTER",
    },
  });

  console.log(`Empresa criada: ${empresa.nome} (id ${empresa.id})`);
  console.log(`Usuario MASTER criado: ${usuario.email} (id ${usuario.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
