import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    PUT: (...args: unknown[]) => PUT(...args),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: { id: string };
  }) => <a href={params ? to.replace("$id", params.id) : to}>{children}</a>,
}));

import { TelaCiclos, diasAtePrazo, sugestaoCiclo } from "@/components/scout/TelaCiclos";

const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const falha = (status: number, erro: string, mensagem: string) => ({
  data: undefined,
  error: { erro, mensagem },
  response: { status },
});

const fechado = {
  id: "c1",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  prazo: "2026-10-31",
  status: "fechado",
  atletasComScore: 12,
  fechadoEm: "2026-11-01T12:00:00.000Z",
};
const aberto = {
  id: "c2",
  nome: "Novembro de 2026",
  inicio: "2026-11-01",
  prazo: "2026-11-30",
  status: "aberto",
  atletasComScore: 0,
  fechadoEm: null,
};

const PENDENCIAS = {
  treinadores: [
    {
      id: "t1",
      nome: "Ana Ribeiro",
      atletasPendentes: [
        { id: "a1", nome: "Lívia Arruda", faltam: 3 },
        { id: "a2", nome: "Bianca Lemos", faltam: 1 },
      ],
    },
  ],
  atletas: [{ id: "a7", nome: "Helena Vasques", perguntasSemResposta: 2 }],
  totais: { treinadoresComPendencia: 1, atletasComPendencia: 1, diasParaPrazo: 24 },
};

let itens: unknown[];
let pendencias: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  itens = [fechado];
  pendencias = PENDENCIAS;
  GET.mockImplementation(async (caminho: string) =>
    caminho === "/ciclos/{id}/pendencias" ? ok(pendencias) : ok({ itens }),
  );
});

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <TelaCiclos />
    </QueryClientProvider>,
  );
  return inv;
}

describe("helpers", () => {
  it("sugere nome e prazo no fim do mês", () => {
    expect(sugestaoCiclo(new Date(2026, 1, 10))).toEqual({
      nome: "Fevereiro de 2026",
      inicio: "2026-02-10",
      prazo: "2026-02-28",
    });
  });
  it("conta dias até o prazo", () => {
    expect(diasAtePrazo("2026-11-12", new Date(2026, 10, 9))).toBe(3);
    expect(diasAtePrazo("2026-11-08", new Date(2026, 10, 9))).toBe(-1);
  });
});

describe("TelaCiclos", () => {
  it("lista ciclos e abre um novo quando não há aberto", async () => {
    POST.mockResolvedValue(ok({ ...aberto }, 201));
    const inv = montar();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ciclos de avaliação" }),
    ).toBeTruthy();
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("Outubro de 2026")).toBeTruthy();
    expect(within(tabela).getByText("31/10/2026")).toBeTruthy();
    expect(within(tabela).getByText("01/11/2026")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Dezembro de 2026" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir ciclo" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/ciclos", {
        body: { nome: "Dezembro de 2026", inicio: "2026-12-01", prazo: "2026-12-31" },
      }),
    );
    await waitFor(() => {
      for (const k of ["ciclos", "ranking", "atleta", "painel", "investimento"]) {
        expect(inv).toHaveBeenCalledWith({ queryKey: [k] });
      }
    });
  });

  it("mostra o erro 409 da API", async () => {
    POST.mockResolvedValue(falha(409, "requisicao_invalida", "Já existe um ciclo aberto."));
    montar();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Abrir ciclo" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Já existe um ciclo aberto.");
  });

  it("bloqueia o formulário com ciclo aberto e ajusta o prazo", async () => {
    itens = [aberto, fechado];
    PUT.mockResolvedValue(ok({ ...aberto, prazo: "2026-12-05" }));
    montar();
    expect(await screen.findByText(/Ciclo aberto: Novembro de 2026/)).toBeTruthy();
    expect(screen.getByLabelText("Nome").matches(":disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar prazo" }));
    fireEvent.change(screen.getByLabelText("Novo prazo"), { target: { value: "2026-12-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar prazo" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/ciclos/{id}", {
        params: { path: { id: "c2" } },
        body: { prazo: "2026-12-05" },
      }),
    );
  });

  it("sem ciclo aberto não busca pendências", async () => {
    montar();
    await screen.findByRole("table");
    expect(screen.queryByRole("heading", { name: "Pendências" })).toBeNull();
    expect(GET).not.toHaveBeenCalledWith("/ciclos/{id}/pendencias", expect.anything());
  });

  it("bloco Pendências: totais, treinadores e atletas com link para a ficha", async () => {
    itens = [aberto, fechado];
    montar();
    const bloco = (await screen.findByRole("heading", { name: "Pendências" })).closest("section")!;
    await within(bloco).findByText("Ana Ribeiro");
    expect(GET).toHaveBeenCalledWith("/ciclos/{id}/pendencias", { params: { path: { id: "c2" } } });

    const totais = within(bloco).getByText("Treinadores com pendência").closest("dl")!;
    expect(totais).toHaveTextContent("Treinadores com pendência1");
    expect(totais).toHaveTextContent("Atletas com questionário pendente1");
    expect(totais).toHaveTextContent("faltam 24 dias");

    expect(within(bloco).getByText(/2 atletas pendentes/)).toBeTruthy();
    expect(within(bloco).getByRole("link", { name: "Lívia Arruda" })).toHaveAttribute(
      "href",
      "/atletas/a1",
    );
    expect(within(bloco).getByText(/faltam 3 indicadores/)).toBeTruthy();
    expect(within(bloco).getByText(/faltam 1 indicador$/)).toBeTruthy();
    expect(within(bloco).getByRole("link", { name: "Helena Vasques" })).toHaveAttribute(
      "href",
      "/atletas/a7",
    );
    expect(within(bloco).getByText(/2 perguntas sem resposta/)).toBeTruthy();
  });

  it("bloco Pendências: listas vazias e prazo vencido", async () => {
    itens = [aberto, fechado];
    pendencias = {
      treinadores: [],
      atletas: [],
      totais: { treinadoresComPendencia: 0, atletasComPendencia: 0, diasParaPrazo: -2 },
    };
    montar();
    expect(await screen.findByText("Nenhum treinador com avaliação pendente.")).toBeTruthy();
    expect(screen.getByText("Nenhum atleta com questionário pendente.")).toBeTruthy();
    expect(screen.getByText("atrasado há 2 dias")).toBeTruthy();
  });

  it("fecha o ciclo só após confirmar e mostra quantos foram congelados", async () => {
    itens = [aberto, fechado];
    POST.mockResolvedValue(
      ok({ ciclo: { ...aberto, status: "fechado", atletasComScore: 9 }, atletas: 9 }),
    );
    montar();
    await screen.findByText(/Ciclo aberto: Novembro de 2026/);
    fireEvent.click(screen.getByRole("button", { name: "Fechar ciclo" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toContain("não se desfaz");
    expect(POST).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/ciclos/{id}/fechar", { params: { path: { id: "c2" } } }),
    );
    expect(await screen.findByText(/9 atletas tiveram o score congelado/)).toBeTruthy();
  });
});
