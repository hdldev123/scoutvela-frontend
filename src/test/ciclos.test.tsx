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

import { TelaCiclos } from "@/components/scout/TelaCiclos";
import { diasAtePrazo, progressoCiclo, sugestaoCiclo } from "@/components/scout/ciclos-util";

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
  it("calcula o progresso do tempo do ciclo", () => {
    expect(progressoCiclo("2026-11-01", "2026-11-30", new Date(2026, 10, 15))).toEqual({
      passados: 14,
      total: 29,
      pct: 48,
    });
    expect(progressoCiclo("2026-11-01", "2026-11-30", new Date(2026, 11, 20)).pct).toBe(100);
    expect(progressoCiclo("2026-11-01", "2026-11-30", new Date(2026, 9, 1)).pct).toBe(0);
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
    expect(screen.queryByLabelText("Nome")).toBeNull();
    expect(
      screen.getByText(
        "Só um ciclo fica aberto por vez. Feche o ciclo de Novembro de 2026 para abrir o próximo.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Abrir ciclo" })).toBeNull();
    const barra = screen.getByRole("progressbar", { name: "Tempo decorrido do ciclo" });
    expect(barra.getAttribute("aria-valuemax")).toBe("29");

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
    expect(totais).toHaveTextContent("Indicadores a lançar4");
    expect(totais).not.toHaveTextContent("Prazo");

    expect(within(bloco).getByText("2 atletas pendentes")).toBeTruthy();
    const grupo = within(bloco).getByRole("table", { name: "Atletas pendentes de Ana Ribeiro" });
    const linhaLivia = within(grupo).getByRole("link", { name: "Lívia Arruda" }).closest("tr")!;
    expect(within(linhaLivia).getByRole("link")).toHaveAttribute("href", "/atletas/a1");
    expect(linhaLivia).toHaveTextContent("3");
    const linhaBianca = within(grupo).getByRole("link", { name: "Bianca Lemos" }).closest("tr")!;
    expect(linhaBianca).toHaveTextContent("1");
    const quest = within(bloco).getByRole("table", { name: "Atletas com questionário pendente" });
    expect(within(quest).getByRole("link", { name: "Helena Vasques" })).toHaveAttribute(
      "href",
      "/atletas/a7",
    );
    expect(
      within(quest).getByRole("link", { name: "Helena Vasques" }).closest("tr"),
    ).toHaveTextContent("2");
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
  });

  it("o selo de prazo fica em atenção quando faltam 5 dias ou menos", async () => {
    const hoje = new Date();
    const em = (dias: number) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    itens = [{ ...aberto, inicio: em(-10), prazo: em(3) }];
    montar();
    const selo = await screen.findByText("faltam 3 dias");
    expect(selo.className).toContain("st-cond");
  });

  it("histórico usa selos de status Aberto e Fechado", async () => {
    itens = [aberto, fechado];
    montar();
    expect((await screen.findByText("Aberto")).className).toContain("st-info");
    expect(screen.getByText("Fechado").className).toContain("st-neutro");
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
