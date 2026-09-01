-- Empresa: link fixo de cadastro de motoboy. Empresa(s) ja existentes
-- ganham um token gerado na hora, senao ficariam sem link nenhum.
ALTER TABLE "Empresa" ADD COLUMN "tokenCadastroMotoboy" TEXT;
UPDATE "Empresa" SET "tokenCadastroMotoboy" = md5(random()::text || clock_timestamp()::text || id::text);
CREATE UNIQUE INDEX "Empresa_tokenCadastroMotoboy_key" ON "Empresa"("tokenCadastroMotoboy");

-- Usuario: verificacao de e-mail. Contas existentes (criadas antes desse
-- fluxo existir, ex.: via seed:master) ja contam como verificadas --
-- senao o login do Thiago ficaria bloqueado por uma exigencia que nao
-- existia quando a conta foi criada.
ALTER TABLE "Usuario" ADD COLUMN "emailVerificadoEm" TIMESTAMP(3);
UPDATE "Usuario" SET "emailVerificadoEm" = "criadoEm";

-- CreateTable
CREATE TABLE "TokenAutenticacaoUsuario" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoTokenAutenticacao" NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAutenticacaoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenAutenticacaoUsuario_token_key" ON "TokenAutenticacaoUsuario"("token");

-- CreateIndex
CREATE INDEX "TokenAutenticacaoUsuario_usuarioId_tipo_idx" ON "TokenAutenticacaoUsuario"("usuarioId", "tipo");

-- AddForeignKey
ALTER TABLE "TokenAutenticacaoUsuario" ADD CONSTRAINT "TokenAutenticacaoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ConviteEquipe" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criadoPorUsuarioId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteEquipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteEquipe_token_key" ON "ConviteEquipe"("token");

-- CreateIndex
CREATE INDEX "ConviteEquipe_empresaId_idx" ON "ConviteEquipe"("empresaId");

-- AddForeignKey
ALTER TABLE "ConviteEquipe" ADD CONSTRAINT "ConviteEquipe_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteEquipe" ADD CONSTRAINT "ConviteEquipe_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
