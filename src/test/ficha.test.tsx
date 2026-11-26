import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const atualizarGate = vi.fn();
const criarRevisao = vi.fn();
const registrarPlano = vi.fn();
const atualizarFinanceiro = vi.fn();
const lancarResultado = vi.fn();
const registrarAptidao = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();
const linkEvidencia = vi.hoisted(() => ({ url: "https://storage.exemplo.com/a.pdf?assinatura=1" }));
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    PUT: (...args: unknown[]) => PUT(...args),
    DELETE: (...args: unknown[]) => DELETE(...args),
  },
}));
vi.mock("@/lib/api/mutacoes-ficha", () => ({
  atualizarGate: (...a: unknown[]) => atualizarGate(...a),
  criarRevisao: (...a: unknown[]) => criarRevisao(...a),
  registrarPlano: (...a: unknown[]) => registrarPlano(...a),
  atualizarFinanceiro: (...a: unknown[]) => atualizarFinanceiro(...a),
  lancarResultado: (...a: unknown[]) => lancarResultado(...a),
  registrarAptidao: (...a: unknown[]) => registrarAptidao(...a),
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
import { ErroApi } from "@/lib/api/cliente";
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
        link: null,
        origem: nota == null ? null : ("avaliacao" as const),
        avaliador: nota == null ? null : { id: "u1", nome: "Ana Ribeiro" },
        lancadoEm: nota == null ? null : "2026-11-05T12:00:00.000Z",
        resposta: null,
        sugestaoPendente: null,
        justificativa: null,
        explicacao: null,
        resultado: null,
        anexo: null,
      },
    ],
    ...extra,
  };
}

const RES_BASE = {
  status: "validado" as const,
  motivo: null,
  anexo: null,
  validadoPor: null,
  validadoEm: null,
};

function ficha(extra: Partial<FichaAtleta> = {}): FichaAtleta {
  return {
    atleta: {
      id: "a07",
      nome: "Helena Vasques",
      wsId: "BRAHV07",
      velaid: "SC-T07",
      numeroVela: "BRA 123",
      genero: "F",
      idade: 21,
      funcao: "Timoneira",
      clube: "Clube Náutico",
      cidade: "Florianópolis",
      uf: "SC",
      fotoUrl: null,
      bio: null,
      termoAceito: true,
      classe: { id: "c1", nome: "ILCA 6", evento: "ILCA 6", posicao: "ind" },
    },
    contato: {
      email: null,
      treinador: { id: "t1", nome: "Ana Ribeiro" },
      telefone: null,
      passaporteValidoAte: null,
      aptidao: null,
    },
    ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
    dadosAtualizadosEm: null,
    score: 71.5,
    faixa: { id: "f3", nome: "Em desenvolvimento", nomeCurto: "Em desenvolvimento" },
    completo: false,
    preenchidos: 2,
    total: 3,
    pontosCbvela: 900,
    plano: null,
    sugestaoPlano: null,
    mediaTurmaPorCiclo: [],
    comparacaoTurma: null,
    tendencia: null,
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
      altura: { cm: 172, minCm: 165, mediaCm: 172, maxCm: 180, situacao: "dentro" as const },
      pesoMinKg: 55,
      pesoMedioKg: 60,
      pesoMaxKg: 65,
      deltaKg: 2,
      distanciaRelativa: 0.4,
      fonte: null,
    },
    conquistas: [],
    resultados: [
      {
        ...RES_BASE,
        id: "r1",
        edicao: 2026,
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
        ...RES_BASE,
        id: "r2",
        edicao: 2026,
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

const PARAMETROS = {
  componentesCusto: [
    { id: "treinador", nome: "Treinador" },
    { id: "viagens", nome: "Viagens" },
  ],
};

const ANEXOS = {
  anexos: [
    {
      id: "e1",
      nomeArquivo: "teste-de-campo.pdf",
      tipoMime: "application/pdf",
      tamanhoBytes: 1000,
      indicadorId: "perf_1",
      categoria: "evidencia" as const,
      enviadoPor: { papel: "treinador" as const },
      enviadoEm: "2026-11-05T12:00:00.000Z",
      removidoEm: null,
    },
    {
      id: "e2",
      nomeArquivo: "sumula-brasileiro.pdf",
      tipoMime: "application/pdf",
      tamanhoBytes: 2 * 1024 * 1024,
      indicadorId: null,
      categoria: "sumula" as const,
      enviadoPor: { papel: "atleta" as const },
      enviadoEm: "2026-11-06T12:00:00.000Z",
      removidoEm: null,
    },
    {
      id: "e3",
      nomeArquivo: "balanca.jpg",
      tipoMime: "image/jpeg",
      tamanhoBytes: 500 * 1024,
      indicadorId: null,
      categoria: "balanca" as const,
      enviadoPor: { papel: "gestor" as const },
      enviadoEm: "2026-11-07T12:00:00.000Z",
      removidoEm: null,
    },
  ],
  usoBytes: 2 * 1024 * 1024 + 1000 + 500 * 1024,
  cotaBytes: 200 * 1024 * 1024,
};

const SEM_AUTOAVALIACAO = {
  ciclo: null,
  indicadores: [],
  orientacoesResultados: [],
  rubricas: [],
  resumoPorPilar: null,
};
let autoavaliacao: unknown = SEM_AUTOAVALIACAO;
let pesagens: unknown = { itens: [] };
let resultadosApi: ({ status: string } & Record<string, unknown>)[] = [];
const WS_VAZIO = {
  perfilUrl: "https://www.sailing.org/sailor/?ref=BRAHV07",
  importacaoAtiva: true,
  ultimaImportacao: null,
  ranking: [] as unknown[],
};
let wsApi: unknown = WS_VAZIO;
let conquistasApi: { automaticas: unknown[]; manuais: unknown[] } = {
  automaticas: [],
  manuais: [],
};

function montar(papel: string, dados: FichaAtleta | { erro: number }) {
  GET.mockImplementation((caminho: string, opcoes?: unknown) => {
    if (caminho === "/atletas/{id}/autoavaliacao") {
      return Promise.resolve({ data: autoavaliacao, response: { status: 200 } });
    }
    if (caminho === "/atletas/{id}/pesagens") {
      return Promise.resolve({ data: pesagens, response: { status: 200 } });
    }
    if (caminho === "/atletas/{id}/resultados") {
      const status = (opcoes as { params?: { query?: { status?: string } } } | undefined)?.params
        ?.query?.status;
      return Promise.resolve({
        data: { itens: resultadosApi.filter((x) => !status || x.status === status) },
        response: { status: 200 },
      });
    }
    if (caminho === "/atletas/{id}/world-sailing") {
      return Promise.resolve({ data: wsApi, response: { status: 200 } });
    }
    if (caminho === "/atletas/{id}/conquistas") {
      return Promise.resolve({ data: conquistasApi, response: { status: 200 } });
    }
    if (caminho === "/parametros") {
      return Promise.resolve({ data: PARAMETROS, response: { status: 200 } });
    }
    if (caminho === "/atletas/{id}/evidencias") {
      return Promise.resolve({ data: ANEXOS, response: { status: 200 } });
    }
    if (caminho === "/evidencias/{id}/link") {
      return Promise.resolve({
        data: { url: linkEvidencia.url, expiraEm: "2026-11-09T12:05:00.000Z" },
        response: { status: 200 },
      });
    }
    return Promise.resolve(
      "erro" in dados
        ? {
            error: { erro: "nao_encontrado", mensagem: "Atleta não encontrado." },
            response: { status: dados.erro },
          }
        : { data: dados, response: { status: 200 } },
    );
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaFicha id="a07" papel={papel} />
    </QueryClientProvider>,
  );
}

const SUGESTAO = {
  forcas: "Performance e Técnica",
  lacunas: "Carreira",
  meta12m: "Primeiro Mundial da classe",
  meta24m: "Fechar os gates em aberto",
  recomendacao: "Em desenvolvimento, com apoio para viagens",
};
const PLANO = {
  forcas: "Regata de vento forte",
  lacunas: "Largada",
  meta12m: "Top 20 no Mundial",
  meta24m: "Top 10 no Mundial",
  recomendacao: "Manter o ciclo atual",
  registradoPor: { id: "u1", nome: "Ana Ribeiro" },
  registradoEm: "2026-11-02T12:00:00.000Z",
};

describe("TelaFicha", () => {
  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    wsApi = WS_VAZIO;
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
    atualizarGate.mockReset();
    criarRevisao.mockReset();
    registrarPlano.mockReset();
    atualizarFinanceiro.mockReset();
    lancarResultado.mockReset();
    POST.mockReset();
    DELETE.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
  });

  it("mostra cabeçalho, score e pill Parcial", async () => {
    montar("gestor", ficha());
    expect(await screen.findByRole("heading", { name: "Helena Vasques" })).toBeInTheDocument();
    const ws = screen.getByRole("link", {
      name: /Perfil de Helena Vasques no World Sailing [(]abre em nova aba[)]/,
    });
    expect(ws).toHaveAttribute("href", "https://www.sailing.org/sailor/?ref=BRAHV07");
    expect(ws).toHaveAttribute("target", "_blank");
    // D2: o número de vela é informação secundária, depois do WS ID e da classe.
    const fatos = ws.closest("ul")!;
    const itens = Array.from(fatos.querySelectorAll(":scope > li")).map((li) => li.textContent);
    const iVela = itens.findIndex((t) => t?.includes("Nº de vela BRA 123"));
    const iWs = itens.findIndex((t) => t?.includes("ID World Sailing"));
    expect(iVela).toBeGreaterThan(iWs);
    expect(iWs).toBe(0);
    expect(screen.getByText("71,5")).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText("Ana Ribeiro", { exact: false, selector: "li" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Score nos últimos ciclos: 60,0, 66,0, 71,5/ }),
    ).toBeInTheDocument();
  });

  it("mostra a data da última atualização dos dados só quando a API a devolve", async () => {
    montar("ibvar", ficha({ dadosAtualizadosEm: "2026-11-07T02:30:00.000Z" }));
    expect(
      await screen.findByText("Dados deste atleta atualizados em 06/11/2026"),
    ).toBeInTheDocument();
  });

  it("sem dadosAtualizadosEm não mostra a linha de atualização", async () => {
    montar("gestor", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByText(/Dados deste atleta atualizados/)).not.toBeInTheDocument();
  });

  it("mostra a foto do atleta só quando fotoUrl vem preenchida", async () => {
    const base = ficha();
    montar("gestor", ficha({ atleta: { ...base.atleta, fotoUrl: "https://x.test/f.jpg" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(document.querySelector(".athlete-head img")).toHaveAttribute(
      "src",
      "https://x.test/f.jpg",
    );
  });

  it("sem fotoUrl não renderiza imagem", async () => {
    montar("gestor", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(document.querySelector(".athlete-head img")).toBeNull();
  });

  it("plano registrado mostra autor e data, sem usar a sugestão", async () => {
    montar("gestor", ficha({ plano: PLANO, sugestaoPlano: SUGESTAO }));
    const secao = (await screen.findByRole("heading", { name: "Plano individual" })).closest(
      "section",
    )!;
    expect(within(secao).getByText("Registrado por Ana Ribeiro em 02/11/2026")).toBeInTheDocument();
    expect(within(secao).getByText("Regata de vento forte")).toBeInTheDocument();
    expect(within(secao).queryByText(SUGESTAO.forcas)).not.toBeInTheDocument();
    expect(within(secao).queryByText(/Sugestão automática/)).not.toBeInTheDocument();
  });

  it("sem plano registrado mostra a sugestão da API, marcada", async () => {
    montar("treinador", ficha({ sugestaoPlano: SUGESTAO }));
    const secao = (await screen.findByRole("heading", { name: "Plano individual" })).closest(
      "section",
    )!;
    expect(within(secao).getByText("Sugestão automática")).toBeInTheDocument();
    expect(within(secao).getByText(SUGESTAO.recomendacao)).toBeInTheDocument();
  });

  it("gestor registra o plano a partir da sugestão e envia o corpo certo", async () => {
    registrarPlano.mockResolvedValue({ ...PLANO });
    montar("gestor", ficha({ sugestaoPlano: SUGESTAO }));
    fireEvent.click(await screen.findByRole("button", { name: "Registrar plano" }));
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByLabelText("Forças")).toHaveValue(SUGESTAO.forcas);
    fireEvent.change(within(dialogo).getByLabelText("Lacunas"), { target: { value: "  " } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar plano" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Preencha o campo “Lacunas”");
    expect(registrarPlano).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Lacunas"), { target: { value: "Largada" } });
    fireEvent.change(within(dialogo).getByLabelText("Meta 12 meses"), {
      target: { value: "Top 20" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar plano" }));
    await waitFor(() =>
      expect(registrarPlano).toHaveBeenCalledWith("a07", {
        forcas: SUGESTAO.forcas,
        lacunas: "Largada",
        meta12m: "Top 20",
        meta24m: SUGESTAO.meta24m,
        recomendacao: SUGESTAO.recomendacao,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("IBVAR não vê plano nem evidências quando a API não devolve plano", async () => {
    montar("ibvar", ficha({ classFit: null, financeiro: { perfilSuporte: "D" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Plano individual" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Documentos" })).not.toBeInTheDocument();
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/evidencias", expect.anything());
  });

  it("atleta vê o plano sem botão de registrar", async () => {
    montar("atleta", ficha({ plano: PLANO }));
    await screen.findByText(/Registrado por Ana Ribeiro/);
    expect(screen.queryByRole("button", { name: "Registrar plano" })).not.toBeInTheDocument();
  });

  it("financeiro: o gestor abre o diálogo e o PUT leva o corpo preenchido", async () => {
    atualizarFinanceiro.mockResolvedValue({});
    montar("gestor", ficha());
    const atualizar = await screen.findByRole("button", { name: "Atualizar financeiro" });
    // Título e ação no mesmo cabeçalho de cartão, com botão compacto.
    expect(atualizar.parentElement).toContainElement(
      screen.getByRole("heading", { name: "Sustentabilidade da campanha" }),
    );
    expect(atualizar.className).toContain("sm");
    fireEvent.click(atualizar);
    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText(/não entra no score/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/gate G4/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Perfil de suporte")).toHaveValue("C");
    expect(within(dialogo).getByLabelText("Meses assegurados")).toHaveValue(12);
    expect(
      within(dialogo).getByRole("option", { name: "D · Estrutura insuficiente" }),
    ).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText("Perfil de suporte"), {
      target: { value: "B" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Meses assegurados"), {
      target: { value: "24" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Patrocínio privado"), {
      target: { value: "em_negociacao" },
    });
    fireEvent.change(document.getElementById("fin-apoio-viagens")!, { target: { value: "alta" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar financeiro" }));
    await waitFor(() =>
      expect(atualizarFinanceiro).toHaveBeenCalledWith("a07", {
        perfilSuporte: "B",
        mesesAssegurados: 24,
        patrocinioPrivado: "em_negociacao",
        componentes: [
          { componenteId: "treinador", autonomia: "baixa", apoioCbvela: "alta" },
          { componenteId: "viagens", autonomia: "parcial", apoioCbvela: "alta" },
        ],
      }),
    );
  });

  it("treinador não vê o botão de atualizar financeiro", async () => {
    montar("treinador", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("button", { name: "Atualizar financeiro" })).not.toBeInTheDocument();
  });

  it("resultado internacional: exige https, mostra erro 409 e envia o corpo certo", async () => {
    lancarResultado.mockRejectedValueOnce(
      new ErroApi(409, "requisicao_invalida", "Resultado já lançado para este evento."),
    );
    lancarResultado.mockResolvedValueOnce({});
    montar("treinador", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Lançar resultado internacional" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Nível"), { target: { value: "continental" } });
    fireEvent.change(within(dialogo).getByLabelText("Evento"), {
      target: { value: "Pan-Americano ILCA 6" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Data"), { target: { value: "2026-08-10" } });
    fireEvent.change(within(dialogo).getByLabelText("Posição"), { target: { value: "5" } });
    fireEvent.change(within(dialogo).getByLabelText("Tamanho da frota"), {
      target: { value: "60" },
    });
    fireEvent.change(within(dialogo).getByLabelText(/Link do resultado oficial/), {
      target: { value: "http://inseguro.exemplo.com/r" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Lançar resultado" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("começar com https://");
    expect(lancarResultado).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText(/Link do resultado oficial/), {
      target: { value: "https://oficial.exemplo.com/pan" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Lançar resultado" }));
    expect(await within(dialogo).findByText("Resultado já lançado para este evento.")).toBeTruthy();
    expect(lancarResultado).toHaveBeenCalledWith("a07", {
      nivel: "continental",
      evento: "Pan-Americano ILCA 6",
      data: "2026-08-10",
      posicao: 5,
      tamanhoFrota: 60,
      linkOficial: "https://oficial.exemplo.com/pan",
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Lançar resultado" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("atleta não lança resultado; a tabela mostra o nível legível", async () => {
    const f = ficha();
    f.resultados[1] = { ...f.resultados[1]!, nivel: "internacional_aberto", evento: "Aberto X" };
    montar("atleta", f);
    expect(await screen.findByText("Internacional aberto")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lançar resultado internacional" }),
    ).not.toBeInTheDocument();
  });

  it("Class Fit mostra a faixa de peso como parâmetro da metodologia", async () => {
    montar("atleta", ficha());
    expect(
      await screen.findByText(
        /Faixa de peso de referência da classe \(parâmetro da metodologia\)\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Word do Juan/)).not.toBeInTheDocument();
  });

  describe("Altura no Class Fit", () => {
    const comAltura = (altura: Partial<NonNullable<FichaAtleta["classFit"]>["altura"]>) => {
      const base = ficha();
      return ficha({
        classFit: { ...base.classFit!, altura: { ...base.classFit!.altura, ...altura } },
      });
    };

    it("desenha os dois medidores com rótulos curtos e a nota informativa", async () => {
      montar("gestor", ficha());
      expect(await screen.findByRole("img", { name: /^Peso de 62,0 kg/ })).toBeInTheDocument();
      const alt = screen.getByRole("img", { name: /^Altura de 172 cm/ });
      expect(alt).toHaveAccessibleName(
        "Altura de 172 cm, dentro da faixa, faixa da classe ILCA 6 de 165 a 180 cm, média 172",
      );
      expect(within(alt as unknown as HTMLElement).getByText("172 cm")).toBeInTheDocument();
      expect(screen.getByText("Peso", { selector: ".medidor-rotulo" })).toBeInTheDocument();
      expect(screen.getByText("Altura", { selector: ".medidor-rotulo" })).toBeInTheDocument();
      expect(screen.queryByText(/Altura: 172 cm/)).not.toBeInTheDocument();
      expect(
        screen.getByText("A altura é informativa: não entra no score nem nos gates."),
      ).toBeInTheDocument();
    });

    it.each([
      ["abaixo", 160, "abaixo da faixa"],
      ["acima", 188, "acima da faixa"],
    ] as const)("situação %s vem do servidor", async (situacao, cm, texto) => {
      montar("gestor", comAltura({ cm, situacao }));
      const alt = await screen.findByRole("img", { name: /^Altura de/ });
      expect(alt.getAttribute("aria-label")).toContain(`${cm} cm, ${texto}, faixa da classe`);
      expect(alt.getAttribute("aria-label")).toContain("de 165 a 180 cm, média 172");
    });

    it("sem faixa mostra a altura como texto e a nota", async () => {
      montar("gestor", comAltura({ minCm: null, mediaCm: null, maxCm: null, situacao: null }));
      expect(await screen.findByText("172 cm")).toBeInTheDocument();
      expect(
        screen.getByText("Faixa de altura da classe não definida (parâmetro da metodologia)."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /^Altura de/ })).not.toBeInTheDocument();
    });

    it("sem altura mostra 'Altura não registrada'", async () => {
      montar("gestor", comAltura({ cm: null, situacao: null }));
      expect(await screen.findByText("Altura não registrada")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /^Altura de/ })).not.toBeInTheDocument();
    });

    it("IBVAR não recebe o cartão de medidores", async () => {
      montar("ibvar", ficha({ classFit: null }));
      fireEvent.click(await screen.findByRole("button", { name: /^Class Fit/ }));
      expect(screen.queryByRole("img", { name: /^Altura de/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /^Peso de/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Altura não registrada")).not.toBeInTheDocument();
    });
  });

  it("histórico traduz todos os níveis para pt-BR", async () => {
    const base = ficha();
    const f = {
      ...base,
      resultados: [
        "mundial",
        "sul_americano",
        "continental",
        "internacional_aberto",
        "brasileiro",
        "estadual",
        "regional",
      ].map((nivel, i) => ({ ...base.resultados[0]!, id: `n${i}`, nivel, evento: `Evento ${i}` })),
    };
    montar("atleta", f);
    for (const rotulo of [
      "Mundial",
      "Sul-Americano",
      "Continental",
      "Internacional aberto",
      "Brasileiro",
      "Estadual",
      "Regional",
    ]) {
      expect(
        await within(
          await screen.findByRole("region", { name: /Tabela de histórico competitivo/ }),
        ).findByText(rotulo),
      ).toBeInTheDocument();
    }
  });

  it("evidências: abre a aba no clique e navega ao link; data: baixa; erro fecha a aba", async () => {
    const cliques: { download: string; target: string }[] = [];
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      cliques.push({ download: this.download, target: this.target });
    });
    const aba = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    const abrir = vi.spyOn(window, "open").mockReturnValue(aba as unknown as Window);
    montar("atleta", ficha());
    const secao = (await screen.findByRole("heading", { name: "Documentos" })).closest("section")!;
    expect(await within(secao).findByText("teste-de-campo.pdf")).toBeInTheDocument();
    expect(
      within(secao).getByText(/Indicador de Performance · enviado por o treinador · 05\/11\/2026/),
    ).toBeInTheDocument();
    expect(within(secao).getByRole("button", { name: "Anexar arquivo" })).toBeInTheDocument();

    fireEvent.click(within(secao).getByRole("button", { name: "Abrir teste-de-campo.pdf" }));
    expect(abrir).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(aba.location.href).toContain("https://storage.exemplo.com/a.pdf"));
    expect(aba.opener).toBeNull();
    expect(aba.close).not.toHaveBeenCalled();

    linkEvidencia.url = "data:application/pdf;base64,AAAA";
    fireEvent.click(within(secao).getByRole("button", { name: "Abrir teste-de-campo.pdf" }));
    await waitFor(() => expect(cliques).toHaveLength(1));
    expect(cliques[0]).toMatchObject({ download: "teste-de-campo.pdf", target: "" });
    expect(aba.close).toHaveBeenCalledTimes(1);

    linkEvidencia.url = "javascript:alert(1)";
    fireEvent.click(within(secao).getByRole("button", { name: "Abrir teste-de-campo.pdf" }));
    await waitFor(() => expect(aba.close).toHaveBeenCalledTimes(2));
    expect(cliques).toHaveLength(1);

    linkEvidencia.url = "https://storage.exemplo.com/a.pdf?assinatura=1";
    abrir.mockRestore();
    clique.mockRestore();
  });

  it("evidências: recusa arquivo grande ou de formato errado antes de enviar", async () => {
    montar("treinador", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Anexar arquivo" }));
    const dialogo = screen.getByRole("dialog");
    const campo = within(dialogo).getByLabelText("Arquivo");
    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(campo, { target: { files: [grande] } });
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("passa de 5 MB");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar arquivo" }));
    const texto = new File(["oi"], "nota.txt", { type: "text/plain" });
    fireEvent.change(campo, { target: { files: [texto] } });
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Formato não aceito");
    expect(POST).not.toHaveBeenCalled();
  });

  it("evidências: envia o arquivo em base64 com o indicador", async () => {
    POST.mockResolvedValue({
      data: { ...ANEXOS.anexos[0], id: "e2" },
      response: { status: 201 },
    });
    montar("gestor", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Anexar arquivo" }));
    const dialogo = screen.getByRole("dialog");
    const arquivo = new File(["abc"], "foto.png", { type: "image/png" });
    fireEvent.change(within(dialogo).getByLabelText("Arquivo"), { target: { files: [arquivo] } });
    fireEvent.change(within(dialogo).getByLabelText("Indicador (opcional)"), {
      target: { value: "perf_1" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar arquivo" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/evidencias", {
        params: { path: { id: "a07" } },
        body: {
          nomeArquivo: "foto.png",
          tipoMime: "image/png",
          conteudoBase64: "YWJj",
          indicadorId: "perf_1",
          categoria: "evidencia",
        },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("indicador com anexo mostra o clipe com o nome do arquivo", async () => {
    const f = ficha();
    f.pilares[0] = {
      ...f.pilares[0]!,
      indicadores: [
        { ...f.pilares[0]!.indicadores![0]!, anexo: { id: "e1", nomeArquivo: "video-teste.pdf" } },
      ],
    };
    montar("gestor", f);
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    expect(screen.getByRole("button", { name: "video-teste.pdf" })).toBeInTheDocument();
  });

  it("Ver histórico lista os lançamentos do indicador com o que a API devolve", async () => {
    montar("gestor", ficha());
    const anterior = GET.getMockImplementation()!;
    GET.mockImplementation((caminho: string, opcoes: unknown) =>
      caminho === "/atletas/{id}/indicadores/{indicadorId}/historico"
        ? Promise.resolve({
            data: [
              {
                valor: 4,
                pesoKg: null,
                evidencia: "Brasileiro 2026",
                link: "https://youtu.be/regata",
                origem: "avaliacao",
                pendente: false,
                avaliador: { id: "u1", nome: "Ana Ribeiro" },
                cicloNome: "Novembro de 2026",
                lancadoEm: "2026-11-05T12:00:00.000Z",
                anexo: { id: "e9", nomeArquivo: "sumula.pdf" },
              },
              {
                valor: 3,
                pesoKg: null,
                evidencia: null,
                origem: "resposta_sugerida",
                pendente: true,
                avaliador: null,
                cicloNome: null,
                lancadoEm: "2026-10-02T12:00:00.000Z",
                anexo: null,
              },
            ],
            response: { status: 200 },
          })
        : anterior(caminho, opcoes),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ver histórico de Indicador de Performance" }),
    );
    const dialogo = await screen.findByRole("dialog", {
      name: "Histórico: Indicador de Performance",
    });
    await within(dialogo).findByText("Evidência: Brasileiro 2026");
    expect(GET).toHaveBeenCalledWith("/atletas/{id}/indicadores/{indicadorId}/historico", {
      params: { path: { id: "a07", indicadorId: "perf_1" } },
    });
    const itens = within(dialogo).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("05/11/2026 · Novembro de 2026");
    expect(itens[0]).toHaveTextContent("Avaliação · Ana Ribeiro");
    expect(within(itens[0]!).getByRole("button", { name: "sumula.pdf" })).toBeInTheDocument();
    expect(itens[1]).toHaveTextContent("Sugestão do atleta, aguardando avaliador");
    expect(itens[1]).not.toHaveTextContent("Evidência:");
    expect(itens[1]).toHaveTextContent("Sem evidência registrada");
    const video = within(itens[0]!).getByRole("link", { name: "Ver vídeo (abre em nova aba)" });
    expect(video).toHaveAttribute("href", "https://youtu.be/regata");
    expect(video).toHaveAttribute("target", "_blank");
    expect(video).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(itens[1]!).queryByRole("link", { name: /Ver vídeo/ })).toBeNull();
  });

  it("indicador com link mostra Ver vídeo em nova aba e sem evidência mostra o aviso", async () => {
    const f = ficha();
    const base = f.pilares[0]!.indicadores![0]!;
    f.pilares[0] = {
      ...f.pilares[0]!,
      indicadores: [{ ...base, evidencia: null, link: "https://vimeo.com/123" }],
    };
    montar("treinador", f);
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    const video = screen.getByRole("link", { name: "Ver vídeo (abre em nova aba)" });
    expect(video).toHaveAttribute("href", "https://vimeo.com/123");
    expect(video).toHaveAttribute("target", "_blank");
    expect(video).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/Sem evidência registrada/)).toBeInTheDocument();
  });

  it("IBVAR não vê o aviso de evidência ausente nem link", async () => {
    const f = ficha();
    const base = f.pilares[0]!.indicadores![0]!;
    f.pilares[0] = {
      ...f.pilares[0]!,
      indicadores: [{ ...base, evidencia: null, link: null }],
    };
    montar("ibvar", f);
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    expect(screen.queryByText(/Sem evidência registrada/)).toBeNull();
    expect(screen.queryByRole("link", { name: /Ver vídeo/ })).toBeNull();
  });

  it("Ver histórico mostra a mensagem da API quando o papel não tem acesso", async () => {
    montar("ibvar", ficha());
    const anterior = GET.getMockImplementation()!;
    GET.mockImplementation((caminho: string, opcoes: unknown) =>
      caminho === "/atletas/{id}/indicadores/{indicadorId}/historico"
        ? Promise.resolve({
            error: { erro: "sem_acesso", mensagem: "O IBVAR não vê o detalhe deste pilar." },
            response: { status: 403 },
          })
        : anterior(caminho, opcoes),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ver histórico de Indicador de Performance" }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "O IBVAR não vê o detalhe deste pilar.",
    );
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
    const tabela = await screen.findByRole("region", { name: /Tabela de histórico competitivo/ });
    expect(within(tabela).getByText("Ranking CBVela")).toBeInTheDocument();
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

describe("TelaFicha: ordem dos blocos e selos do financeiro", () => {
  it("coloca o plano e as evidências depois do histórico e da sustentabilidade, e mostra selos coerentes", async () => {
    const f = ficha();
    f.financeiro = {
      perfilSuporte: "B",
      mesesAssegurados: 6,
      patrocinioPrivado: "nao",
      componentes: [
        { id: "treinador", nome: "Treinador", autonomia: "baixa", apoioCbvela: "alta" },
        { id: "viagens", nome: "Viagens", autonomia: "alta", apoioCbvela: "baixa" },
      ],
    };
    montar("gestor", f);
    await screen.findByRole("heading", { name: "Sustentabilidade da campanha" });
    const linha = screen.getByRole("cell", { name: "Treinador" }).closest("tr")!;
    const selos = linha.querySelectorAll(".pill");
    expect(selos[0]).toHaveClass("st-alerta");
    expect(selos[1]).toHaveClass("st-alerta");
    const outra = screen.getByRole("cell", { name: "Viagens" }).closest("tr")!;
    const selos2 = outra.querySelectorAll(".pill");
    expect(selos2[0]).toHaveClass("st-apto");
    expect(selos2[1]).toHaveClass("st-neutro");
    // Duas colunas reais: a esquerda inteira, depois a direita. A sequência do DOM é a ordem de
    // leitura e de foco no celular.
    const esquerda = ["ordem-pilares", "ordem-gates", "ordem-historico", "ordem-comparacao"];
    const direita = [
      "ordem-classfit",
      "ordem-contato",
      "ordem-financeiro",
      "ordem-plano",
      "ordem-evidencias",
    ];
    const classesDe = (col: Element, ordem: string[]) =>
      Array.from(col.children).map((el) => ordem.find((c) => el.classList.contains(c)) ?? "");
    const grade = document.querySelector(".ficha-grid")!;
    const colunas = Array.from(grade.children);
    expect(colunas).toHaveLength(2);
    expect(colunas.every((c) => c.classList.contains("ficha-col"))).toBe(true);
    expect(classesDe(colunas[0]!, esquerda)).toEqual(esquerda);
    expect(classesDe(colunas[1]!, direita)).toEqual(direita);
    const leitura = [...esquerda, ...direita];
    const noDom = Array.from(grade.querySelectorAll(".ficha-col > *")).map(
      (el) => leitura.find((c) => el.classList.contains(c)) ?? "",
    );
    expect(noDom).toEqual(leitura);
  });
});

describe("TelaFicha: documentos do atleta (D11)", () => {
  beforeEach(() => {
    GET.mockReset();
    POST.mockReset();
    DELETE.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
  });

  const secao = async () =>
    (await screen.findByRole("heading", { name: "Documentos" })).closest("section")!;

  it("agrupa por categoria, mostra quem enviou e a cota", async () => {
    montar("gestor", ficha());
    const s = await secao();
    expect(await within(s).findByText("teste-de-campo.pdf")).toBeInTheDocument();
    expect(within(s).getByText("Cota de anexos: 2,5 MB de 200 MB")).toBeInTheDocument();
    const grupos = within(s)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(grupos).toEqual(["Evidência (1)", "Súmula (1)", "Foto da balança (1)"]);
    expect(within(s).getByText(/enviado por o treinador/)).toBeInTheDocument();
    expect(within(s).getByText(/enviado por o atleta/)).toBeInTheDocument();
    expect(within(s).getByText(/enviado por o gestor/)).toBeInTheDocument();
    // Gestor não remove: só o atleta remove o que ele mesmo enviou.
    expect(within(s).queryByRole("button", { name: /^Remover/ })).toBeNull();
  });

  it("atleta anexa com categoria escolhida", async () => {
    POST.mockResolvedValue({ data: { ...ANEXOS.anexos[1], id: "e9" }, response: { status: 201 } });
    montar("atleta", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Anexar arquivo" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Arquivo"), {
      target: { files: [new File(["abc"], "sumula.pdf", { type: "application/pdf" })] },
    });
    fireEvent.change(within(dialogo).getByLabelText("Categoria"), { target: { value: "sumula" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar arquivo" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/evidencias", {
        params: { path: { id: "a07" } },
        body: {
          nomeArquivo: "sumula.pdf",
          tipoMime: "application/pdf",
          conteudoBase64: "YWJj",
          categoria: "sumula",
        },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("cota excedida (413) mostra mensagem clara e mantém o diálogo", async () => {
    POST.mockResolvedValue({
      error: { erro: "cota_excedida", mensagem: "Cota excedida." },
      response: { status: 413 },
    });
    montar("atleta", ficha());
    fireEvent.click(await screen.findByRole("button", { name: "Anexar arquivo" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Arquivo"), {
      target: { files: [new File(["abc"], "a.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar arquivo" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "A cota de 200 MB de anexos foi atingida",
    );
  });

  it("atleta remove só o que enviou (204)", async () => {
    DELETE.mockResolvedValue({ response: { status: 204, ok: true } });
    montar("atleta", ficha());
    const s = await secao();
    await within(s).findByText("sumula-brasileiro.pdf");
    expect(within(s).getAllByRole("button", { name: /^Remover/ })).toHaveLength(1);
    expect(within(s).getByText(/enviado por você/)).toBeInTheDocument();
    fireEvent.click(within(s).getByRole("button", { name: "Remover sumula-brasileiro.pdf" }));
    const dialogo = screen.getByRole("dialog", { name: "Remover anexo" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Remover anexo" }));
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith("/evidencias/{id}", { params: { path: { id: "e2" } } }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toastFn).toHaveBeenCalledWith("Anexo removido");
  });

  it("remoção de anexo ligado a uma nota (409) explica o motivo", async () => {
    DELETE.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "Anexo em uso." },
      response: { status: 409, ok: false },
    });
    montar("atleta", ficha());
    const s = await secao();
    await within(s).findByText("sumula-brasileiro.pdf");
    fireEvent.click(within(s).getByRole("button", { name: "Remover sumula-brasileiro.pdf" }));
    const dialogo = screen.getByRole("dialog", { name: "Remover anexo" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Remover anexo" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Este anexo está ligado a uma nota e não pode ser removido.",
    );
  });

  it("IBVAR não monta o bloco nem consulta os anexos", async () => {
    montar("ibvar", ficha({ classFit: null, financeiro: { perfilSuporte: "D" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Documentos" })).not.toBeInTheDocument();
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/evidencias", expect.anything());
  });
});

describe("TelaFicha: contato, passaporte e aptidão (D15)", () => {
  const APTIDAO = {
    apto: true,
    conferidoEm: "2026-11-10T15:00:00.000Z",
    conferidoPor: { nome: "Carla Gestora" },
  };
  const contato = (extra: Record<string, unknown> = {}) => ({
    email: null,
    treinador: { id: "t1", nome: "Ana Ribeiro" },
    telefone: "+5521999990000",
    passaporteValidoAte: "2030-05",
    aptidao: APTIDAO,
    ...extra,
  });

  it("mostra telefone, validade do passaporte e o selo de aptidão", async () => {
    montar("treinador", ficha({ contato: contato() }));
    expect(await screen.findByRole("heading", { name: "Contato e viagens" })).toBeInTheDocument();
    expect(screen.getByText("+5521999990000")).toBeInTheDocument();
    expect(screen.getByText("válido até 05/2030")).toBeInTheDocument();
    expect(screen.getByText("Apto, conferido em 10/11/2026 por Carla Gestora")).toBeInTheDocument();
    expect(screen.queryByText(/Passaporte vence/)).not.toBeInTheDocument();
  });

  it("avisa quando o passaporte vence em menos de 6 meses", async () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    const em2Meses = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    montar("gestor", ficha({ contato: contato({ passaporteValidoAte: em2Meses }) }));
    expect(await screen.findByText("Passaporte vence em menos de 6 meses")).toBeInTheDocument();
  });

  it("avisa passaporte vencido e mostra sem registro de aptidão", async () => {
    montar(
      "atleta",
      ficha({ contato: contato({ passaporteValidoAte: "2020-01", aptidao: null }) }),
    );
    expect(await screen.findByText("Passaporte vencido")).toBeInTheDocument();
    expect(screen.getByText("Sem registro")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar aptidão" })).not.toBeInTheDocument();
  });

  it("gestor registra a aptidão com o aviso de que o atestado não é guardado", async () => {
    registrarAptidao.mockResolvedValue(APTIDAO);
    montar("gestor", ficha({ contato: contato({ aptidao: null }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Registrar aptidão" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar aptidão" });
    expect(within(dialogo).getByText(/fora do sistema/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/não guarda o atestado/)).toBeInTheDocument();
    const registrar = within(dialogo).getByRole("button", { name: "Registrar" });
    expect(registrar).toBeDisabled();
    fireEvent.click(within(dialogo).getByLabelText("Não apto"));
    fireEvent.click(registrar);
    await waitFor(() => expect(registrarAptidao).toHaveBeenCalledWith("a07", false));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("treinador não tem o botão Registrar aptidão", async () => {
    montar("treinador", ficha({ contato: contato() }));
    await screen.findByRole("heading", { name: "Contato e viagens" });
    expect(screen.queryByRole("button", { name: "Registrar aptidão" })).not.toBeInTheDocument();
  });

  it("IBVAR não recebe contato e não vê o bloco", async () => {
    montar("ibvar", ficha({ contato: null, classFit: null, financeiro: { perfilSuporte: "D" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Contato e viagens" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Passaporte/)).not.toBeInTheDocument();
  });
});

describe("TelaFicha: atleta × treinador e pesagem (D9)", () => {
  beforeEach(() => {
    GET.mockReset();
  });

  const AUTO = {
    ciclo: { id: "c1", nome: "Novembro de 2026", status: "aberto" },
    indicadores: [
      {
        indicadorId: "perf_nacional",
        nome: "Indicador de Performance",
        pilarId: "perf",
        sugestao: {
          valor: 5,
          evidencia: null,
          link: null,
          anexo: null,
          em: "2026-11-10T12:00:00.000Z",
        },
        treinador: {
          valor: 3,
          origem: "avaliacao",
          justificativa: "Resultados abaixo do esperado",
          avaliador: { nome: "Ana Ribeiro" },
          em: "2026-11-12T12:00:00.000Z",
        },
        diferenca: -2,
      },
    ],
    resumoPorPilar: [{ pilarId: "perf", nomeCurto: "Performance", diferencaMedia: -2 }],
  };

  const PESAGEM_PENDENTE = {
    id: "p1",
    pesoKg: 71.4,
    status: "pendente",
    enviadoEm: "2026-11-20T12:00:00.000Z",
    motivo: null,
    decididoPor: null,
    decididoEm: null,
    anexoId: "anx9",
  };

  it("gestor vê a comparação com o resumo por pilar", async () => {
    autoavaliacao = AUTO;
    montar("gestor", ficha());
    expect(await screen.findByRole("heading", { name: "Atleta × treinador" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Diferença média por pilar" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Resultados abaixo do esperado")).toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/atletas/{id}/autoavaliacao", expect.anything());
  });

  it("treinador vê a comparação sem o resumo por pilar", async () => {
    autoavaliacao = { ...AUTO, resumoPorPilar: null };
    montar("treinador", ficha());
    expect(await screen.findByText("Resultados abaixo do esperado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Diferença média por pilar" })).toBeNull();
  });

  it("IBVAR não monta o bloco nem consulta a autoavaliação e as pesagens", async () => {
    montar("ibvar", ficha({ classFit: null, financeiro: { perfilSuporte: "D" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Atleta × treinador" })).toBeNull();
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/autoavaliacao", expect.anything());
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/pesagens", expect.anything());
  });

  it("treinador vê a pesagem pendente para validar", async () => {
    pesagens = { itens: [PESAGEM_PENDENTE] };
    montar("treinador", ficha());
    expect(
      await screen.findByRole("heading", { name: "Pesagem para validar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validar pesagem de 71,4 kg" })).toBeInTheDocument();
  });

  it("o atleta não vê a lista de pesagens para validar", async () => {
    pesagens = { itens: [{ ...PESAGEM_PENDENTE, anexoId: null }] };
    montar("atleta", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Pesagem para validar" })).toBeNull();
  });

  it("o histórico do indicador mostra a justificativa e a origem da autoavaliação", async () => {
    montar("gestor", ficha());
    const anterior = GET.getMockImplementation()!;
    GET.mockImplementation((caminho: string, opcoes: unknown) =>
      caminho === "/atletas/{id}/indicadores/{indicadorId}/historico"
        ? Promise.resolve({
            data: [
              {
                valor: 3,
                pesoKg: null,
                evidencia: null,
                link: null,
                origem: "avaliacao",
                justificativa: "Largadas irregulares",
                pendente: false,
                avaliador: { id: "u1", nome: "Ana Ribeiro" },
                lancadoEm: "2026-11-12T12:00:00.000Z",
                cicloNome: "Novembro de 2026",
                anexo: null,
              },
              {
                valor: 5,
                pesoKg: null,
                evidencia: null,
                link: null,
                origem: "autoavaliacao",
                justificativa: null,
                pendente: true,
                avaliador: null,
                lancadoEm: "2026-11-10T12:00:00.000Z",
                cicloNome: "Novembro de 2026",
                anexo: null,
              },
            ],
            response: { status: 200 },
          })
        : anterior(caminho, opcoes),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^Performance/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ver histórico de Indicador de Performance" }),
    );
    expect(await screen.findByText("Justificativa: Largadas irregulares")).toBeInTheDocument();
    expect(screen.getByText(/Autoavaliação do atleta, aguardando avaliador/)).toBeInTheDocument();
  });
});

describe("TelaFicha: resultados por evento (D10)", () => {
  beforeEach(() => {
    GET.mockReset();
    PUT.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
    toastFn.success.mockReset();
    resultadosApi = [];
  });

  const RESULTADO = {
    id: "r9",
    data: "2025-12-31",
    nivel: "mundial",
    evento: "Mundial ILCA 6",
    edicao: 2025,
    posicao: 5,
    tamanhoFrota: null,
    internacional: true,
    pontosCbvela: null,
    fonte: "atleta" as const,
    linkOficial: "https://oficial.exemplo.com/mundial",
    status: "pendente" as const,
    motivo: null,
    anexo: { id: "anx7", nomeArquivo: "sumula-mundial.pdf" },
    validadoPor: null,
    validadoEm: null,
  };

  const comCalculados = () => {
    const base = ficha();
    const [perf, ...resto] = base.pilares;
    return ficha({
      pilares: [
        {
          ...perf!,
          indicadores: [
            {
              ...perf!.indicadores![0]!,
              id: "perf_mundial",
              nome: "Resultados mundiais",
              calculado: true,
              nota: 5,
              origem: "calculado" as const,
              evidencia: null,
              avaliador: null,
              lancadoEm: null,
              explicacao: "Melhor colocação validada no Mundial: 5º em 2025 (Mundial ILCA 6)",
              resultado: { nivel: "mundial", posicao: 5, edicao: 2025, evento: "Mundial ILCA 6" },
            },
            {
              ...perf!.indicadores![0]!,
              id: "perf_nacional",
              nome: "Resultados nacionais",
              calculado: true,
              nota: 0,
              origem: "calculado" as const,
              evidencia: null,
              avaliador: null,
              lancadoEm: null,
              explicacao: "Sem resultado validado no Nacional nas últimas 3 edições",
              resultado: null,
            },
          ],
        },
        ...resto,
      ],
    });
  };

  it("mostra a explicação da nota calculada, inclusive a nota 0 sem resultado", async () => {
    montar("gestor", comCalculados());
    fireEvent.click(await screen.findByRole("button", { name: /Performance/ }));
    expect(
      await screen.findByText(
        /Melhor colocação validada no Mundial: 5º em 2025 \(Mundial ILCA 6\)/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sem resultado validado no Nacional nas últimas 3 edições/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Calculado pelo resultado validado/).length).toBe(2);
    expect(screen.queryByText(/Sem evidência registrada.*Resultados/)).toBeNull();
  });

  it("o histórico competitivo mostra edição, fonte, situação e quem validou", async () => {
    montar(
      "treinador",
      ficha({
        resultados: [
          {
            ...RESULTADO,
            status: "validado",
            validadoPor: { id: "u1", nome: "Ana Ribeiro" },
            validadoEm: "2026-11-21T12:00:00.000Z",
          },
          {
            ...RESULTADO,
            id: "r10",
            edicao: 2024,
            data: "2024-12-31",
            status: "recusado",
            motivo: "Súmula ilegível",
          },
        ],
      }),
    );
    const tabela = await screen
      .findByRole("table", { name: /histórico competitivo/i })
      .catch(() => null);
    const alvo = tabela ?? screen.getAllByRole("table")[0]!;
    expect(within(alvo).getByRole("columnheader", { name: "Situação" })).toBeInTheDocument();
    expect(within(alvo).getByRole("columnheader", { name: "Data e edição" })).toBeInTheDocument();
    expect(within(alvo).getByText("Validado")).toBeInTheDocument();
    expect(within(alvo).getByText(/por Ana Ribeiro em/)).toBeInTheDocument();
    expect(within(alvo).getByText("Recusado")).toBeInTheDocument();
    expect(within(alvo).getByText("Motivo: Súmula ilegível")).toBeInTheDocument();
    expect(within(alvo).getAllByText("Atleta").length).toBeGreaterThan(0);
    // Frota ausente: só a colocação.
    expect(within(alvo).getAllByText("5º").length).toBeGreaterThan(0);
  });

  it("IBVAR vê só o resultado, sem situação e sem consultar a lista de pendentes", async () => {
    montar(
      "ibvar",
      ficha({
        classFit: null,
        financeiro: { perfilSuporte: "D" },
        resultados: [{ ...RESULTADO, status: "validado", anexo: null, motivo: null }],
      }),
    );
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("columnheader", { name: "Situação" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Resultados para validar" })).toBeNull();
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/resultados", expect.anything());
  });

  it("o atleta não vê o bloco de validação", async () => {
    resultadosApi = [RESULTADO];
    montar("atleta", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Resultados para validar" })).toBeNull();
  });

  it("treinador vê só os pendentes, abre o link e valida", async () => {
    resultadosApi = [RESULTADO, { ...RESULTADO, id: "r11", edicao: 2020, status: "validado" }];
    PUT.mockResolvedValue({
      data: { ...RESULTADO, status: "validado" },
      response: { status: 200 },
    });
    montar("treinador", ficha());
    expect(
      await screen.findByRole("heading", { name: "Resultados para validar" }),
    ).toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/atletas/{id}/resultados", {
      params: { path: { id: "a07" }, query: { status: "pendente" } },
    });
    const lista = screen
      .getByRole("heading", { name: "Resultados para validar" })
      .closest("section")!;
    expect(within(lista).getAllByRole("listitem")).toHaveLength(1);
    const link = within(lista).getByRole("link", {
      name: "Abrir link oficial de 5º em Mundial ILCA 6 2025",
    });
    expect(link.getAttribute("href")).toBe("https://oficial.exemplo.com/mundial");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(
      within(lista).getByRole("button", { name: "Ver súmula de 5º em Mundial ILCA 6 2025" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(lista).getByRole("button", { name: "Validar 5º em Mundial ILCA 6 2025" }),
    );
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/resultados/{id}/validacao", {
        params: { path: { id: "r9" } },
        body: { decisao: "validar" },
      }),
    );
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
  });

  it("recusar exige motivo e envia a decisão com o motivo", async () => {
    resultadosApi = [RESULTADO];
    PUT.mockResolvedValue({
      data: { ...RESULTADO, status: "recusado" },
      response: { status: 200 },
    });
    montar("gestor", ficha());
    fireEvent.click(
      await screen.findByRole("button", { name: "Recusar 5º em Mundial ILCA 6 2025" }),
    );
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar resultado" }));
    expect(
      await within(dialogo).findByText("Explique o motivo da recusa para o atleta."),
    ).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Motivo (obrigatório)"), {
      target: { value: "  A súmula não mostra a colocação.  " },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar resultado" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/resultados/{id}/validacao", {
        params: { path: { id: "r9" } },
        body: { decisao: "recusar", motivo: "A súmula não mostra a colocação." },
      }),
    );
  });

  it("mostra o erro da API no diálogo de recusa e mantém o resultado na fila", async () => {
    resultadosApi = [RESULTADO];
    PUT.mockResolvedValue({
      error: { erro: "conflito", mensagem: "O resultado já está recusado." },
      response: { status: 409 },
    });
    montar("treinador", ficha());
    fireEvent.click(
      await screen.findByRole("button", { name: "Recusar 5º em Mundial ILCA 6 2025" }),
    );
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Motivo (obrigatório)"), {
      target: { value: "Ilegível" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar resultado" }));
    expect(await within(dialogo).findByText("O resultado já está recusado.")).toBeInTheDocument();
  });
});

describe("TelaFicha: comparação com a média da turma (D13)", () => {
  const medias = [
    { cicloId: "c-set", ciclo: "Setembro de 2026", media: 58.4, atletas: 10 },
    { cicloId: "c-out", ciclo: "Outubro de 2026", media: 62.2, atletas: 10 },
  ];
  const comparacao = (
    posicao: "acima" | "na_media" | "abaixo",
    diferenca: number,
    mediaTurma = 62.2,
  ) => ({ scoreAtual: mediaTurma + diferenca, mediaTurma, diferenca, posicao });

  it("desenha a linha da média da turma com os valores certos e a legenda", async () => {
    montar(
      "treinador",
      ficha({
        mediaTurmaPorCiclo: medias,
        comparacaoTurma: comparacao("acima", 3.8),
        tendencia: "subindo",
      }),
    );
    const grafico = await screen.findByRole("img", { name: /Score nos últimos ciclos/ });
    expect(grafico).toHaveAccessibleName(
      "Score nos últimos ciclos: 60,0, 66,0, 71,5. Média da turma: Set 58,4, Out 62,2, Nov sem dado",
    );
    // Só os dois ciclos fechados têm ponto da média; o ciclo atual não.
    expect(within(grafico).getAllByTestId("spark-media-ponto")).toHaveLength(2);
    expect(screen.getByText("Média da turma", { selector: "figcaption span" })).toBeVisible();
    expect(screen.getByText("Atleta", { selector: "figcaption span" })).toBeVisible();
  });

  it("mostra o selo acima da média com a diferença em pontos e a tendência por texto", async () => {
    montar(
      "atleta",
      ficha({
        mediaTurmaPorCiclo: medias,
        comparacaoTurma: comparacao("acima", 3.8),
        tendencia: "subindo",
      }),
    );
    expect(await screen.findByTestId("comp-posicao")).toHaveTextContent("Acima da média");
    expect(screen.getByTestId("comp-diferenca")).toHaveTextContent(
      "+3,8 pontos em relação à média da turma",
    );
    expect(screen.getByTestId("comp-tendencia")).toHaveTextContent("Tendência: subindo");
  });

  it("abaixo da média e tendência caindo", async () => {
    montar(
      "gestor",
      ficha({
        mediaTurmaPorCiclo: medias,
        comparacaoTurma: comparacao("abaixo", -2.5),
        tendencia: "caindo",
      }),
    );
    expect(await screen.findByTestId("comp-posicao")).toHaveTextContent("Abaixo da média");
    expect(screen.getByTestId("comp-diferenca")).toHaveTextContent("−2,5 pontos");
    expect(screen.getByTestId("comp-tendencia")).toHaveTextContent("Tendência: caindo");
  });

  it("na média e tendência estável", async () => {
    montar(
      "treinador",
      ficha({
        mediaTurmaPorCiclo: medias,
        comparacaoTurma: comparacao("na_media", 0.4),
        tendencia: "estavel",
      }),
    );
    expect(await screen.findByTestId("comp-posicao")).toHaveTextContent("Na média");
    expect(screen.getByTestId("comp-diferenca")).toHaveTextContent("+0,4 pontos");
    expect(screen.getByTestId("comp-tendencia")).toHaveTextContent("Tendência: estável");
  });

  it("IBVAR com grupo pequeno: média nula não desenha ponto e não há selo", async () => {
    montar(
      "ibvar",
      ficha({
        mediaTurmaPorCiclo: medias.map((m) => ({ ...m, media: null })),
        comparacaoTurma: null,
        tendencia: "subindo",
      }),
    );
    const grafico = await screen.findByRole("img", { name: /Score nos últimos ciclos/ });
    expect(within(grafico).queryAllByTestId("spark-media-ponto")).toHaveLength(0);
    expect(grafico).toHaveAccessibleName("Score nos últimos ciclos: 60,0, 66,0, 71,5");
    expect(screen.queryByTestId("comp-posicao")).not.toBeInTheDocument();
    // A tendência é do próprio atleta e continua visível.
    expect(screen.getByTestId("comp-tendencia")).toHaveTextContent("Tendência: subindo");
  });

  it("sem ciclos fechados: o bloco não aparece", async () => {
    montar("treinador", ficha({ historicoScore: [] }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByText("Comparação com a média da turma")).not.toBeInTheDocument();
    expect(screen.queryByTestId("comp-posicao")).not.toBeInTheDocument();
    expect(screen.queryByTestId("comp-tendencia")).not.toBeInTheDocument();
    expect(screen.queryByText("Média da turma")).not.toBeInTheDocument();
  });
});

describe("TelaFicha: cartão de perfil e conquistas (D14)", () => {
  const PODIO = {
    tipo: "resultado" as const,
    titulo: "Mundial ILCA 6",
    ano: 2025,
    evento: "Mundial ILCA 6",
    nivel: "mundial",
    posicao: 2,
  };
  const MANUAL = { tipo: "manual" as const, titulo: "Campeã da Semana de Vela", ano: 2024 };
  const MANUAL_PENDENTE = {
    id: "q1",
    titulo: "Campeã da Semana de Vela",
    ano: 2024,
    status: "pendente" as const,
    motivo: null,
    anexoId: "e9",
    criadoEm: "2026-11-20T12:00:00.000Z",
    decididoPor: null,
    decididoEm: null,
  };

  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
    PUT.mockReset();
    toastFn.mockReset();
    toastFn.success.mockReset();
    toastFn.error.mockReset();
  });

  it("gestor vê o cartão completo: foto, identificação, bio e conquistas com texto", async () => {
    const base = ficha();
    montar(
      "gestor",
      ficha({
        atleta: {
          ...base.atleta,
          fotoUrl: "https://x.test/f.jpg",
          bio: "Velejo desde os 8 anos.\nSonho com 2032.",
        },
        conquistas: [PODIO, MANUAL],
      }),
    );
    await screen.findByRole("heading", { name: "Helena Vasques" });
    const cartao = document.querySelector(".cartao-perfil") as HTMLElement;
    expect(cartao.querySelector("img")).toHaveAttribute("src", "https://x.test/f.jpg");
    expect(within(cartao).getByRole("link", { name: /BRAHV07/ })).toBeInTheDocument();
    expect(within(cartao).getByText("ILCA 6 · Timoneira")).toBeInTheDocument();
    expect(within(cartao).getByText("21 anos")).toBeInTheDocument();
    expect(within(cartao).getByText(/Florianópolis\/SC/)).toBeInTheDocument();
    expect(within(cartao).getByText(/Velejo desde os 8 anos\./)).toBeInTheDocument();
    const lista = within(cartao).getByRole("region", { name: "Conquistas" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]!).getByText("2º lugar")).toBeInTheDocument();
    expect(within(itens[0]!).getByText(/Mundial ILCA 6/)).toBeInTheDocument();
    expect(within(itens[1]!).getByText("Conquista")).toBeInTheDocument();
    expect(within(itens[1]!).getByText(/Campeã da Semana de Vela/)).toBeInTheDocument();
  });

  it("sem foto o cartão mostra as iniciais; sem bio nem conquistas, não mostra os blocos", async () => {
    montar("gestor", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    const cartao = document.querySelector(".cartao-perfil") as HTMLElement;
    expect(cartao.querySelector("img")).toBeNull();
    expect(cartao.querySelector(".avatar")?.textContent).toBe("HV");
    expect(cartao.querySelector(".cartao-bio")).toBeNull();
    expect(screen.queryByRole("region", { name: "Conquistas" })).toBeNull();
  });

  it("IBVAR com foto, bio e conquistas liberadas pela API vê tudo isso no cartão", async () => {
    const base = ficha();
    montar(
      "ibvar",
      ficha({
        classFit: null,
        financeiro: { perfilSuporte: "D" },
        contato: null,
        atleta: { ...base.atleta, fotoUrl: "https://x.test/f.jpg", bio: "Bio liberada." },
        conquistas: [PODIO],
      }),
    );
    await screen.findByRole("heading", { name: "Helena Vasques" });
    const cartao = document.querySelector(".cartao-perfil") as HTMLElement;
    expect(cartao.querySelector("img")).toHaveAttribute("src", "https://x.test/f.jpg");
    expect(within(cartao).getByText("Bio liberada.")).toBeInTheDocument();
    expect(within(cartao).getByText("2º lugar")).toBeInTheDocument();
    // O IBVAR não consulta a lista de conquistas (403): só lê o que veio na ficha.
    expect(GET).not.toHaveBeenCalledWith("/atletas/{id}/conquistas", expect.anything());
  });

  it("IBVAR sem o aceite do termo (foto e bio nulas) vê o cartão sem bio e sem foto", async () => {
    montar(
      "ibvar",
      ficha({
        classFit: null,
        financeiro: { perfilSuporte: "D" },
        contato: null,
        conquistas: [PODIO],
      }),
    );
    await screen.findByRole("heading", { name: "Helena Vasques" });
    const cartao = document.querySelector(".cartao-perfil") as HTMLElement;
    expect(cartao.querySelector("img")).toBeNull();
    expect(cartao.querySelector(".cartao-bio")).toBeNull();
    expect(within(cartao).getByText("2º lugar")).toBeInTheDocument();
  });

  it("treinador vê as conquistas pendentes, abre o comprovante e valida", async () => {
    conquistasApi = {
      automaticas: [],
      manuais: [MANUAL_PENDENTE, { ...MANUAL_PENDENTE, id: "q2", status: "validada" }],
    };
    PUT.mockResolvedValue({
      data: { ...MANUAL_PENDENTE, status: "validada" },
      response: { status: 200 },
    });
    montar("treinador", ficha());
    const bloco = (await screen.findByRole("heading", { name: "Conquistas para validar" })).closest(
      "section",
    )!;
    expect(within(bloco).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(bloco).getByRole("button", {
        name: "Ver comprovante de Campeã da Semana de Vela (2024)",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(bloco).getByRole("button", { name: "Validar Campeã da Semana de Vela (2024)" }),
    );
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/conquistas/{id}/validacao", {
        params: { path: { id: "q1" } },
        body: { decisao: "validar" },
      }),
    );
    await waitFor(() => expect(toastFn.success).toHaveBeenCalledWith("Conquista validada."));
  });

  it("recusar exige motivo e envia a decisão com o motivo", async () => {
    conquistasApi = { automaticas: [], manuais: [MANUAL_PENDENTE] };
    PUT.mockResolvedValue({
      data: { ...MANUAL_PENDENTE, status: "recusada" },
      response: { status: 200 },
    });
    montar("gestor", ficha());
    fireEvent.click(
      await screen.findByRole("button", { name: "Recusar Campeã da Semana de Vela (2024)" }),
    );
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar conquista" }));
    expect(
      await within(dialogo).findByText("Explique o motivo da recusa para o atleta."),
    ).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Motivo (obrigatório)"), {
      target: { value: "  Comprovante ilegível.  " },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar conquista" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/conquistas/{id}/validacao", {
        params: { path: { id: "q1" } },
        body: { decisao: "recusar", motivo: "Comprovante ilegível." },
      }),
    );
  });

  it("o atleta não vê o bloco de validação", async () => {
    conquistasApi = { automaticas: [], manuais: [MANUAL_PENDENTE] };
    montar("atleta", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "Conquistas para validar" })).toBeNull();
  });
});

describe("TelaFicha: fonte da faixa de Class Fit (D18)", () => {
  const comFonte = (fonte: NonNullable<FichaAtleta["classFit"]>["fonte"]) => {
    const base = ficha();
    return ficha({ classFit: { ...base.classFit!, fonte } });
  };

  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
  });

  it("mostra documento, versão e data abaixo do gráfico", async () => {
    montar(
      "gestor",
      comFonte({ documento: "Class Rules ILCA 6", versao: "2026", data: "2026-03-01" }),
    );
    expect(
      await screen.findByText("Fonte da faixa: Class Rules ILCA 6, versão 2026 (01/03/2026)"),
    ).toBeInTheDocument();
  });

  it("omite versão e data quando não foram informadas", async () => {
    montar("treinador", comFonte({ documento: "Regulamento 470", versao: null, data: null }));
    expect(await screen.findByText("Fonte da faixa: Regulamento 470")).toBeInTheDocument();
  });

  it("o atleta também vê a fonte", async () => {
    montar("atleta", comFonte({ documento: "Regulamento 470", versao: "3", data: null }));
    expect(
      await screen.findByText("Fonte da faixa: Regulamento 470, versão 3"),
    ).toBeInTheDocument();
  });

  it("sem fonte não mostra a linha", async () => {
    montar("gestor", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByText(/Fonte da faixa/)).not.toBeInTheDocument();
  });

  it("IBVAR (classFit nulo) não vê fonte", async () => {
    montar("ibvar", ficha({ classFit: null, financeiro: { perfilSuporte: "D" } }));
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByText(/Fonte da faixa/)).not.toBeInTheDocument();
  });
});

describe("TelaFicha: World Sailing (D19)", () => {
  const RANKING = [
    { data: "2026-09-01", classe: "ILCA 6", tipo: "Senior", posicao: 12, pontos: 410.5 },
    { data: "2026-06-01", classe: "ILCA 6", tipo: "Senior", posicao: 20, pontos: 380 },
    { data: "2026-03-01", classe: "ILCA 6", tipo: "Senior", posicao: 31, pontos: 300 },
    { data: "2026-09-01", classe: "ILCA 7", tipo: null, posicao: 80, pontos: null },
  ];
  const SECAO = {
    perfilUrl: "https://www.sailing.org/sailor/?ref=BRAHV07",
    importacaoAtiva: true,
    ultimaImportacao: { em: "2026-11-25T15:00:00.000Z", status: "ok" },
    ranking: RANKING,
  };
  const RES_WS = {
    ...RES_BASE,
    id: "w1",
    data: "2026-08-10",
    nivel: "mundial",
    evento: "Sailing World Championships (ILCA 6)",
    edicao: 2026,
    posicao: 7,
    tamanhoFrota: null,
    internacional: true,
    pontosCbvela: null,
    fonte: "world_sailing" as const,
    linkOficial: "https://www.sailing.org/sailor/?ref=BRAHV07",
  };

  beforeEach(() => {
    GET.mockReset();
    POST.mockReset();
    PUT.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
    toastFn.success.mockReset();
    resultadosApi = [];
    wsApi = SECAO;
  });

  it("mostra link do perfil, última atualização, gráfico e tabela do ranking", async () => {
    montar("gestor", ficha());
    const secao = (await screen.findByRole("heading", { name: "World Sailing" })).closest(
      "section",
    )!;
    const link = await within(secao).findByRole("link", { name: /Ver perfil público/ });
    expect(link).toHaveAttribute("href", "https://www.sailing.org/sailor/?ref=BRAHV07");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(secao).getByText(/Última atualização:/)).toHaveTextContent("Importado");
    // Série com mais pontos primeiro; eixo invertido: a melhor posição fica acima da pior.
    const pontos = within(secao).getAllByTestId("ws-ponto");
    expect(pontos).toHaveLength(3);
    const cy = (i: number) => Number(pontos[i]!.querySelector("circle")!.getAttribute("cy"));
    expect(cy(2)).toBeLessThan(cy(0)); // 12º (mais novo) acima do 31º (mais antigo)
    expect(within(secao).getByRole("img", { name: /Quanto menor o número, melhor/ })).toBeVisible();
    const tabela = within(secao).getByRole("table");
    expect(within(tabela).getByText("12º")).toBeInTheDocument();
    expect(within(tabela).getByText("31º")).toBeInTheDocument();
  });

  it("filtra por classe e tipo", async () => {
    montar("gestor", ficha());
    const select = await screen.findByLabelText("Classe e tipo de ranking");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["ILCA 6 · Senior", "ILCA 7"]);
    fireEvent.change(select, {
      target: { value: (select as HTMLSelectElement).options[1]!.value },
    });
    expect(await screen.findAllByTestId("ws-ponto")).toHaveLength(1);
    expect(
      within(screen.getByRole("table", { name: /ILCA 7/ })).getByText("80º"),
    ).toBeInTheDocument();
  });

  it("atualiza da World Sailing (gestor) e avisa o resumo", async () => {
    POST.mockResolvedValue({
      data: { status: "ok", resultadosNovos: 2, rankingNovos: 3 },
      response: { status: 200 },
    });
    montar("gestor", ficha());
    fireEvent.click(await screen.findByRole("button", { name: /Atualizar da World Sailing/ }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/world-sailing", {
        params: { path: { id: "a07" } },
      }),
    );
    await waitFor(() =>
      expect(toastFn.success).toHaveBeenCalledWith(
        "Importados da World Sailing: 2 resultados e 3 posições de ranking.",
      ),
    );
  });

  it("mostra a mensagem da API quando o limite de buscas estoura", async () => {
    POST.mockResolvedValue({
      error: { erro: "limite_excedido", mensagem: "Aguarde 60 segundos para buscar de novo." },
      response: { status: 429 },
    });
    montar("treinador", ficha());
    fireEvent.click(await screen.findByRole("button", { name: /Atualizar da World Sailing/ }));
    await waitFor(() =>
      expect(toastFn.error).toHaveBeenCalledWith("Aguarde 60 segundos para buscar de novo."),
    );
  });

  it("esconde o botão com a importação desligada", async () => {
    wsApi = { ...SECAO, importacaoAtiva: false };
    montar("gestor", ficha());
    await screen.findByRole("heading", { name: "World Sailing" });
    expect(screen.queryByRole("button", { name: /Atualizar da World Sailing/ })).toBeNull();
  });

  it("o atleta vê a seção, sem o botão de atualizar", async () => {
    montar("atleta", ficha());
    await screen.findByRole("heading", { name: "World Sailing" });
    expect(screen.queryByRole("button", { name: /Atualizar da World Sailing/ })).toBeNull();
  });

  it("o IBVAR não vê a seção e a rota nem é chamada", async () => {
    montar("ibvar", ficha());
    await screen.findByRole("heading", { name: "Helena Vasques" });
    expect(screen.queryByRole("heading", { name: "World Sailing" })).toBeNull();
    expect(GET.mock.calls.some((c) => c[0] === "/atletas/{id}/world-sailing")).toBe(false);
  });

  it("sem ranking, mostra o estado vazio e o status da busca", async () => {
    wsApi = {
      ...SECAO,
      ranking: [],
      ultimaImportacao: { em: "2026-11-25T15:00:00.000Z", status: "nao_encontrado" },
    };
    montar("gestor", ficha());
    expect(await screen.findByText("Sem histórico de ranking importado")).toBeInTheDocument();
    expect(screen.getByText(/ID não encontrado na World Sailing/)).toBeInTheDocument();
  });

  it("resultado da World Sailing: selo, vigente e invalidar com motivo obrigatório", async () => {
    PUT.mockResolvedValue({ data: { ...RES_WS, status: "recusado" }, response: { status: 200 } });
    montar("gestor", ficha({ resultados: [RES_WS] }));
    const linha = (await screen.findByText("Sailing World Championships (ILCA 6)")).closest("tr")!;
    expect(within(linha).getByRole("link", { name: /World Sailing/ })).toBeInTheDocument();
    expect(within(linha).getByText("Vigente")).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: /Revalidar/ })).toBeNull();
    fireEvent.click(within(linha).getByRole("button", { name: /^Invalidar 7º em/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Invalidar resultado" }));
    expect(
      await within(dialogo).findByText("Explique o motivo da invalidação."),
    ).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Motivo (obrigatório)"), {
      target: { value: "  Evento de outro velejador.  " },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Invalidar resultado" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/resultados/{id}/validacao", {
        params: { path: { id: "w1" } },
        body: { decisao: "recusar", motivo: "Evento de outro velejador." },
      }),
    );
  });

  it("resultado invalidado mostra o motivo e oferece só Revalidar", async () => {
    PUT.mockResolvedValue({ data: { ...RES_WS, status: "validado" }, response: { status: 200 } });
    montar(
      "treinador",
      ficha({
        resultados: [{ ...RES_WS, status: "recusado", motivo: "Evento de outro velejador." }],
      }),
    );
    const linha = (await screen.findByText("Sailing World Championships (ILCA 6)")).closest("tr")!;
    expect(within(linha).getByText("Invalidado")).toBeInTheDocument();
    expect(within(linha).getByText("Motivo: Evento de outro velejador.")).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: /^Invalidar/ })).toBeNull();
    fireEvent.click(within(linha).getByRole("button", { name: /^Revalidar 7º em/ }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/resultados/{id}/validacao", {
        params: { path: { id: "w1" } },
        body: { decisao: "validar" },
      }),
    );
  });

  it("o atleta vê o selo e a situação, sem botões de decisão", async () => {
    montar("atleta", ficha({ resultados: [RES_WS] }));
    const linha = (await screen.findByText("Sailing World Championships (ILCA 6)")).closest("tr")!;
    expect(within(linha).getByText("Vigente")).toBeInTheDocument();
    expect(within(linha).queryByRole("button")).toBeNull();
  });
});

describe("TelaFicha: conquistas compactas (D20)", () => {
  type Conq = FichaAtleta["conquistas"][number];
  const podio = (posicao: number, titulo: string, ano: number, nivel: string): Conq => ({
    tipo: "resultado",
    titulo,
    ano,
    evento: titulo,
    nivel,
    posicao,
  });
  const MUITAS: Conq[] = [
    podio(1, "Regata local A", 2026, "estadual"),
    podio(1, "Regata local B", 2025, "estadual"),
    podio(2, "Campeonato Continental", 2024, "continental"),
    podio(3, "Campeonato Mundial", 2023, "mundial"),
    podio(2, "Jogos Olímpicos de Paris", 2024, "mundial"),
    podio(1, "Copa Brasil", 2022, "brasileiro"),
    { tipo: "manual", titulo: "Campeão da Semana de Vela", ano: 2021 },
  ];

  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
  });

  it("com mais de 3 mostra o resumo por colocação, 3 destaques por nível e o botão", async () => {
    montar("gestor", ficha({ conquistas: MUITAS }));
    const regiao = await screen.findByRole("region", { name: "Conquistas" });
    expect(
      within(regiao).getByText(/3× 1º · 2× 2º · 1× 3º · 1× conquista informada/),
    ).toBeVisible();
    const itens = within(regiao).getAllByRole("listitem");
    expect(itens).toHaveLength(3);
    expect(itens[0]).toHaveTextContent("Jogos Olímpicos de Paris");
    expect(itens[1]).toHaveTextContent("Campeonato Mundial");
    expect(itens[2]).toHaveTextContent("Campeonato Continental");
    expect(
      within(regiao).getByRole("button", { name: "Ver todas as conquistas (7)" }),
    ).toBeVisible();
  });

  it("só os Jogos Olímpicos de verdade vêm antes dos mundiais, não as Olympic Classes", async () => {
    const lista: Conq[] = [
      podio(1, "Long Beach Olympic Classes Regatta", 2019, "internacional_aberto"),
      podio(1, "San Pedro Olympic Classes Regatta", 2018, "internacional_aberto"),
      podio(3, "Olympic Week", 2017, "internacional_aberto"),
      podio(1, "Olympic Test Event", 2016, "internacional_aberto"),
      podio(1, "Campeonato Europeu", 2022, "continental"),
      podio(1, "Mundial 2021", 2021, "mundial"),
      podio(2, "Tokyo 2020 Olympic Games Sailing Competition", 2021, "internacional_aberto"),
    ];
    montar("gestor", ficha({ conquistas: lista }));
    const regiao = await screen.findByRole("region", { name: "Conquistas" });
    const itens = within(regiao).getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Tokyo 2020 Olympic Games");
    expect(itens[1]).toHaveTextContent("Mundial 2021");
    expect(itens[2]).toHaveTextContent("Campeonato Europeu");
  });

  it("o botão abre o diálogo com a lista completa e Esc fecha", async () => {
    montar("atleta", ficha({ conquistas: MUITAS }));
    const regiao = await screen.findByRole("region", { name: "Conquistas" });
    fireEvent.click(within(regiao).getByRole("button", { name: /Ver todas as conquistas/ }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getAllByRole("listitem")).toHaveLength(7);
    expect(within(dialogo).getByText(/Regata local A/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("com 3 ou menos mostra a lista inteira, sem resumo nem botão", async () => {
    montar("gestor", ficha({ conquistas: MUITAS.slice(0, 3) }));
    const regiao = await screen.findByRole("region", { name: "Conquistas" });
    expect(within(regiao).getAllByRole("listitem")).toHaveLength(3);
    expect(within(regiao).queryByRole("button")).toBeNull();
    expect(within(regiao).queryByText(/\d× 1º/)).toBeNull();
  });
});

describe("TelaFicha: histórico competitivo paginado e filtrado (D20)", () => {
  const nivelDe = ["mundial", "continental", "brasileiro", "estadual"];
  const MUITOS = Array.from({ length: 25 }, (_, i) => ({
    ...RES_BASE,
    id: `h${i}`,
    data: `2026-${String(12 - Math.floor(i / 2)).padStart(2, "0")}-${i % 2 ? "05" : "20"}`,
    nivel: nivelDe[i % 4]!,
    evento: `Evento ${String(i).padStart(2, "0")}`,
    edicao: 2026,
    posicao: 3,
    tamanhoFrota: null,
    internacional: false,
    pontosCbvela: null,
    fonte: (i % 5 === 0 ? "world_sailing" : "atleta") as "world_sailing" | "atleta",
    linkOficial: null,
  }));
  const linhas = () =>
    within(screen.getByRole("region", { name: /Tabela de histórico competitivo/ })).getAllByRole(
      "row",
    );

  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
  });

  it("mostra os 10 mais recentes e a contagem; Mostrar mais soma 10; Mostrar todos abre tudo", async () => {
    montar("gestor", ficha({ resultados: MUITOS }));
    expect(await screen.findByText("Mostrando 10 de 25")).toBeInTheDocument();
    expect(linhas()).toHaveLength(11); // cabeçalho + 10
    // O mais recente é o de data 2026-12-20 (i = 0).
    expect(linhas()[1]).toHaveTextContent("Evento 00");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar mais (10 de 15)" }));
    expect(screen.getByText("Mostrando 20 de 25")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(screen.getByText("Mostrando 25 de 25")).toBeInTheDocument();
    expect(linhas()).toHaveLength(26);
    expect(screen.queryByRole("button", { name: /Mostrar/ })).toBeNull();
  });

  it("junta a edição sob a data e esconde Pts quando nenhuma linha visível tem pontos", async () => {
    montar("gestor", ficha({ resultados: MUITOS }));
    await screen.findByText("Mostrando 10 de 25");
    const regiao = screen.getByRole("region", { name: /Tabela de histórico competitivo/ });
    expect(within(regiao).getByRole("columnheader", { name: "Data e edição" })).toBeInTheDocument();
    expect(within(regiao).queryByRole("columnheader", { name: "Edição" })).toBeNull();
    expect(within(regiao).queryByRole("columnheader", { name: "Pts" })).toBeNull();
    expect(within(linhas()[1]!).getByText("Edição 2026")).toBeInTheDocument();
  });

  it("filtra por nível com aria-pressed e volta para a primeira página", async () => {
    montar("gestor", ficha({ resultados: MUITOS }));
    await screen.findByText("Mostrando 10 de 25");
    const grupo = screen.getByRole("group", { name: "Filtrar por nível" });
    expect(within(grupo).getByRole("button", { name: "Todos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(within(grupo).getByRole("button", { name: "Nacional" }));
    expect(within(grupo).getByRole("button", { name: "Nacional" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(grupo).getByRole("button", { name: "Todos" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // i % 4 === 2 entre 0 e 24: 6 resultados.
    expect(screen.getByText("Mostrando 6 de 6 (25 no total)")).toBeInTheDocument();
    expect(linhas()).toHaveLength(7);
  });

  it("filtra por fonte e mostra o estado vazio quando a combinação não acha nada", async () => {
    montar("gestor", ficha({ resultados: MUITOS }));
    await screen.findByText("Mostrando 10 de 25");
    fireEvent.change(screen.getByLabelText("Fonte"), { target: { value: "world_sailing" } });
    expect(screen.getByText("Mostrando 5 de 5 (25 no total)")).toBeInTheDocument();
    // World Sailing: i = 0, 5, 10, 15, 20. Só i = 10 é nacional (10 % 4 = 2).
    fireEvent.click(screen.getByRole("button", { name: "Nacional" }));
    expect(screen.getByText(/Mostrando 1 de 1/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fonte"), { target: { value: "manual" } });
    expect(screen.getByText("Nenhum resultado com esse filtro.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Tabela de histórico/ })).toBeNull();
  });

  it("o IBVAR não tem o filtro de fonte, que revelaria a origem do lançamento", async () => {
    montar("ibvar", ficha({ resultados: MUITOS, classFit: null }));
    await screen.findByText("Mostrando 10 de 25");
    expect(screen.queryByLabelText("Fonte")).toBeNull();
    expect(screen.getByRole("group", { name: "Filtrar por nível" })).toBeInTheDocument();
  });
});

describe("TelaFicha: Class Fit sem medida por papel (D20)", () => {
  beforeEach(() => {
    autoavaliacao = SEM_AUTOAVALIACAO;
    pesagens = { itens: [] };
    resultadosApi = [];
    conquistasApi = { automaticas: [], manuais: [] };
    GET.mockReset();
  });
  const PESO = /Peso e medidas são dado sensível/;

  it("IBVAR mantém o texto do cadeado", async () => {
    montar("ibvar", ficha({ classFit: null, financeiro: { perfilSuporte: "D" } }));
    expect(await screen.findByText(PESO)).toBeInTheDocument();
  });

  it("atleta é orientado a informar o peso no painel, com link", async () => {
    montar("atleta", ficha({ classFit: null }));
    expect(await screen.findByText(/Ainda não há peso validado/)).toHaveTextContent(
      "Informe seu peso com a foto da balança no seu painel; o treinador valida.",
    );
    expect(screen.getByRole("link", { name: "painel" })).toHaveAttribute("href", "/painel");
    expect(screen.queryByText(PESO)).toBeNull();
  });

  it.each(["gestor", "treinador"])("%s vê que falta medida validada", async (papel) => {
    montar(papel, ficha({ classFit: null }));
    expect(
      await screen.findByText("Ainda não há medida validada para este atleta."),
    ).toBeInTheDocument();
    expect(screen.queryByText(PESO)).toBeNull();
  });
});
