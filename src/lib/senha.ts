import "server-only";
import bcrypt from "bcryptjs";

// Utilitário neutro de hash de senha — usado tanto por auth-empresa.ts
// quanto por auth-motoboy.ts, que por sua vez mantêm sessão/cookie
// totalmente separados um do outro.
export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
