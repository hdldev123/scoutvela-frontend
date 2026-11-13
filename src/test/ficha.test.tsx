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
const POST = vi.fn();
const linkEvidencia = vi.hoisted(() => ({ url: "https://storage.exemplo.com/a.pdf?assinatura=1" }));
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));
vi.mock("@/lib/api/mutacoes-ficha", () => ({
  atualizarGate: (...a: unknown[]) => atualizarGate(...a),
  criarRevisao: (...a: unknown[]) => criarRevisao(...a),
  registrarPlano: (...a: unknown[]) => registrarPlano(...a),
  atualizarFinanceiro: (...a: unknown[]) => atualizarFinanceiro(...a),
  lancarResultado: (...a: unknown[]) => lancarResultado(...a),
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
        origem: nota == null ? null : ("avaliacao" as const),
        avaliador: nota == null ? null : { id: "u1", nome: "Ana Ribeiro" },
        lancadoEm: nota == null ? null : "2026-11-05T12:00:00.000Z",
        resposta: null,
        sugestaoPendente: null,
        sugestaoPontos: null,
        anexo: null,
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
    plano: null,
    sugestaoPlano: null,
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
      enviadoEm: "2026-11-05T12:00:00.000Z",
    },
  ],
};

function montar(papel: string, dados: FichaAtleta | { erro: number }) {
  GET.mockImplementation((caminho: string) => {
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
    GET.mockReset();
    atualizarGate.mockReset();
    criarRevisao.mockReset();
    registrarPlano.mockReset();
    atualizarFinanceiro.mockReset();
    lancarResultado.mockReset();
    POST.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
  });

  it("mostra cabeçalho, score e pill Parcial", async () => {
    montar("gestor", ficha());
    expect(await screen.findByRole("heading", { name: "Helena Vasques" })).toBeInTheDocument();
    expect(screen.getByText("71,5")).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText("Treinador(a): Ana Ribeiro")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Score nos últimos ciclos: 60,0, 66,0, 71,5/ }),
    ).toBeInTheDocument();
  });

  it("plano registrado mostra autor e data, sem usar a sugestão", async () => {
    montar("gestor", ficha({ plano: PLANO, sugestaoPlano: SUGESTAO }));
    const secao = (await screen.findByRole("heading", { name: "Plano individual" })).closest(
      "section",
    )!;
    expect(within(secao).getByText("Registrado por Ana Ribeiro em 02/11/2026")).toBeInTheDocument();
    expect(within(secao).getByText("Regata de vento forte")).toBeInTheDocument();
    expect(within(secao).queryByText(SUGESTAO.forcas)).not.toBeInTheDocument();
    expect(within(secao).queryByText(/Sugestão da API/)).not.toBeInTheDocument();
  });

  it("sem plano registrado mostra a sugestão da API, marcada", async () => {
    montar("treinador", ficha({ sugestaoPlano: SUGESTAO }));
    const secao = (await screen.findByRole("heading", { name: "Plano individual" })).closest(
      "section",
    )!;
    expect(within(secao).getByText("Sugestão da API, ainda não registrada")).toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "Evidências anexadas" })).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Atualizar financeiro" }));
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
    expect(await screen.findByRole("cell", { name: "Internacional aberto" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lançar resultado internacional" }),
    ).not.toBeInTheDocument();
  });

  it("evidências: lista, abre o link https em nova aba e baixa data:", async () => {
    const cliques: { href: string; target: string; rel: string; download: string }[] = [];
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      cliques.push({
        href: this.href,
        target: this.target,
        rel: this.rel,
        download: this.download,
      });
    });
    montar("atleta", ficha());
    const secao = (await screen.findByRole("heading", { name: "Evidências anexadas" })).closest(
      "section",
    )!;
    expect(await within(secao).findByText("teste-de-campo.pdf")).toBeInTheDocument();
    expect(within(secao).getByText(/Indicador de Performance · 05\/11\/2026/)).toBeInTheDocument();
    expect(within(secao).queryByRole("button", { name: "Anexar arquivo" })).not.toBeInTheDocument();

    fireEvent.click(within(secao).getByRole("button", { name: "Abrir teste-de-campo.pdf" }));
    await waitFor(() => expect(cliques).toHaveLength(1));
    expect(cliques[0]).toMatchObject({ target: "_blank", rel: "noopener noreferrer" });
    expect(cliques[0]!.href).toContain("https://storage.exemplo.com/a.pdf");

    linkEvidencia.url = "data:application/pdf;base64,AAAA";
    fireEvent.click(within(secao).getByRole("button", { name: "Abrir teste-de-campo.pdf" }));
    await waitFor(() => expect(cliques).toHaveLength(2));
    expect(cliques[1]).toMatchObject({ download: "teste-de-campo.pdf", target: "" });
    linkEvidencia.url = "https://storage.exemplo.com/a.pdf?assinatura=1";
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
    expect(itens[1]).not.toHaveTextContent("Evidência");
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
