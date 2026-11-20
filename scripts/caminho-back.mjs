// Localiza o repositório do back (que contém o openapi.yaml e o dev:local).
// Ordem: VELA_BACK_DIR, ../vela-back, ../scoutvela-backend.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");

export function caminhoDoBack() {
  const env = process.env.VELA_BACK_DIR;
  if (env) {
    const dir = resolve(raiz, env);
    if (!existsSync(dir))
      throw new Error(`VELA_BACK_DIR aponta para uma pasta que não existe: ${dir}`);
    return dir;
  }
  for (const nome of ["vela-back", "scoutvela-backend"]) {
    const candidato = resolve(raiz, "..", nome);
    if (existsSync(candidato)) return candidato;
  }
  throw new Error(
    "Back não encontrado. Coloque o repositório em ../vela-back ou ../scoutvela-backend, ou defina VELA_BACK_DIR com o caminho dele.",
  );
}
