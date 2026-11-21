import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Ouvinte = (evento: string, sessao: { user: { id: string } } | null) => void;
let ouvinte: Ouvinte = () => {};
const signOut = vi.fn();
vi.mock("@/lib/auth/supabase", () => ({
  getSupabase: () => ({
    auth: {
      signOut,
      getSession: async () => ({ data: { session: { access_token: "t", user: { id: "u1" } } } }),
      onAuthStateChange: (fn: Ouvinte) => {
        ouvinte = fn;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  }),
}));

import { api, errosPorCampo, paraErroApi } from "@/lib/api/cliente";
import { useSessao } from "@/lib/auth/sessao";
import { SessaoProvider } from "@/lib/auth/SessaoProvider";
import { repetirConsulta } from "@/router";

function Sair() {
  const { sair, carregando } = useSessao();
  return (
    <button onClick={() => void sair()} disabled={carregando}>
      sair
    </button>
  );
}

function montar() {
  const qc = new QueryClient();
  qc.setQueryData(["x"], 1);
  render(
    <QueryClientProvider client={qc}>
      <SessaoProvider>
        <Sair />
      </SessaoProvider>
    </QueryClientProvider>,
  );
  return qc;
}

describe("sessão", () => {
  beforeEach(() => signOut.mockReset());

  it("troca de usuário sem SIGNED_OUT limpa o cache", async () => {
    const qc = montar();
    await waitFor(() => expect(screen.getByText("sair")).toBeEnabled());
    act(() => ouvinte("TOKEN_REFRESHED", { user: { id: "u1" } }));
    expect(qc.getQueryData(["x"])).toBe(1);
    act(() => ouvinte("SIGNED_IN", { user: { id: "u2" } }));
    expect(qc.getQueryData(["x"])).toBeUndefined();
  });

  it("Sair com falha de rede sai neste aparelho e limpa o cache", async () => {
    signOut.mockResolvedValueOnce({ error: new Error("rede") }).mockResolvedValue({ error: null });
    const qc = montar();
    await waitFor(() => expect(screen.getByText("sair")).toBeEnabled());
    act(() => screen.getByText("sair").click());
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ scope: "local" }));
    await waitFor(() => expect(qc.getQueryData(["x"])).toBeUndefined());
  });

  it("401 automático encerra só a sessão local", async () => {
    signOut.mockResolvedValue({ error: null });
    const f = vi.fn(async () => new Response("{}", { status: 401 }));
    await api.GET("/health", { fetch: f as unknown as typeof fetch });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("repetição de consultas", () => {
  it("não repete 4xx", () => {
    expect(repetirConsulta(0, paraErroApi(404, {}))).toBe(false);
    expect(repetirConsulta(0, paraErroApi(403, {}))).toBe(false);
  });
  it("repete rede e 5xx até 2 vezes", () => {
    expect(repetirConsulta(0, new TypeError("falhou"))).toBe(true);
    expect(repetirConsulta(1, paraErroApi(503, {}))).toBe(true);
    expect(repetirConsulta(2, paraErroApi(503, {}))).toBe(false);
  });
});

describe("erros por campo", () => {
  it("lê `campos` do 400 e fica com o primeiro de cada campo", () => {
    const e = paraErroApi(400, {
      erro: "validacao",
      mensagem: "Dados inválidos.",
      campos: [
        { campo: "notas.0.evidencia", mensagem: "Informe a evidência." },
        { campo: "notas.0.evidencia", mensagem: "outra" },
        { campo: "pesoKg", mensagem: "Peso inválido." },
        { campo: 3, mensagem: "ignorado" },
      ],
    });
    expect(errosPorCampo(e)).toEqual({
      "notas.0.evidencia": "Informe a evidência.",
      pesoKg: "Peso inválido.",
    });
  });
  it("outros erros não têm campos", () => {
    expect(errosPorCampo(new Error("x"))).toEqual({});
    expect(errosPorCampo(paraErroApi(500, {}))).toEqual({});
  });
});
