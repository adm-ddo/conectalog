-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('MASTER', 'GESTOR');

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- CreateEnum
CREATE TYPE "TipoTokenAutenticacao" AS ENUM ('VERIFICACAO_EMAIL', 'RECUPERACAO_SENHA');

-- CreateEnum
CREATE TYPE "FrequenciaPagamento" AS ENUM ('DIARIA', 'SEMANAL');

-- CreateEnum
CREATE TYPE "TurnoPredefinido" AS ENUM ('MANHA', 'NOITE', 'LIVRE');

-- CreateEnum
CREATE TYPE "StatusTurno" AS ENUM ('ABERTO', 'CONCLUIDO', 'PAGO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TipoMeta" AS ENUM ('BANDAS', 'VALOR');

-- CreateEnum
CREATE TYPE "PeriodoMeta" AS ENUM ('SEMANAL', 'MENSAL', 'PERSONALIZADO');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "logoUrl" TEXT,
    "valorBandaPadrao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorTaxaExtraPadrao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL DEFAULT 'GESTOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "valorBanda" DECIMAL(10,2),
    "valorTaxaExtra" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motoboy" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "dataNascimento" DATE NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "cep" TEXT,
    "telefoneCelular" TEXT NOT NULL,
    "telefoneEmergencia" TEXT NOT NULL,
    "chavePix" TEXT NOT NULL,
    "tipoChavePix" "TipoChavePix" NOT NULL,
    "fotoPerfilUrl" TEXT,
    "cnhFotoUrl" TEXT,
    "senhaHash" TEXT,
    "emailVerificadoEm" TIMESTAMP(3),
    "frequenciaPagamento" "FrequenciaPagamento" NOT NULL DEFAULT 'SEMANAL',
    "livre" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Motoboy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoMotoboy" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoMotoboy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAutenticacaoMotoboy" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "tipo" "TipoTokenAutenticacao" NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAutenticacaoMotoboy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotoboyCliente" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "liberado" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotoboyCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "turnoPredefinido" "TurnoPredefinido" NOT NULL DEFAULT 'LIVRE',
    "horaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaFim" TIMESTAMP(3),
    "fotoInicioUrl" TEXT NOT NULL,
    "fotoFimUrl" TEXT,
    "assinaturaTermoUrl" TEXT NOT NULL,
    "assinaturaReciboUrl" TEXT,
    "quantidadeBandas" INTEGER NOT NULL DEFAULT 0,
    "quantidadeTaxasExtras" INTEGER NOT NULL DEFAULT 0,
    "valorBandaAplicado" DECIMAL(10,2),
    "valorTaxaExtraAplicado" DECIMAL(10,2),
    "valorTotal" DECIMAL(10,2),
    "status" "StatusTurno" NOT NULL DEFAULT 'ABERTO',
    "pagamentoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apoio" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "quantidadeBandas" INTEGER NOT NULL DEFAULT 0,
    "quantidadeTaxasExtras" INTEGER NOT NULL DEFAULT 0,
    "valorBandaAplicado" DECIMAL(10,2) NOT NULL,
    "valorTaxaExtraAplicado" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "pagamentoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apoio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vale" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "criadoPorUsuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "tipo" "TipoMeta" NOT NULL,
    "valorAlvo" DECIMAL(10,2) NOT NULL,
    "periodoTipo" "PeriodoMeta" NOT NULL DEFAULT 'SEMANAL',
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_token_key" ON "Sessao"("token");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_idx" ON "Cliente"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Motoboy_cpf_key" ON "Motoboy"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Motoboy_email_key" ON "Motoboy"("email");

-- CreateIndex
CREATE INDEX "Motoboy_empresaId_idx" ON "Motoboy"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoMotoboy_token_key" ON "SessaoMotoboy"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAutenticacaoMotoboy_token_key" ON "TokenAutenticacaoMotoboy"("token");

-- CreateIndex
CREATE INDEX "TokenAutenticacaoMotoboy_motoboyId_tipo_idx" ON "TokenAutenticacaoMotoboy"("motoboyId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "MotoboyCliente_motoboyId_clienteId_key" ON "MotoboyCliente"("motoboyId", "clienteId");

-- CreateIndex
CREATE INDEX "Turno_motoboyId_status_idx" ON "Turno"("motoboyId", "status");

-- CreateIndex
CREATE INDEX "Turno_clienteId_status_idx" ON "Turno"("clienteId", "status");

-- CreateIndex
CREATE INDEX "Apoio_turnoId_idx" ON "Apoio"("turnoId");

-- CreateIndex
CREATE INDEX "Pagamento_motoboyId_status_idx" ON "Pagamento"("motoboyId", "status");

-- CreateIndex
CREATE INDEX "Vale_motoboyId_idx" ON "Vale"("motoboyId");

-- CreateIndex
CREATE INDEX "Meta_motoboyId_ativa_idx" ON "Meta"("motoboyId", "ativa");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motoboy" ADD CONSTRAINT "Motoboy_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoMotoboy" ADD CONSTRAINT "SessaoMotoboy_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAutenticacaoMotoboy" ADD CONSTRAINT "TokenAutenticacaoMotoboy_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotoboyCliente" ADD CONSTRAINT "MotoboyCliente_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotoboyCliente" ADD CONSTRAINT "MotoboyCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apoio" ADD CONSTRAINT "Apoio_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apoio" ADD CONSTRAINT "Apoio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apoio" ADD CONSTRAINT "Apoio_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
