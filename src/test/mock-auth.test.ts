import { describe, expect, it } from "vitest";
import { entrar } from "@/lib/scout/mock-auth";

describe("Login simulado", () => {
  it("cada conta de teste abre o seu perfil", () => {
    expect(entrar("gestor@scoutvela.dev", "gestor123")?.perfil).toBe("gestor");
    expect(entrar("treinadora@scoutvela.dev", "treino123")?.perfil).toBe("treinador");
    expect(entrar("atleta@scoutvela.dev", "atleta123")?.perfil).toBe("atleta");
    expect(entrar("ibvar@scoutvela.dev", "ibvar123")?.perfil).toBe("ibvar");
  });
  it("senha errada não entra", () => {
    expect(entrar("gestor@scoutvela.dev", "errada")).toBeNull();
  });
});
