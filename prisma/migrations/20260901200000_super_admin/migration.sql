-- Usuario: dono da plataforma (super admin)
ALTER TABLE "Usuario" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Marca o login do Thiago como super admin -- o unico que existe hoje.
UPDATE "Usuario" SET "superAdmin" = true WHERE "email" = 'thiagodier@gmail.com';

-- Sessao: qual cooperativa o super admin "entrou" pra ver como dono dela
ALTER TABLE "Sessao" ADD COLUMN "empresaAtivaId" INTEGER;
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_empresaAtivaId_fkey" FOREIGN KEY ("empresaAtivaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
