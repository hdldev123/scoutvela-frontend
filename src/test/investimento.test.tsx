import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { GET: (...args: unknown[]) => GET(...args) },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...resto
  }: { children: ReactNode; to: string; params?: { id: string } } & Record<string, unknown>) => (
    <a href={params ? to.replace("$id", params.id) : to} {...resto}>
      {children}
    </a>
  ),
}));

import { TelaInvestimento } from "@/components/scout/TelaInvestimento";
import type { RespostaInvestimento } from "@/lib/api/investimento";

function resposta(extra: Partial<RespostaInvestimento> = {}): RespostaInvestimento {
  return {
    ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
    cicloExibido: {
      id: "c-nov",
      nome: "Novembro de 2026",
      inicio: "2026-11-01",
      prazo: "2026-11-30",
      status: "fechado",
      fechadoEm: "2026-12-01T12:00:00.000Z",
    },
    parcial: false,
    congelamentoCompleto: true,
    ciclosDisponiveis: [
      { id: "c-dez", nome: "Dezembro de 2026", status: "aberto", fechadoEm: null },
      {
        id: "c-nov",
        nome: "Novembro de 2026",
        status: "fechado",
        fechadoEm: "2026-12-01T12:00:00.000Z",
      },
      {
        id: "c-out",
        nome: "Outubro de 2026",
        status: "fechado",
        fechadoEm: "2026-11-01T12:00:00.000Z",
      },
    ],
    dadosAtualizadosEm: "2026-12-01T12:00:00.000Z",
    kpis: { atletas: 12, scoreMedio: 71.46, aptos: 4, dependentesApoio: 5 },
    funil: [
      { faixa: { id: "f1", nome: "Prioridade de programa" }, n: 1 },
      { faixa: { id: "f2", nome: "Alto potencial" }, n: 3 },
      { faixa: { id: "f3", nome: "Em desenvolvimento" }, n: 5 },
      { faixa: { id: "f4", nome: "No radar" }, n: 3 },
    ],
    gates: [
      { gate: 1, nome: "Class Fit", apto: 6, condicional: 4, alerta: 2 },
      { gate: 2, nome: "Evidência competitiva", apto: 5, condicional: 5, alerta: 2 },
    ],
    mediaPilares: [
      { pilarId: "perf", nomeCurto: "Performance", media: 3.2 },
      { pilarId: "cf", nomeCurto: "Class Fit", media: 4.1 },
    ],
    ondeInvestir: [
      {
        atleta: { id: "a7", nome: "Helena Vasques", classe: { nome: "ILCA 6" } },
        score: 80.25,
        statusGates: "apto",
        perfilSuporte: "C",
        mesesAssegurados: 6,
      },
    ],
    ocultosSemConsentimento: null,
    ...extra,
  };
}

function montar(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envolver = (x: ReactNode) => <QueryClientProvider client={client}>{x}</QueryClientProvider>;
  const r = render(envolver(ui));
  return { rerender: (x: ReactNode) => r.rerender(envolver(x)) };
}

describe("TelaInvestimento", () => {
  beforeEach(() => GET.mockReset());

  it("mostra título, ciclo, KPIs, funil, gates e média por pilar", async () => {
    GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
    montar(<TelaInvestimento papel="gestor" />);

    expect(await screen.findByRole("heading", { name: "Painel de investimento" })).toBeVisible();
    expect(
      await screen.findByText(
        "Ciclo Novembro de 2026 (fechado em 01/12/2026) · dados até 01/12/2026",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Parcial")).not.toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/investimento");

    const kpi = (rotulo: string) => screen.getByText(rotulo).previousElementSibling;
    expect(kpi("atletas no piloto")).toHaveTextContent("12");
    expect(kpi("score médio")).toHaveTextContent("71,5");
    expect(kpi("aptos nos 4 gates")).toHaveTextContent("4");
    expect(kpi("dependem de apoio (perfil C ou D)")).toHaveTextContent("5");

    expect(screen.getByText("Prioridade de programa")).toBeVisible();
    expect(screen.getByText("G1 Class Fit")).toBeVisible();
    expect(screen.getByText("6 aptos · 4 condicionais · 2 em alerta")).toBeVisible();
    expect(screen.getByText("3,2")).toBeVisible();
  });

  it("lista Onde investir com link para a ficha e meses assegurados (gestor)", async () => {
    GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
    montar(<TelaInvestimento papel="gestor" />);

    const link = await screen.findByRole("link", { name: "Helena Vasques" });
    expect(link).toHaveAttribute("href", "/atletas/a7");
    const linha = link.closest("tr")!;
    expect(within(linha).getByText("ILCA 6")).toBeVisible();
    expect(within(linha).getByText("80,3")).toBeVisible();
    expect(within(linha).getByText("Apto")).toBeVisible();
    expect(within(linha).getByText("C")).toBeVisible();
    expect(within(linha).getByText("6 meses")).toBeVisible();
    expect(screen.queryByText(/sem consentimento/)).not.toBeInTheDocument();
  });

  it("IBVAR vê o aviso de ocultos e não vê meses assegurados", async () => {
    GET.mockResolvedValue({
      data: resposta({
        ocultosSemConsentimento: 2,
        ondeInvestir: [
          {
            atleta: { id: "a7", nome: "Helena Vasques", classe: { nome: "ILCA 6" } },
            score: 80.25,
            statusGates: "apto",
            perfilSuporte: "D",
            mesesAssegurados: null,
          },
        ],
      }),
      response: { status: 200 },
    });
    montar(<TelaInvestimento papel="ibvar" />);

    expect(
      await screen.findByText(/2 atletas sem consentimento entram só nos números agregados\./),
    ).toBeVisible();
    expect(screen.queryByText(/assegurado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/meses/)).not.toBeInTheDocument();
  });

  it("recorte vazio mostra mensagem", async () => {
    GET.mockResolvedValue({
      data: resposta({ ondeInvestir: [] }),
      response: { status: 200 },
    });
    montar(<TelaInvestimento papel="gestor" />);
    expect(await screen.findByText("Nenhum atleta nesse recorte.")).toBeVisible();
  });

  it("ciclo aberto: cabeçalho em andamento e selo Parcial com explicação", async () => {
    GET.mockResolvedValue({
      data: resposta({
        parcial: true,
        cicloExibido: {
          id: "c-dez",
          nome: "Dezembro de 2026",
          inicio: "2026-12-01",
          prazo: "2026-12-31",
          status: "aberto",
          fechadoEm: null,
        },
        dadosAtualizadosEm: "2026-12-10T15:00:00.000Z",
      }),
      response: { status: 200 },
    });
    montar(<TelaInvestimento papel="gestor" />);
    expect(
      await screen.findByText(
        "Ciclo Dezembro de 2026 (em andamento, prazo 31/12/2026) · dados até 10/12/2026",
      ),
    ).toBeVisible();
    expect(screen.getByText("Parcial")).toBeVisible();
    expect(screen.getByText(/os números mudam a cada lançamento até o fechamento/)).toBeVisible();
  });

  it("seletor de ciclo: rótulo visível, aberto marcado e troca chama a API com ciclo", async () => {
    GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
    const aoMudar = vi.fn();
    const { rerender } = montar(<TelaInvestimento papel="gestor" aoMudarCiclo={aoMudar} />);
    const seletor = await screen.findByRole("combobox", { name: "Ciclo" });
    expect(seletor).toHaveValue("c-nov");
    expect(
      within(seletor)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Dezembro de 2026 (em andamento)", "Novembro de 2026", "Outubro de 2026"]);
    fireEvent.change(seletor, { target: { value: "c-out" } });
    expect(aoMudar).toHaveBeenCalledWith("c-out");

    // A rota devolve o ciclo escolhido pela URL: a consulta usa `ciclo` e entra no queryKey.
    rerender(<TelaInvestimento papel="gestor" ciclo="c-out" aoMudarCiclo={aoMudar} />);
    await waitFor(() =>
      expect(GET).toHaveBeenCalledWith("/investimento", { params: { query: { ciclo: "c-out" } } }),
    );
  });

  it("ciclo antigo sem congelamento completo: avisa e mostra estado vazio, sem zeros", async () => {
    GET.mockResolvedValue({
      data: resposta({
        congelamentoCompleto: false,
        kpis: { atletas: 12, scoreMedio: 71.46, aptos: null, dependentesApoio: null },
        gates: [{ gate: 1, nome: "Class Fit", apto: null, condicional: null, alerta: null }],
        mediaPilares: [{ pilarId: "perf", nomeCurto: "Performance", media: null }],
        ondeInvestir: [],
        ocultosSemConsentimento: null,
      }),
      response: { status: 200 },
    });
    montar(<TelaInvestimento papel="ibvar" />);
    expect(
      await screen.findByText(
        "Este ciclo foi fechado antes do congelamento completo: só score e faixa foram guardados.",
      ),
    ).toBeVisible();
    const kpi = (rotulo: string) => screen.getByText(rotulo).previousElementSibling;
    expect(kpi("atletas no piloto")).toHaveTextContent("12");
    expect(kpi("score médio")).toHaveTextContent("71,5");
    expect(kpi("aptos nos 4 gates")).toHaveTextContent("—");
    expect(kpi("dependem de apoio (perfil C ou D)")).toHaveTextContent("—");
    expect(screen.getByText("Sem dado neste ciclo")).toBeVisible();
    expect(screen.getAllByText("Sem dado neste ciclo.")).toHaveLength(2);
    expect(screen.queryByText(/0 aptos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem consentimento/)).not.toBeInTheDocument();
    // O funil continua preenchido.
    expect(screen.getByText("Alto potencial")).toBeVisible();
  });

  it("sem ciclo nenhum: sem cabeçalho de ciclo, sem seletor e sem aviso", async () => {
    GET.mockResolvedValue({
      data: resposta({
        ciclo: null,
        cicloExibido: null,
        parcial: true,
        ciclosDisponiveis: [],
        dadosAtualizadosEm: null,
      }),
      response: { status: 200 },
    });
    montar(<TelaInvestimento papel="gestor" />);
    expect(await screen.findByText("G1 Class Fit")).toBeVisible();
    expect(screen.queryByText(/^Ciclo /)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Ciclo" })).not.toBeInTheDocument();
    expect(screen.queryByText("Parcial")).not.toBeInTheDocument();
  });

  it("mostra carregando e depois a mensagem de erro da API", async () => {
    GET.mockResolvedValue({
      error: { erro: "sem_acesso", mensagem: "Sem permissão." },
      response: { status: 403 },
    });
    montar(<TelaInvestimento papel="gestor" />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando painel…");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Sem permissão."));
  });
});
