import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { ComparacaoAutoavaliacao } from "@/components/scout/ComparacaoAutoavaliacao";
import { MinhaAutoavaliacao } from "@/components/scout/MinhaAutoavaliacao";
import { leituraDiferenca, textoDiferenca } from "@/lib/api/autoavaliacao";

const PILARES = [
  { id: "tec", nome: "Técnica" },
  { id: "amb", nome: "Ambiente de desenvolvimento" },
];
const CICLO = { id: "c1", nome: "Novembro de 2026", status: "aberto" as const };

const indicador = (
  id: string,
  nome: string,
  pilarId: string,
  extra: Record<string, unknown> = {},
) => ({
  indicadorId: id,
  nome,
  pilarId,
  evidencia: "opcional" as const,
  orientacao: null,
  sugestao: null,
  treinador: null,
  diferenca: null,
  ...extra,
});

const ESCALA_GERAL = [
  { nota: 0, descricao: "Sem evidência" },
  { nota: 3, descricao: "Nível regional consistente" },
  { nota: 5, descricao: "Referência nacional" },
];

function dados(extra: Record<string, unknown> = {}) {
  return {
    ciclo: CICLO,
    indicadores: [
      indicador("tec_1", "Leitura de vento", "tec"),
      indicador("tec_2", "Manobras", "tec"),
      indicador("amb_1", "Apoio do clube", "amb"),
    ],
    rubricas: [{ pilarId: null, notas: ESCALA_GERAL }],
    resumoPorPilar: null,
    ...extra,
  };
}

function cliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function montar(resposta: unknown, aoPedirRevisao = vi.fn()) {
  GET.mockResolvedValue({ data: resposta, response: { status: 200 } });
  render(
    <QueryClientProvider client={cliente()}>
      <MinhaAutoavaliacao atletaId="a07" pilares={PILARES} aoPedirRevisao={aoPedirRevisao} />
    </QueryClientProvider>,
  );
  return aoPedirRevisao;
}

const nota = (indicador: string, n: number) =>
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: `Sua nota para ${indicador}` })).getByRole(
      "radio",
      { name: String(n) },
    ),
  );

const corpoEnviado = () =>
  (POST.mock.calls.find((c) => c[0] === "/autoavaliacoes")?.[1] as { body: unknown } | undefined)
    ?.body;

const erro400 = (campos: { campo: string; mensagem: string }[]) => ({
  error: { erro: "requisicao_invalida", mensagem: "Dados inválidos.", campos },
  response: { status: 400 },
});

beforeEach(() => {
  vi.clearAllMocks();
  POST.mockResolvedValue({
    data: { cicloId: "c1", enviadas: 1 },
    response: { status: 201 },
  });
  DELETE.mockResolvedValue({ response: { status: 204 } });
});

describe("Minha autoavaliação", () => {
  describe("evidência, orientação e escala (D9)", () => {
    const obrigatorio = () =>
      dados({
        indicadores: [
          indicador("tec_1", "Leitura de vento", "tec", {
            evidencia: "obrigatoria",
            orientacao: "Descreva o teste de campo que embasa a nota.",
          }),
          indicador("tec_2", "Manobras", "tec", { evidencia: "opcional" }),
        ],
      });

    it("rotula a evidência como obrigatória ou opcional antes de enviar", async () => {
      montar(obrigatorio());
      await screen.findByRole("heading", { level: 3, name: "Técnica" });
      nota("Leitura de vento", 4);
      nota("Manobras", 3);
      expect(screen.getByLabelText("Evidência (obrigatória)")).toBeTruthy();
      expect(screen.getByLabelText("Evidência (opcional)")).toBeTruthy();
    });

    it("bloqueia no cliente a evidência obrigatória vazia e envia depois de preencher", async () => {
      montar(obrigatorio());
      await screen.findByRole("heading", { level: 3, name: "Técnica" });
      nota("Leitura de vento", 4);
      fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
      const msg = await screen.findByText(/Informe a evidência da nota: este indicador a exige/);
      const campo = screen.getByLabelText("Evidência (obrigatória)");
      expect(campo.getAttribute("aria-invalid")).toBe("true");
      expect(campo.getAttribute("aria-describedby")).toBe(msg.id);
      expect(POST).not.toHaveBeenCalled();
      fireEvent.change(campo, { target: { value: "Teste de 12/11" } });
      fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
      await waitFor(() =>
        expect(corpoEnviado()).toEqual({
          notas: [{ indicadorId: "tec_1", valor: 4, evidencia: "Teste de 12/11" }],
        }),
      );
    });

    it("mostra a orientação do indicador e liga ao grupo de notas", async () => {
      montar(obrigatorio());
      const texto = await screen.findByText("Descreva o teste de campo que embasa a nota.");
      const grupo = screen.getByRole("radiogroup", { name: "Sua nota para Leitura de vento" });
      expect(grupo.getAttribute("aria-describedby")).toBe(texto.id);
      const outro = screen.getByRole("radiogroup", { name: "Sua nota para Manobras" });
      expect(outro.getAttribute("aria-describedby")).toBeNull();
    });

    it("mostra a escala geral e a descrição da nota escolhida", async () => {
      montar(obrigatorio());
      await screen.findByRole("heading", { level: 3, name: "Técnica" });
      expect(screen.getByText("Escala de notas de Técnica")).toBeTruthy();
      expect(screen.getAllByText("Referência nacional").length).toBeGreaterThan(0);
      nota("Leitura de vento", 3);
      expect(screen.getByText("Nota 3: Nível regional consistente")).toBeTruthy();
    });

    it("usa a rubrica própria do pilar no lugar da escala geral", async () => {
      montar(
        dados({
          rubricas: [
            { pilarId: null, notas: ESCALA_GERAL },
            {
              pilarId: "tec",
              notas: [{ nota: 4, descricao: "Domina as manobras em vento forte" }],
            },
          ],
        }),
      );
      await screen.findByRole("heading", { level: 3, name: "Técnica" });
      nota("Leitura de vento", 4);
      expect(screen.getByText("Nota 4: Domina as manobras em vento forte")).toBeTruthy();
      // O pilar Ambiente não tem rubrica própria: vale a escala geral.
      nota("Apoio do clube", 5);
      expect(screen.getByText("Nota 5: Referência nacional")).toBeTruthy();
    });
  });

  it("lista os indicadores por pilar e envia a nota com a evidência", async () => {
    montar(dados());
    expect(await screen.findByRole("heading", { level: 3, name: "Técnica" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: "Ambiente de desenvolvimento" }),
    ).toBeTruthy();
    expect(screen.getByText(/não entra no score/)).toBeTruthy();
    const enviar = screen.getByRole("button", { name: "Enviar autoavaliação" });
    expect(enviar).toBeDisabled();

    nota("Leitura de vento", 4);
    fireEvent.change(screen.getByLabelText("Evidência (opcional)"), {
      target: { value: "Treino de vento" },
    });
    fireEvent.change(screen.getByLabelText("Link do vídeo (opcional)"), {
      target: { value: "https://youtu.be/abc" },
    });
    expect(enviar).toBeEnabled();
    fireEvent.click(enviar);
    await waitFor(() =>
      expect(corpoEnviado()).toEqual({
        notas: [
          {
            indicadorId: "tec_1",
            valor: 4,
            evidencia: "Treino de vento",
            link: "https://youtu.be/abc",
          },
        ],
      }),
    );
    await waitFor(() =>
      expect(toastFn.success).toHaveBeenCalledWith("Autoavaliação enviada: 1 indicador."),
    );
  });

  it("envia sem evidência quando o indicador a dispensa (a API é quem decide)", async () => {
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Manobras", 3);
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    await waitFor(() =>
      expect(corpoEnviado()).toEqual({ notas: [{ indicadorId: "tec_2", valor: 3 }] }),
    );
  });

  it("a API recusa a evidência: mostra o 400 no campo", async () => {
    POST.mockResolvedValue(
      erro400([{ campo: "notas.0.evidencia", mensagem: "Informe a evidência." }]),
    );
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Leitura de vento", 4);
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    const msg = await screen.findByText("Informe a evidência.");
    const campo = await screen.findByLabelText("Evidência (opcional)");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe(msg.id);
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it("bloqueia no cliente um link que não é https", async () => {
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Leitura de vento", 4);
    fireEvent.change(screen.getByLabelText("Link do vídeo (opcional)"), {
      target: { value: "http://exemplo.com/v" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    expect(await screen.findByText(/comece com https:\/\//)).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
  });

  it("sem ciclo aberto (409): explica que a autoavaliação abre com o ciclo", async () => {
    POST.mockResolvedValue({
      error: { erro: "conflito", mensagem: "Sem ciclo aberto." },
      response: { status: 409 },
    });
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Leitura de vento", 2);
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Não há ciclo de avaliação aberto");
  });

  it("com o ciclo fechado, a escala fica desabilitada e não há envio", async () => {
    montar(dados({ ciclo: { ...CICLO, status: "fechado" } }));
    expect(await screen.findByText(/está fechado/)).toBeTruthy();
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Enviar/ })).toBeNull();
  });

  it("sem ciclo, avisa e não oferece envio", async () => {
    montar({ ciclo: null, indicadores: [], rubricas: [], resumoPorPilar: null });
    expect(await screen.findByText(/Não há ciclo de avaliação aberto/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enviar/ })).toBeNull();
  });

  it("mostra o que foi enviado, a nota do treinador com a justificativa e o atalho de revisão", async () => {
    const pedir = montar(
      dados({
        indicadores: [
          indicador("tec_1", "Leitura de vento", "tec", {
            sugestao: {
              valor: 4,
              evidencia: "Treino de vento",
              link: null,
              anexo: null,
              em: "2026-11-10T12:00:00.000Z",
            },
            treinador: {
              valor: 3,
              origem: "avaliacao",
              justificativa: "Largadas irregulares",
              avaliador: { nome: "Ana Ribeiro" },
              em: "2026-11-12T12:00:00.000Z",
            },
            diferenca: -1,
          }),
          indicador("tec_2", "Manobras", "tec", {
            sugestao: {
              valor: 5,
              evidencia: null,
              link: null,
              anexo: null,
              em: "2026-11-10T12:00:00.000Z",
            },
            treinador: {
              valor: 5,
              origem: "autoavaliacao_aprovada",
              justificativa: null,
              avaliador: { nome: "Ana Ribeiro" },
              em: "2026-11-12T12:00:00.000Z",
            },
            diferenca: 0,
          }),
        ],
      }),
    );
    expect(await screen.findByText(/Sua sugestão: 4 · enviada em/)).toBeTruthy();
    expect(screen.getByText("Evidência: Treino de vento")).toBeTruthy();
    expect(screen.getByText("Nota do treinador: 3").parentElement?.textContent).toContain(
      "corrigiu sua sugestão de 4",
    );
    expect(screen.getByText("Justificativa: Largadas irregulares")).toBeTruthy();
    expect(screen.getByText("Nota do treinador: 5").parentElement?.textContent).toContain(
      "aprovou sua sugestão",
    );
    // O atalho só aparece onde a nota foi corrigida.
    const pedirRevisao = screen.getAllByRole("button", { name: /Pedir revisão da nota de/ });
    expect(pedirRevisao).toHaveLength(1);
    fireEvent.click(pedirRevisao[0]!);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it("anexo opcional: envia antes com a categoria evidência e leva o anexoId na nota", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/atletas/{id}/evidencias"
          ? {
              data: { id: "anx1", nomeArquivo: "treino.png", indicadorId: "tec_1" },
              response: { status: 201 },
            }
          : { data: { cicloId: "c1", enviadas: 1 }, response: { status: 201 } },
      ),
    );
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Leitura de vento", 4);
    const arquivo = new File(["x"], "treino.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento (opcional)"), {
      target: { files: [arquivo] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    await waitFor(() => expect(corpoEnviado()).toBeTruthy());
    const envio = POST.mock.calls.find((c) => c[0] === "/atletas/{id}/evidencias")?.[1] as {
      body: { categoria: string; indicadorId: string };
    };
    expect(envio.body.categoria).toBe("evidencia");
    expect(envio.body.indicadorId).toBe("tec_1");
    expect(corpoEnviado()).toEqual({
      notas: [{ indicadorId: "tec_1", valor: 4, anexoId: "anx1" }],
    });
  });

  it("apaga o anexo recém-enviado quando a API recusa a autoavaliação", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/atletas/{id}/evidencias"
          ? {
              data: { id: "anx1", nomeArquivo: "treino.png", indicadorId: "tec_1" },
              response: { status: 201 },
            }
          : erro400([{ campo: "notas.0.valor", mensagem: "Nota inválida." }]),
      ),
    );
    montar(dados());
    await screen.findByRole("heading", { level: 3, name: "Técnica" });
    nota("Leitura de vento", 4);
    fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento (opcional)"), {
      target: { files: [new File(["x"], "treino.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar autoavaliação" }));
    expect(await screen.findByText("Nota inválida.")).toBeTruthy();
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith("/evidencias/{id}", { params: { path: { id: "anx1" } } }),
    );
  });
});

describe("Atleta × treinador", () => {
  const PILARES_FICHA = [
    { id: "tec", nomeCurto: "Técnica" },
    { id: "amb", nomeCurto: "Ambiente" },
  ];
  const comparacao = (resumo: unknown) => ({
    ciclo: CICLO,
    indicadores: [
      indicador("tec_1", "Leitura de vento", "tec", {
        sugestao: {
          valor: 4,
          evidencia: null,
          link: null,
          anexo: null,
          em: "2026-11-10T12:00:00.000Z",
        },
        treinador: {
          valor: 3,
          origem: "avaliacao",
          justificativa: "Largadas irregulares",
          avaliador: { nome: "Ana Ribeiro" },
          em: "2026-11-12T12:00:00.000Z",
        },
        diferenca: -1,
      }),
      indicador("tec_2", "Manobras", "tec", {
        sugestao: {
          valor: 3,
          evidencia: null,
          link: null,
          anexo: null,
          em: "2026-11-10T12:00:00.000Z",
        },
        treinador: {
          valor: 5,
          origem: "avaliacao",
          justificativa: "Evoluiu muito",
          avaliador: { nome: "Ana Ribeiro" },
          em: "2026-11-12T12:00:00.000Z",
        },
        diferenca: 2,
      }),
      indicador("amb_1", "Apoio do clube", "amb", {
        sugestao: {
          valor: 2,
          evidencia: null,
          link: null,
          anexo: null,
          em: "2026-11-10T12:00:00.000Z",
        },
        treinador: {
          valor: 2,
          origem: "autoavaliacao_aprovada",
          justificativa: null,
          avaliador: { nome: "Ana Ribeiro" },
          em: "2026-11-12T12:00:00.000Z",
        },
        diferenca: 0,
      }),
    ],
    resumoPorPilar: resumo,
  });

  function montarComparacao(resposta: unknown) {
    GET.mockResolvedValue({ data: resposta, response: { status: 200 } });
    render(
      <QueryClientProvider client={cliente()}>
        <ComparacaoAutoavaliacao atletaId="a07" pilares={PILARES_FICHA} />
      </QueryClientProvider>,
    );
  }

  it("gestor vê a tabela com diferença com sinal e o resumo por pilar", async () => {
    montarComparacao(
      comparacao([
        { pilarId: "tec", nomeCurto: "Técnica", diferencaMedia: 0.5 },
        { pilarId: "amb", nomeCurto: "Ambiente", diferencaMedia: -1 },
        { pilarId: "cf", nomeCurto: "Class Fit", diferencaMedia: null },
      ]),
    );
    expect(await screen.findByRole("heading", { name: "Atleta × treinador" })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Diferença média por pilar" })).toBeTruthy();
    const tabela = screen.getByRole("table");
    const linha = within(tabela).getByRole("row", { name: /Leitura de vento/ });
    expect(within(linha).getByText(/−1/)).toBeTruthy();
    expect(within(linha).getByText("(treinador deu nota menor)")).toBeTruthy();
    expect(within(linha).getByText("Largadas irregulares")).toBeTruthy();
    const alta = within(tabela).getByRole("row", { name: /Manobras/ });
    expect(within(alta).getByText(/\+2/)).toBeTruthy();
    const aprovada = within(tabela).getByRole("row", { name: /Apoio do clube/ });
    expect(within(aprovada).getByText("Aprovada")).toBeTruthy();
    const resumo = screen.getByRole("list");
    expect(within(resumo).getByText("Técnica").parentElement?.textContent).toContain("+0,5");
    expect(within(resumo).getByText("Ambiente").parentElement?.textContent).toContain("−1,0");
  });

  it("treinador não recebe o resumo por pilar", async () => {
    montarComparacao(comparacao(null));
    await screen.findByRole("table");
    expect(screen.queryByRole("heading", { name: "Diferença média por pilar" })).toBeNull();
  });

  it("sem sugestões no ciclo, mostra a mensagem em vez da tabela", async () => {
    montarComparacao({
      ciclo: CICLO,
      indicadores: [indicador("tec_1", "Leitura", "tec")],
      resumoPorPilar: null,
    });
    expect(
      await screen.findByText("O atleta ainda não enviou sugestões neste ciclo."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("formata a diferença com sinal tipográfico", () => {
    expect(textoDiferenca(2)).toBe("+2");
    expect(textoDiferenca(-1)).toBe("−1");
    expect(textoDiferenca(0)).toBe("0");
    expect(textoDiferenca(null)).toBe("—");
    expect(textoDiferenca(-0.4, 1)).toBe("−0,4");
    expect(leituraDiferenca(0).texto).toBe("notas iguais");
    expect(leituraDiferenca(1).texto).toBe("treinador deu nota maior");
  });
});
