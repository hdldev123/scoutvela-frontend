import { defineConfig } from "@playwright/test";

/**
 * E2E do MVP: sobe o vela-back em modo local (banco próprio em vela-back/.dados-e2e,
 * recriado a cada execução, com os dados fictícios) e o front em http://localhost:8080.
 * Usa o Chrome instalado na máquina (E2E_CANAL=msedge para o Edge); não baixa navegador.
 * Pare o `npm run dev:local` antes: as portas 3333 e 54321 são as mesmas.
 */
const API = "http://127.0.0.1:3333";
const AUTH = "http://127.0.0.1:54321";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    channel: process.env.E2E_CANAL ?? "chrome",
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:local -- --recriar",
      cwd: "../vela-back",
      url: `${API}/health`,
      env: { DADOS_LOCAIS_DIR: ".dados-e2e" },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "node ./node_modules/vite/bin/vite.js dev --port 8080 --strictPort --host localhost",
      url: "http://localhost:8080/entrar",
      env: { VITE_API_URL: API, VITE_SUPABASE_URL: AUTH, VITE_SUPABASE_ANON_KEY: "chave-local-dev" },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
