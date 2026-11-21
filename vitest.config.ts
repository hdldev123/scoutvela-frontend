import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Valores fixos: os testes não dependem do .env.local de quem roda (no CI ele não existe).
    env: {
      VITE_API_URL: "http://api.teste.local",
      VITE_SUPABASE_URL: "http://auth.teste.local",
      VITE_SUPABASE_ANON_KEY: "chave-de-teste",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
