import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
}

describe("TelaInvestimento", () => {
  beforeEach(() => GET.mockReset());

  it("mostra título, ciclo, KPIs, funil, gates e média por pilar", async () => {
    GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
    montar(<TelaInvestimento papel="gestor" />);

    expect(await screen.findByRole("heading", { name: "Painel de investimento" })).toBeVisible();
    expect(await screen.findByText(/ciclo de Novembro de 2026 · prazo 30\/11\/2026/)).toBeVisible();
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
