-- Modelo alternativo de cobrança do cliente no "valor fixo por turno":
-- por padrão o cliente paga por banda desde a primeira (sem carência,
-- comportamento já em produção); esse campo liga, por perfil, o mesmo
-- modelo de carência que o motoboy já tem (garantido cobre N bandas,
-- excedente só depois).
ALTER TABLE "ClienteTurnoFixo" ADD COLUMN "carenciaCliente" BOOLEAN NOT NULL DEFAULT false;
