import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
const GET_EVOLUCAO = vi.fn();
const GET_RANKING = vi.fn();
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (rota: string, ...args: unknown[]) =>
      rota === "/investimento/evolucao"
        ? GET_EVOLUCAO(rota, ...args)
        : rota === "/ranking"
          ? GET_RANKING(rota, ...args)
          : GET(rota, ...args),
    PUT: (...args: unknown[]) => PUT(...args),
  },
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
import type { RespostaEvolucao, RespostaInvestimento } from "@/lib/api/investimento";

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

type CicloEvo = RespostaEvolucao["ciclos"][number];

function cicloEvo(id: string, nome: string, extra: Partial<CicloEvo> = {}): CicloEvo {
  return {
    ciclo: { id, nome, fechadoEm: "2026-11-01T12:00:00.000Z" },
    atletas: 10,
    scoreMedio: 70,
    mediaPorPilar: [
      { pilarId: "perf", nomeCurto: "Performance", media: 3 },
      { pilarId: "cf", nomeCurto: "Class Fit", media: 4 },
    ],
    funil: [],
    aptosNosGates: 4,
    congelamentoCompleto: true,
    suprimido: false,
    ...extra,
  };
}

function evolucao(extra: Partial<RespostaEvolucao> = {}): RespostaEvolucao {
  return {
    ciclos: [
      cicloEvo("c-set", "Setembro de 2026", { scoreMedio: 66 }),
      cicloEvo("c-out", "Outubro de 2026", { scoreMedio: 70 }),
      cicloEvo("c-nov", "Novembro de 2026", {
        scoreMedio: 75.6,
        mediaPorPilar: [
          { pilarId: "perf", nomeCurto: "Performance", media: 3.4 },
          { pilarId: "cf", nomeCurto: "Class Fit", media: 3.8 },
        ],
      }),
    ],
    meta: {
      percentual: 10,
      cicloBase: { id: "c-out", nome: "Outubro de 2026" },
      cicloAtual: { id: "c-nov", nome: "Novembro de 2026" },
      mediaBase: 70,
      mediaAtual: 75.6,
      variacaoPercentual: 8,
      atingida: false,
    },
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
  beforeEach(() => {
    GET.mockReset();
    PUT.mockReset();
    GET_EVOLUCAO.mockReset();
    GET_EVOLUCAO.mockResolvedValue({ data: evolucao({ ciclos: [] }), response: { status: 200 } });
    GET_RANKING.mockReset();
    GET_RANKING.mockResolvedValue({ data: { itens: [] }, response: { status: 200 } });
    PUT.mockResolvedValue({ response: { status: 204 } });
  });

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

  it("ao abrir a tela marca o investimento como visto e invalida as notificações", async () => {
    GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const espiao = vi.spyOn(client, "invalidateQueries");
    render(
      <QueryClientProvider client={client}>
        <TelaInvestimento papel="ibvar" />
      </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: "Painel de investimento" });
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/notificacoes/vistas", {
        body: { chave: "investimento" },
      }),
    );
    await waitFor(() => expect(espiao).toHaveBeenCalledWith({ queryKey: ["notificacoes"] }));
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

  describe("Evolução da turma (D12)", () => {
    const abrir = async (papel = "gestor") => {
      GET.mockResolvedValue({ data: resposta(), response: { status: 200 } });
      montar(<TelaInvestimento papel={papel} />);
      return screen.findByRole("heading", { name: "Evolução da turma" });
    };

    it("desenha um ponto por ciclo, a meta e a descrição textual do gráfico", async () => {
      GET_EVOLUCAO.mockResolvedValue({ data: evolucao(), response: { status: 200 } });
      await abrir();
      const grafico = await screen.findByRole("img", { name: /Média do score da turma/ });
      expect(grafico).toHaveAccessibleName(
        "Média do score da turma por ciclo fechado: Set/26 66,0; Out/26 70,0; Nov/26 75,6; meta do ciclo atual 77,0.",
      );
      expect(screen.getAllByTestId("evo-ponto")).toHaveLength(3);
      expect(screen.getByTestId("evo-meta")).toHaveTextContent("Meta 77,0");
      // Equivalente textual: tabela com os mesmos números.
      const tabela = screen.getByRole("table", { name: "Evolução da turma por ciclo fechado" });
      const linha = within(tabela).getByRole("row", { name: /Novembro de 2026/ });
      expect(linha).toHaveTextContent("10");
      expect(linha).toHaveTextContent("75,6");
      expect(linha).toHaveTextContent("4");
      expect(GET_EVOLUCAO).toHaveBeenCalledWith("/investimento/evolucao");
    });

    it("resume a meta: não atingida", async () => {
      GET_EVOLUCAO.mockResolvedValue({ data: evolucao(), response: { status: 200 } });
      await abrir();
      expect(await screen.findByTestId("evo-resumo-meta")).toHaveTextContent(
        "Meta: +10% sobre Outubro de 2026. Realizado: +8% (não atingida)",
      );
    });

    it("resume a meta: atingida", async () => {
      GET_EVOLUCAO.mockResolvedValue({
        data: evolucao({
          meta: {
            percentual: 10,
            cicloBase: { id: "c-out", nome: "Outubro de 2026" },
            cicloAtual: { id: "c-nov", nome: "Novembro de 2026" },
            mediaBase: 70,
            mediaAtual: 78.4,
            variacaoPercentual: 12,
            atingida: true,
          },
        }),
        response: { status: 200 },
      });
      await abrir();
      expect(await screen.findByTestId("evo-resumo-meta")).toHaveTextContent(
        "Meta: +10% sobre Outubro de 2026. Realizado: +12% (atingida)",
      );
    });

    it("compara o ciclo atual com o anterior por pilar, com a diferença em texto", async () => {
      GET_EVOLUCAO.mockResolvedValue({ data: evolucao(), response: { status: 200 } });
      await abrir();
      expect(
        await screen.findByRole("heading", {
          name: "Média por pilar: Novembro de 2026 contra Outubro de 2026",
        }),
      ).toBeVisible();
      const lista = within(document.querySelector<HTMLElement>(".evo-pilares")!);
      const perf = lista.getByText("Performance").closest("li")!;
      expect(perf).toHaveTextContent("3,0");
      expect(perf).toHaveTextContent("3,4");
      expect(perf).toHaveTextContent("+0,4 (subiu)");
      expect(lista.getByText("Class Fit").closest("li")).toHaveTextContent("−0,2 (caiu)");
    });

    it("IBVAR: ciclo suprimido não desenha ponto e mostra o aviso de grupo pequeno", async () => {
      GET_EVOLUCAO.mockResolvedValue({
        data: evolucao({
          ciclos: [
            cicloEvo("c-out", "Outubro de 2026", { scoreMedio: 70 }),
            cicloEvo("c-nov", "Novembro de 2026", {
              atletas: 2,
              scoreMedio: null,
              mediaPorPilar: null,
              funil: null,
              aptosNosGates: null,
              suprimido: true,
            }),
          ],
          meta: {
            percentual: 10,
            cicloBase: { id: "c-out", nome: "Outubro de 2026" },
            cicloAtual: { id: "c-nov", nome: "Novembro de 2026" },
            mediaBase: 70,
            mediaAtual: null,
            variacaoPercentual: null,
            atingida: null,
          },
        }),
        response: { status: 200 },
      });
      await abrir("ibvar");
      expect(
        await screen.findByText(
          "Grupo pequeno: números ocultos para proteger quem não consentiu.",
          {
            selector: "p.inv-aviso",
          },
        ),
      ).toBeVisible();
      expect(screen.getAllByTestId("evo-ponto")).toHaveLength(1);
      expect(screen.getByRole("img", { name: /Nov\/26 oculto/ })).toBeInTheDocument();
      expect(screen.getByTestId("evo-resumo-meta")).toHaveTextContent(
        "Realizado: oculto (grupo pequeno).",
      );
      expect(screen.getByText(/Média por pilar oculta/)).toBeVisible();
      expect(screen.getByRole("row", { name: /Novembro de 2026/ })).toHaveTextContent("Oculto");
    });

    it("ciclo antigo sem congelamento completo: pilares e aptos aparecem como sem dado", async () => {
      GET_EVOLUCAO.mockResolvedValue({
        data: evolucao({
          ciclos: [
            cicloEvo("c-out", "Outubro de 2026", {
              mediaPorPilar: null,
              aptosNosGates: null,
              congelamentoCompleto: false,
            }),
            cicloEvo("c-nov", "Novembro de 2026", { scoreMedio: 75 }),
          ],
        }),
        response: { status: 200 },
      });
      await abrir();
      expect(await screen.findByText(/Sem dado neste ciclo \(Outubro de 2026\)/)).toBeVisible();
      expect(screen.getByRole("row", { name: /Outubro de 2026/ })).toHaveTextContent(
        "Sem dado neste ciclo",
      );
      expect(screen.getAllByTestId("evo-ponto")).toHaveLength(2);
    });

    it("menos de dois ciclos fechados: estado vazio explicado, sem gráfico", async () => {
      GET_EVOLUCAO.mockResolvedValue({
        data: evolucao({ ciclos: [cicloEvo("c-nov", "Novembro de 2026")] }),
        response: { status: 200 },
      });
      await abrir();
      expect(await screen.findByText("Ainda não há dois ciclos fechados")).toBeVisible();
      expect(
        screen.queryByRole("img", { name: /Média do score da turma/ }),
      ).not.toBeInTheDocument();
    });

    it("filtro por classe chama a API com classeId", async () => {
      GET_RANKING.mockResolvedValue({
        data: {
          itens: [
            { atleta: { id: "a1", classe: { id: "k-ilca6", nome: "ILCA 6" } } },
            { atleta: { id: "a2", classe: { id: "k-470", nome: "470" } } },
            { atleta: { id: "a3", classe: { id: "k-ilca6", nome: "ILCA 6" } } },
          ],
        },
        response: { status: 200 },
      });
      GET_EVOLUCAO.mockResolvedValue({ data: evolucao(), response: { status: 200 } });
      await abrir();
      const seletor = await screen.findByRole("combobox", { name: "Classe" });
      await waitFor(() =>
        expect(
          within(seletor)
            .getAllByRole("option")
            .map((o) => o.textContent),
        ).toEqual(["Todas as classes", "470", "ILCA 6"]),
      );
      fireEvent.change(seletor, { target: { value: "k-ilca6" } });
      await waitFor(() =>
        expect(GET_EVOLUCAO).toHaveBeenCalledWith("/investimento/evolucao", {
          params: { query: { classeId: "k-ilca6" } },
        }),
      );
    });

    it("mostra a mensagem de erro da evolução sem derrubar o painel", async () => {
      GET_EVOLUCAO.mockResolvedValue({
        error: { erro: "nao_encontrado", mensagem: "Classe não encontrada." },
        response: { status: 404 },
      });
      await abrir();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Classe não encontrada."),
      );
      expect(screen.getByRole("heading", { name: "Painel de investimento" })).toBeVisible();
    });
  });
});
