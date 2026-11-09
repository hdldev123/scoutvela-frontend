import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const atualizarGate = vi.fn();
const criarRevisao = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { GET: (...args: unknown[]) => GET(...args) },
}));
vi.mock("@/lib/api/mutacoes-ficha", () => ({
  atualizarGate: (...a: unknown[]) => atualizarGate(...a),
  criarRevisao: (...a: unknown[]) => criarRevisao(...a),
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...resto
  }: {
    children: ReactNode;
    to: string;
    params?: { id: string };
    search?: Record<string, string>;
  } & Record<string, unknown>) => (
    <a
      href={
        (params ? to.replace("$id", params.id) : to) + (search ? `?atleta=${search["atleta"]}` : "")
      }
      {...resto}
    >
      {children}
    </a>
  ),
}));

import { TelaFicha } from "@/components/scout/TelaFicha";
import type { FichaAtleta } from "@/lib/api/consultas";

function pilar(
  id: string,
  nome: string,
  peso: number,
  nota: number | null,
  extra: Partial<FichaAtleta["pilares"][number]> = {},
) {
  return {
    id,
    nome,
    nomeCurto: nome,
    peso,
    nota,
    contribuicao: nota == null ? 0 : (nota / 5) * peso,
    preenchidos: nota == null ? 0 : 1,
    total: 1,
    restrito: false,
    indicadores: [
      {
        id: `${id}_1`,
        nome: `Indicador de ${nome}`,
        tipo: "T" as const,
        calculado: false,
        nota,
        evidencia: nota == null ? null : "Teste de campo",
        origem: nota == null ? null : ("avaliacao" as const),
        avaliador: nota == null ? null : { id: "u1", nome: "Ana Ribeiro" },
        lancadoEm: nota == null ? null : "2026-11-05T12:00:00.000Z",
        resposta: null,
        sugestaoPendente: null,
      },
    ],
    ...extra,
  };
}

function ficha(extra: Partial<FichaAtleta> = {}): FichaAtleta {
  return {
    atleta: {
      id: "a07",
      nome: "Helena Vasques",
      velaid: "SC-T07",
      numeroVela: "BRA 123",
      genero: "F",
      idade: 21,
      funcao: "Timoneira",
      clube: "Clube Náutico",
      cidade: "Florianópolis",
      uf: "SC",
      termoAceito: true,
      classe: { id: "c1", nome: "ILCA 6", evento: "ILCA 6", posicao: "ind" },
    },
    contato: { email: null, treinador: { id: "t1", nome: "Ana Ribeiro" } },
    ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
    score: 71.5,
    faixa: { id: "f3", nome: "Em desenvolvimento", nomeCurto: "Em desenvolvimento" },
    completo: false,
    preenchidos: 2,
    total: 3,
    pontosCbvela: 900,
    historicoScore: [
      { ciclo: "Setembro de 2026", score: 60 },
      { ciclo: "Outubro de 2026", score: 66 },
    ],
    pilares: [
      pilar("perf", "Performance", 20, 4),
      pilar("cf", "Class Fit", 20, 2),
      pilar("car", "Carreira", 5, null),
    ],
    gates: {
      statusFinal: "condicional",
      itens: [
        {
          gate: 1,
          nome: "Class Fit",
          status: "apto",
          motivo: "Dentro da faixa da classe",
          sugestaoAutomatica: "apto",
          ajustadoPeloGestor: false,
        },
        {
          gate: 2,
          nome: "Evidência competitiva",
          status: "condicional",
          motivo: "4º no Brasileiro",
          sugestaoAutomatica: "alerta",
          ajustadoPeloGestor: true,
        },
        {
          gate: 3,
          nome: "Alto rendimento",
          status: "alerta",
          motivo: "Nenhum evento",
          sugestaoAutomatica: "alerta",
          ajustadoPeloGestor: false,
        },
        {
          gate: 4,
          nome: "Campanha",
          status: "condicional",
          motivo: "Depende de apoio",
          sugestaoAutomatica: "condicional",
          ajustadoPeloGestor: false,
        },
      ],
    },
    classFit: {
      pesoKg: 62,
      alturaCm: 172,
      pesoMinKg: 55,
      pesoMedioKg: 60,
      pesoMaxKg: 65,
      deltaKg: 2,
      distanciaRelativa: 0.4,
    },
    resultados: [
      {
        data: "2026-03-10",
        nivel: "Brasileiro",
        evento: "Brasileiro ILCA",
        posicao: 4,
        tamanhoFrota: 40,
        internacional: false,
        pontosCbvela: 900,
        fonte: "ranking_cbvela",
        linkOficial: null,
      },
      {
        data: "2026-06-01",
        nivel: "Sul-Americano",
        evento: "Sul-Americano",
        posicao: 9,
        tamanhoFrota: 30,
        internacional: true,
        pontosCbvela: null,
        fonte: "manual",
        linkOficial: "https://oficial.exemplo.com/r",
      },
    ],
    financeiro: {
      perfilSuporte: "C",
      mesesAssegurados: 12,
      patrocinioPrivado: "nao",
      componentes: [
        { id: "treinador", nome: "Treinador", autonomia: "Baixa", apoioCbvela: "Alta" },
      ],
    },
    ...extra,
  };
}

function montar(papel: string, dados: FichaAtleta | { erro: number }) {
  GET.mockResolvedValue(
    "erro" in dados
      ? {
          error: { erro: "nao_encontrado", mensagem: "Atleta não encontrado." },
          response: { status: dados.erro },
        }
      : { data: dados, response: { status: 200 } },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaFicha id="a07" papel={papel} />
    </QueryClientProvider>,
  );
}

describe("TelaFicha", () => {
  beforeEach(() => {
    GET.mockReset();
    atualizarGate.mockReset();
    criarRevisao.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
  });

  it("mostra cabeçalho, score, pill Parcial e plano individual", async () => {
    montar("gestor", ficha());
    expect(await screen.findByRole("heading", { name: "Helena Vasques" })).toBeInTheDocument();
    expect(screen.getByText("71,5")).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText("Treinador(a): Ana Ribeiro")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Score nos últimos ciclos: 60,0, 66,0, 71,5/ }),
    ).toBeInTheDocument();
    const plano = screen.getByRole("heading", { name: "Plano individual" }).closest("section")!;
    // Só 2 pilares com nota: forças (2 maiores) e lacunas (2 menores) coincidem, como no protótipo.
    expect(within(plano).getAllByText("Performance e Class Fit")).toHaveLength(2);
    expect(within(plano).getByText("Fechar os gates em aberto")).toBeInTheDocument();
  });

  it("meta de 12 meses usa Top 10 quando há resultado de nível mundial (valor em minúsculas)", async () => {
    const base = ficha();
    montar(
      "gestor",
      ficha({
        resultados: [{ ...base.resultados![0]!, nivel: "mundial", evento: "Mundial ILCA 6" }],
      }),
    );
    expect(await screen.findByText("Top 10 no Mundial da classe")).toBeInTheDocument();
  });

  it("pilar abre como acordeão e marca a maior perda de pontos", async () => {
    montar("gestor", ficha());
    const botao = await screen.findByRole("button", { name: /^Class Fit/ });
    expect(botao).toHaveTextContent("maior perda de pontos");
    expect(botao).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Teste de campo · Ana Ribeiro · 05/11/2026")).toBeInTheDocument();
  });

  it("mostra resposta confirmada, sugestão pendente e indicador do tipo R", async () => {
    const f = ficha();
    const base = f.pilares[0]!;
    f.pilares[0] = {
      ...base,
      indicadores: [
        {
          ...base.indicadores![0]!,
          id: "x1",
          nome: "Sono",
          tipo: "A",
          origem: "resposta_confirmada",
          resposta: "Bom",
        },
        {
          ...base.indicadores![0]!,
          id: "x2",
          nome: "Humor",
          tipo: "A",
          nota: null,
          evidencia: null,
          origem: null,
          avaliador: null,
          lancadoEm: null,
          sugestaoPendente: { valor: 3, lancadoEm: "2026-11-06T10:00:00Z" },
        },
        { ...base.indicadores![0]!, id: "x3", nome: "Histórico familiar", tipo: "R", nota: null },
      ],
    };
    montar("atleta", f);
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    expect(screen.getByText(/Resposta do atleta · nota de Ana Ribeiro/)).toBeInTheDocument();
    expect(screen.getByText("Sugestão do atleta: 3, aguardando avaliador")).toBeInTheDocument();
    expect(screen.getByText(/Registrado, não pontua \(proposta P5\)/)).toBeInTheDocument();
  });

  it("detalhe restrito mostra o cadeado e Class Fit/financeiro ocultos para o IBVAR", async () => {
    const f = ficha({ classFit: null, financeiro: { perfilSuporte: "D" } });
    f.pilares[1] = { ...f.pilares[1]!, restrito: true, indicadores: null };
    montar("ibvar", f);
    fireEvent.click(await screen.findByRole("button", { name: /^Class Fit/ }));
    expect(screen.getByText(/Detalhe restrito/)).toBeInTheDocument();
    expect(screen.getByText(/Peso e medidas são dado sensível/)).toBeInTheDocument();
    expect(
      screen.getByText(/Componentes de custo restritos ao atleta e ao gestor/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pedir revisão/ })).not.toBeInTheDocument();
  });

  it("termo pendente exibe a nota de aguardando aceite", async () => {
    const f = ficha();
    f.atleta.termoAceito = false;
    montar("gestor", f);
    expect(
      await screen.findByText(/Aguardando aceite do termo: o atleta ainda não entra no ranking\./),
    ).toBeInTheDocument();
  });

  it("histórico competitivo mostra a fonte e só liga links http(s)", async () => {
    montar("gestor", ficha());
    expect(await screen.findByText("Ranking CBVela")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Lançado + link oficial" });
    expect(link).toHaveAttribute("href", "https://oficial.exemplo.com/r");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("4º de 40")).toBeInTheDocument();
  });

  it("gestor ajusta um gate pelo select e vê o toast", async () => {
    const f = ficha();
    atualizarGate.mockResolvedValue({
      ...f.gates,
      itens: f.gates.itens.map((g) => (g.gate === 3 ? { ...g, status: "condicional" } : g)),
    });
    montar("gestor", f);
    const select = await screen.findByLabelText("Status do gate G3");
    expect(screen.getByText(/ajustado pelo gestor/)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "condicional" } });
    await waitFor(() =>
      expect(atualizarGate).toHaveBeenCalledWith("a07", { gate: 3, status: "condicional" }),
    );
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("G3 atualizado pelo gestor"));
  });

  it("treinador e atleta não têm select de gate; treinador lança avaliação", async () => {
    montar("treinador", ficha());
    expect(await screen.findByRole("link", { name: "Lançar avaliação" })).toHaveAttribute(
      "href",
      "/avaliar?atleta=a07",
    );
    expect(screen.queryByLabelText("Status do gate G1")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Meus atletas/ })).toHaveAttribute("href", "/ranking");
  });

  it("atleta pede revisão de uma nota", async () => {
    criarRevisao.mockResolvedValue({ id: "r1", status: "aberto" });
    montar("atleta", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Pedir revisão de uma nota" }));
    const dialogo = screen.getByRole("dialog");

    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar pedido" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Escolha o pilar");

    fireEvent.change(within(dialogo).getByLabelText("Pilar"), { target: { value: "perf" } });
    fireEvent.change(within(dialogo).getByLabelText("Indicador (opcional)"), {
      target: { value: "perf_1" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Motivo"), { target: { value: "curto" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar pedido" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("pelo menos 10 caracteres");
    expect(criarRevisao).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText("Motivo"), {
      target: { value: "Fiz um teste novo em outubro." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar pedido" }));
    await waitFor(() =>
      expect(criarRevisao).toHaveBeenCalledWith({
        pilarId: "perf",
        indicadorId: "perf_1",
        motivo: "Fiz um teste novo em outubro.",
      }),
    );
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Pedido de revisão enviado ao gestor da CBVela"),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("404 vira 'Sem acesso para este perfil'", async () => {
    montar("treinador", { erro: 404 });
    expect(await screen.findByText("Sem acesso para este perfil")).toBeInTheDocument();
    expect(screen.getByText(/Este perfil não vê a ficha deste atleta/)).toBeInTheDocument();
  });
});
