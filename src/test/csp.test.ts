import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (arquivo: string) => readFileSync(join(process.cwd(), arquivo), "utf8");

type Regra = { headers: { key: string; value: string }[] };

function cspDoVercel(): string {
  const { headers } = JSON.parse(ler("vercel.json")) as { headers: Regra[] };
  const csp = headers
    .flatMap((r) => r.headers)
    .find((h) => h.key.toLowerCase() === "content-security-policy");
  if (!csp) throw new Error("vercel.json sem Content-Security-Policy");
  return csp.value;
}

const diretiva = (csp: string, nome: string) =>
  csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${nome} `));

describe("CSP", () => {
  it("libera as fotos assinadas do Supabase Storage em img-src", () => {
    expect(diretiva(cspDoVercel(), "img-src")).toContain("https://*.supabase.co");
  });

  it("libera só a prévia da foto da World Sailing em img-src, sem curinga", () => {
    const img = diretiva(cspDoVercel(), "img-src")!;
    expect(img).toContain("https://assets.sailing.org");
    expect(img).not.toContain("*.sailing");
    expect(diretiva(cspDoVercel(), "connect-src")).not.toContain("sailing.org");
  });

  it("libera o vídeo do login hospedado no Storage em media-src", () => {
    expect(diretiva(cspDoVercel(), "media-src")).toContain("https://*.supabase.co");
  });

  it("vite.config.ts usa o vercel.json como única fonte, sem CSP própria", () => {
    const vite = ler("vite.config.ts");
    expect(vite).toContain("vercel.json");
    expect(vite).toContain("routeRules");
    expect(vite).not.toMatch(/img-src|default-src/);
  });

  it("o README descreve o img-src real", () => {
    expect(ler("README.md")).toContain(
      "img-src 'self' data: blob: https://*.supabase.co https://assets.sailing.org",
    );
  });
});

describe(".gitignore", () => {
  it("ignora .env e .env.* mas mantém o .env.example", () => {
    const linhas = ler(".gitignore")
      .split(/\r?\n/)
      .map((l) => l.trim());
    expect(linhas).toContain(".env");
    expect(linhas).toContain(".env.*");
    expect(linhas).toContain("!.env.example");
  });
});
