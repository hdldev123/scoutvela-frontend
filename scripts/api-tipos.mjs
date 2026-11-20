// Regenera src/lib/api/schema.d.ts a partir do openapi.yaml do back (ver caminho-back.mjs).
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { caminhoDoBack } from "./caminho-back.mjs";

const raiz = resolve(import.meta.dirname, "..");
let contrato;
try {
  contrato = join(caminhoDoBack(), "openapi.yaml");
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const require = createRequire(import.meta.url);
const pacote = require.resolve("openapi-typescript/package.json");
const bin = join(
  pacote,
  "..",
  require("openapi-typescript/package.json").bin["openapi-typescript"],
);

const r = spawnSync(
  process.execPath,
  [bin, contrato, "-o", resolve(raiz, "src/lib/api/schema.d.ts")],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
