// Confere se src/lib/api/schema.d.ts está em dia com ../vela-back/openapi.yaml.
// Gera os tipos num arquivo temporário e falha se diferirem. Uso: npm run api:verificar [-- caminho/do/openapi.yaml]
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const raiz = resolve(import.meta.dirname, "..");
const contrato = resolve(process.argv[2] ?? resolve(raiz, "../vela-back/openapi.yaml"));
const atual = resolve(raiz, "src/lib/api/schema.d.ts");

if (!existsSync(contrato)) {
  console.error(
    `Contrato não encontrado: ${contrato}. O vela-back precisa estar ao lado do vela-front.`,
  );
  process.exit(2);
}

const require = createRequire(import.meta.url);
const pacote = require.resolve("openapi-typescript/package.json");
const bin = join(
  pacote,
  "..",
  require("openapi-typescript/package.json").bin["openapi-typescript"],
);

const pasta = mkdtempSync(join(tmpdir(), "vela-api-"));
const gerado = join(pasta, "schema.d.ts");
try {
  const r = spawnSync(process.execPath, [bin, contrato, "-o", gerado], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  const normaliza = (t) => t.replace(/\r\n/g, "\n");
  if (normaliza(readFileSync(gerado, "utf8")) !== normaliza(readFileSync(atual, "utf8"))) {
    console.error(
      "src/lib/api/schema.d.ts está desatualizado em relação ao openapi.yaml. Rode: npm run api:tipos",
    );
    process.exit(1);
  }
  console.log("Tipos da API em dia com o contrato.");
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
