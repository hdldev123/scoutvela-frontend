// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Os cabeçalhos de segurança têm uma única fonte: vercel.json. Eles também entram
// no build como routeRules do Nitro, para valerem em qualquer fluxo de deploy.
const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const cabecalhos = Object.fromEntries(
  vercel.headers.flatMap((regra) => regra.headers.map((h) => [h.key.toLowerCase(), h.value])),
);

export default defineConfig({
  // Alvo do deploy: Vercel (gera .vercel/output). O wrapper usa cloudflare-module por padrão.
  // routeRules existe no Nitro, mas o tipo do wrapper não o declara.
  nitro: { preset: "vercel", ...({ routeRules: { "/**": { headers: cabecalhos } } } as object) },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
