import { describe, expect, it, vi } from "vitest";
import { criarClienteApi, mensagemDeErro, paraErroApi } from "@/lib/api/cliente";

function fetchFalso(status: number, corpo: unknown) {
  return vi.fn(
    async (_req: Request) =>
      new Response(JSON.stringify(corpo), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("cliente da API", () => {
  it("envia Authorization: Bearer com o token da sessão", async () => {
    const f = fetchFalso(200, { ok: true });
    const c = criarClienteApi("http://api.teste", {
      obterToken: async () => "tok123",
      aoNaoAutenticado: vi.fn(),
    });
    await c.GET("/health", { fetch: f });
    expect(f.mock.calls[0]![0].headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("não envia o header sem sessão", async () => {
    const f = fetchFalso(200, { ok: true });
    const c = criarClienteApi("http://api.teste", {
      obterToken: async () => null,
      aoNaoAutenticado: vi.fn(),
    });
    await c.GET("/health", { fetch: f });
    expect(f.mock.calls[0]![0].headers.has("Authorization")).toBe(false);
  });

  it("resposta 401 chama aoNaoAutenticado", async () => {
    const f = fetchFalso(401, { erro: "nao_autenticado", mensagem: "Sessão inválida." });
    const aoNaoAutenticado = vi.fn();
    const c = criarClienteApi("http://api.teste", {
      obterToken: async () => "t",
      aoNaoAutenticado,
    });
    const r = await c.GET("/me", { fetch: f });
    expect(aoNaoAutenticado).toHaveBeenCalledOnce();
    expect(r.response.status).toBe(401);
  });

  it("extrai a mensagem de erro da API", () => {
    expect(mensagemDeErro({ erro: "sem_acesso", mensagem: "Sem acesso." })).toBe("Sem acesso.");
    expect(mensagemDeErro(undefined, "padrão")).toBe("padrão");
    const e = paraErroApi(403, { erro: "sem_acesso", mensagem: "Sem acesso." });
    expect(e).toMatchObject({ status: 403, codigo: "sem_acesso", message: "Sem acesso." });
  });
});
