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

import { TelaRanking } from "@/components/scout/TelaRanking";
import type { RespostaRanking } from "@/lib/api/consultas";

const pilares = [
  { id: "perf", nomeCurto: "Performance", nota: 4 },
  { id: "cf", nomeCurto: "Class Fit", nota: null },
];

function item(
  posicao: number,
  nome: string,
  evento: string,
  extra: Partial<RespostaRanking["itens"][number]> = {},
) {
  return {
    posicao,
    atleta: {
      id: `a${posicao}`,
      nome,
      velaid: `SC-T0${posicao}`,
      numeroVela: null,
      uf: "SC",
      idade: 20,
      genero: "F" as const,
      classe: { id: "c1", nome: evento, evento },
    },
    score: 80.25,
    faixa: { id: "f2", nome: "Alto potencial", nomeCurto: "Alto potencial" },
    completo: true,
    pilares,
    statusGates: "apto" as const,
    pontosCbvela: 1234,
    ...extra,
  };
}

const resposta = (
  itens: RespostaRanking["itens"],
  ocultos: number | null = null,
): RespostaRanking => ({
  ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
  itens,
  ocultosSemConsentimento: ocultos,
});

function montar(ui: ReactNode) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
}

describe("TelaRanking", () => {
  beforeEach(() => GET.mockReset());

  it("mostra título, ciclo, linhas com link para a ficha e pill Parcial", async () => {
    GET.mockResolvedValue({
      data: resposta([
        item(1, "Helena Vasques", "ILCA 6"),
        item(2, "Marcos Lima", "ILCA 7", { completo: false }),
      ]),
      response: { status: 200 },
    });
    montar(<TelaRanking papel="gestor" filtros={{}} aoMudarFiltros={() => {}} />);

    expect(await screen.findByText("Helena Vasques")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ranking de talento" })).toBeInTheDocument();
    expect(screen.getByText(/Ciclo de Novembro de 2026 · prazo 30\/11\/2026/)).toBeInTheDocument();
    const linha = screen.getByText("Marcos Lima").closest("a")!;
    expect(linha).toHaveAttribute("href", "/atletas/a2");
    expect(within(linha).getByText("Parcial")).toBeInTheDocument();
    expect(within(linha).getByText("Apto")).toBeInTheDocument();
    expect(within(linha).getByText("80,3")).toBeInTheDocument();
    expect(within(linha).getByText("1.234")).toBeInTheDocument();
  });

  it("treinador vê 'Meus atletas'", async () => {
    GET.mockResolvedValue({
      data: resposta([item(1, "Helena Vasques", "ILCA 6")]),
      response: { status: 200 },
    });
    montar(<TelaRanking papel="treinador" filtros={{}} aoMudarFiltros={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Meus atletas" })).toBeInTheDocument();
  });

  it("filtros viram parâmetros da consulta e mudar o filtro avisa a rota", async () => {
    GET.mockResolvedValue({
      data: resposta([item(1, "Helena Vasques", "ILCA 6")]),
      response: { status: 200 },
    });
    const aoMudar = vi.fn();
    montar(
      <TelaRanking
        papel="gestor"
        filtros={{ classe: "ILCA 6", ordem: "pontos_cbvela" }}
        aoMudarFiltros={aoMudar}
      />,
    );
    await screen.findByText("Helena Vasques");

    expect(GET).toHaveBeenCalledWith("/ranking", {
      params: { query: { classe: "ILCA 6", ordem: "pontos_cbvela" } },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "F" } });
    expect(aoMudar).toHaveBeenCalledWith({
      classe: "ILCA 6",
      ordem: "pontos_cbvela",
      categoria: "F",
    });
    fireEvent.change(screen.getByLabelText("Classe"), { target: { value: "" } });
    expect(aoMudar).toHaveBeenLastCalledWith({ ordem: "pontos_cbvela" });
  });

  it("IBVAR vê a nota dos atletas sem consentimento", async () => {
    GET.mockResolvedValue({
      data: resposta([item(1, "Helena Vasques", "ILCA 6")], 3),
      response: { status: 200 },
    });
    montar(<TelaRanking papel="ibvar" filtros={{}} aoMudarFiltros={() => {}} />);
    expect(
      await screen.findByText(/3 atletas sem consentimento entram só nos números agregados\./),
    ).toBeInTheDocument();
  });

  it("gestor não vê a nota de consentimento", async () => {
    GET.mockResolvedValue({
      data: resposta([item(1, "Helena Vasques", "ILCA 6")]),
      response: { status: 200 },
    });
    montar(<TelaRanking papel="gestor" filtros={{}} aoMudarFiltros={() => {}} />);
    await screen.findByText("Helena Vasques");
    expect(screen.queryByText(/sem consentimento/)).not.toBeInTheDocument();
  });

  it("lista vazia e erro da API", async () => {
    GET.mockResolvedValueOnce({ data: resposta([]), response: { status: 200 } });
    montar(<TelaRanking papel="gestor" filtros={{}} aoMudarFiltros={() => {}} />);
    expect(await screen.findByText("Nenhum atleta com esses filtros.")).toBeInTheDocument();
  });

  it("mostra a mensagem de erro devolvida pela API", async () => {
    GET.mockResolvedValue({
      error: { erro: "sem_acesso", mensagem: "Sem permissão." },
      response: { status: 403 },
    });
    montar(<TelaRanking papel="atleta" filtros={{}} aoMudarFiltros={() => {}} />);
    await waitFor(() =>
      expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Sem permissão."),
    );
  });
});
