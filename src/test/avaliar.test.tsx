import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useNavigate,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

import { TelaAvaliar } from "@/components/scout/TelaAvaliar";

const faixa = { id: "f3", nome: "Em desenvolvimento", nomeCurto: "Em desenvolvimento" };
const faixa2 = { id: "f2", nome: "Alto potencial", nomeCurto: "Alto potencial" };

const ind = (id: string, nome: string, extra: Record<string, unknown> = {}) => ({
  id,
  nome,
  tipo: "T" as const,
  calculado: false,
  nota: 2,
  evidencia: "Teste anterior",
  origem: "avaliacao" as const,
  avaliador: { id: "u1", nome: "Ana Ribeiro" },
  lancadoEm: "2026-11-05T12:00:00.000Z",
  resposta: null,
  sugestaoPendente: null,
  sugestaoPontos: null,
  ...extra,
});

const pilarFicha = (id: string, nome: string, peso: number, indicadores: unknown[]) => ({
  id,
  nome,
  nomeCurto: nome,
  peso,
  nota: 2,
  contribuicao: 8,
  preenchidos: 1,
  total: indicadores.length,
  restrito: false,
  indicadores,
});

const FICHA = {
  atleta: { id: "a07", nome: "Helena Vasques" },
  score: 71.5,
  faixa,
  gates: { statusFinal: "condicional", itens: [] },
  classFit: { pesoKg: 62, alturaCm: 172 },
  pilares: [
    pilarFicha("tec", "Técnica", 15, [
      ind("tec_1", "Leitura de vento"),
      ind("tec_2", "Manobras", {
        tipo: "A",
        nota: null,
        evidencia: null,
        origem: null,
        resposta: "Treino todo dia",
        sugestaoPendente: { valor: 4, lancadoEm: "2026-11-06T10:00:00.000Z" },
      }),
    ]),
    pilarFicha("cf", "Class Fit", 20, [
      ind("cf_peso_kg", "Peso", { calculado: true, nota: 5 }),
      ind("cf_hist", "Histórico", { tipo: "R", nota: null }),
    ]),
  ],
};

const PARAMETROS = {
  pilares: [
    {
      id: "tec",
      nome: "Técnica",
      nomeCurto: "Técnica",
      peso: 15,
      sensivel: false,
      evidenciaPadrao: "Vídeo de treino",
      indicadores: [],
    },
    {
      id: "cf",
      nome: "Class Fit",
      nomeCurto: "Class Fit",
      peso: 20,
      sensivel: true,
      evidenciaPadrao: "Pesagem",
      indicadores: [],
    },
  ],
  faixas: [],
  classes: [],
  rubricas: [0, 1, 2, 3, 4, 5].map((n) => ({
    pilarId: null,
    nota: n,
    descricao: `Escala geral ${n}`,
  })),
  regras: [],
  componentesCusto: [],
};

const RANKING = {
  ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
  ocultosSemConsentimento: null,
  itens: [
    {
      posicao: 1,
      atleta: {
        id: "a07",
        nome: "Helena Vasques",
        classe: { id: "c1", nome: "ILCA 6", evento: "ILCA 6" },
      },
      completo: false,
    },
    {
      posicao: 2,
      atleta: {
        id: "a08",
        nome: "Bruno Lima",
        classe: { id: "c2", nome: "ILCA 7", evento: "ILCA 7" },
      },
      completo: true,
    },
  ],
};

const PREVIA = {
  antes: {
    score: 71.5,
    faixa,
    pilares: [
      { id: "tec", nota: 2 },
      { id: "cf", nota: 5 },
    ],
  },
  depois: {
    score: 76.5,
    faixa: faixa2,
    pilares: [
      { id: "tec", nota: 4 },
      { id: "cf", nota: 5 },
    ],
    statusGates: "apto",
  },
};

function preparar(extra: { ranking?: unknown; ficha?: unknown } = {}) {
  GET.mockImplementation((caminho: string) => {
    if (caminho === "/ranking") {
      return Promise.resolve({ data: extra.ranking ?? RANKING, response: { status: 200 } });
    }
    if (caminho === "/parametros")
      return Promise.resolve({ data: PARAMETROS, response: { status: 200 } });
    return Promise.resolve({ data: extra.ficha ?? FICHA, response: { status: 200 } });
  });
  POST.mockImplementation((caminho: string) =>
    Promise.resolve(
      caminho.endsWith("/previa")
        ? { data: PREVIA, response: { status: 200 } }
        : caminho.endsWith("/evidencias")
          ? {
              data: { id: "anx1", nomeArquivo: "regata.pdf", indicadorId: "tec_1" },
              response: { status: 201 },
            }
          : { data: { antes: PREVIA.antes, depois: PREVIA.depois }, response: { status: 201 } },
    ),
  );
}

function montar(atletaId?: string, aoEscolher = vi.fn()) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaAvaliar atletaId={atletaId} aoEscolher={aoEscolher} />
    </QueryClientProvider>,
  );
  return aoEscolher;
}

const evidencia = () =>
  screen.getAllByLabelText(/Evidência \(obrigatória\)/)[0] as HTMLInputElement;

const nota = (indicador: string, n: number) =>
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: `Nota de ${indicador}` })).getByRole("radio", {
      name: String(n),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  preparar();
  DELETE.mockResolvedValue({ response: { status: 204 } });
});

describe("TelaAvaliar", () => {
  it("lista os atletas do ranking e avisa a escolha", async () => {
    const aoEscolher = montar();
    expect(screen.getByRole("heading", { level: 1, name: "Lançar avaliação" })).toBeTruthy();
    const select = await screen.findByLabelText("Atleta");
    await screen.findByRole("option", { name: /Bruno Lima · ILCA 7/ });
    expect(screen.getByRole("option", { name: /Helena Vasques · ILCA 6 · pendente/ })).toBeTruthy();
    fireEvent.change(select, { target: { value: "a08" } });
    expect(aoEscolher).toHaveBeenCalledWith("a08");
  });

  it("mostra estado vazio sem atletas", async () => {
    preparar({ ranking: { ...RANKING, itens: [] } });
    montar();
    expect(await screen.findByText("Nenhum atleta para avaliar")).toBeTruthy();
  });

  it("mostra o erro da API ao carregar o atleta", async () => {
    GET.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/ranking"
          ? { data: RANKING, response: { status: 200 } }
          : {
              error: { erro: "sem_acesso", mensagem: "Atleta de outro treinador." },
              response: { status: 403 },
            },
      ),
    );
    montar("a07");
    expect((await screen.findByRole("alert")).textContent).toContain("Atleta de outro treinador.");
  });

  it("exige evidência e chama a prévia com o corpo certo", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    expect(screen.getByText("Nota 4: Escala geral 4")).toBeTruthy();
    expect(screen.getByText(/Informe a evidência/, { selector: "span" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar avaliação" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(POST).not.toHaveBeenCalled();

    fireEvent.change(evidencia(), {
      target: { value: "Regata de seleção" },
    });
    await waitFor(
      () =>
        expect(POST).toHaveBeenCalledWith("/atletas/{id}/avaliacoes/previa", {
          params: { path: { id: "a07" } },
          body: { notas: [{ indicadorId: "tec_1", valor: 4, evidencia: "Regata de seleção" }] },
        }),
      { timeout: 2000 },
    );
    expect(await screen.findByText("76,5")).toBeTruthy();
    expect(screen.getByText(/71,5 →/)).toBeTruthy();
    expect(screen.getByText("Apto")).toBeTruthy();
  });

  it("envia só o que mudou, avisa o novo score e limpa o formulário", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 3);
    fireEvent.change(evidencia(), {
      target: { value: "Regata de seleção" },
    });
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    expect(toastFn.success.mock.calls[0]?.[0]).toContain("76,5");
    const envio = POST.mock.calls.find((c) => c[0] === "/atletas/{id}/avaliacoes");
    expect(envio?.[1]).toEqual({
      params: { path: { id: "a07" } },
      body: { notas: [{ indicadorId: "tec_1", valor: 3, evidencia: "Regata de seleção" }] },
    });
    await waitFor(() => expect(screen.queryByLabelText(/Evidência \(obrigatória\)/)).toBeNull());
  });

  it("sem atleta escolhido mostra cartões clicáveis com classe e score", async () => {
    preparar({
      ranking: {
        ...RANKING,
        itens: RANKING.itens.map((i, n) => ({ ...i, score: n === 0 ? 71.5 : 80 })),
      },
    });
    const aoEscolher = montar();
    const cartao = await screen.findByRole("button", { name: /Helena Vasques.*ILCA 6.*71,5/ });
    expect(cartao.textContent).toContain("Pendente");
    expect(screen.getByRole("button", { name: /Bruno Lima.*ILCA 7.*80,0/ })).toBeTruthy();
    fireEvent.click(cartao);
    expect(aoEscolher).toHaveBeenCalledWith("a07");
  });

  it("com atleta escolhido não mostra a grade de cartões", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    expect(screen.queryByRole("heading", { name: "Escolha um atleta" })).toBeNull();
  });

  it("evidência e anexo só aparecem quando a nota muda, sem roubar o foco das notas", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    expect(screen.getByText("Atual: 2 · Escala geral 2")).toBeTruthy();
    expect(screen.queryByLabelText(/Evidência \(obrigatória\)/)).toBeNull();
    expect(screen.queryByLabelText("Anexar evidência de Leitura de vento")).toBeNull();
    const radio4 = within(
      screen.getByRole("radiogroup", { name: "Nota de Leitura de vento" }),
    ).getByRole("radio", { name: "4" });
    radio4.focus();
    fireEvent.click(radio4);
    const campo = evidencia();
    expect(campo.getAttribute("placeholder")).toBe("Ex.: Vídeo de treino");
    // O foco continua no grupo de notas; o campo novo é anunciado por região aria-live.
    await new Promise((res) => setTimeout(res, 30));
    expect(document.activeElement).toBe(radio4);
    const aviso = screen.getByText("Evidência obrigatória para a nova nota de Leitura de vento");
    expect(aviso.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByLabelText("Anexar evidência de Leitura de vento")).toBeTruthy();
    expect(screen.getByText("PDF, JPG ou PNG, até 5 MB")).toBeTruthy();
    // Voltar à nota atual, sem texto, recolhe de novo.
    nota("Leitura de vento", 2);
    expect(screen.queryByLabelText(/Evidência \(obrigatória\)/)).toBeNull();
  });

  it("o botão «Usar …» preenche a evidência com o texto padrão do pilar", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    fireEvent.click(screen.getByRole("button", { name: "Usar «Vídeo de treino»" }));
    expect(evidencia().value).toBe("Vídeo de treino");
  });

  it("mostra a escala com os números de 0 a 5 visíveis", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    const itens = screen.getByText("Escala geral").parentElement?.querySelectorAll("li") ?? [];
    expect(itens).toHaveLength(6);
    expect(Array.from(itens).map((li) => li.querySelector(".escala-nota")?.textContent)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(itens[3]?.textContent).toContain("Escala geral 3");
  });

  it("usa a sugestão pendente e mostra a resposta do atleta", async () => {
    montar("a07");
    expect(await screen.findByText(/Resposta do atleta: “Treino todo dia”/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Usar sugestão 4 em Manobras/ }));
    const quatro = within(screen.getByRole("radiogroup", { name: "Nota de Manobras" })).getByRole(
      "radio",
      { name: "4" },
    ) as HTMLInputElement;
    expect(quatro.checked).toBe(true);
  });

  it("sugestão do Ranking CBVela em resultados nacionais: usa a nota e a evidência continua obrigatória", async () => {
    preparar({
      ficha: {
        ...FICHA,
        pilares: [
          pilarFicha("perf", "Performance", 20, [
            ind("perf_nacional", "Resultados nacionais", {
              sugestaoPontos: { nota: 4, pontos: 310.03 },
            }),
          ]),
          ...FICHA.pilares,
        ],
      },
    });
    montar("a07");
    expect(await screen.findByText("Sugerido pelo Ranking CBVela: nota 4 (310 pts)")).toBeTruthy();
    // Sem sugestão nos outros indicadores.
    expect(screen.getAllByText(/Sugerido pelo Ranking CBVela/)).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Usar sugestão do Ranking CBVela (nota 4) em Resultados nacionais",
      }),
    );
    const quatro = within(
      screen.getByRole("radiogroup", { name: "Nota de Resultados nacionais" }),
    ).getByRole("radio", { name: "4" }) as HTMLInputElement;
    expect(quatro.checked).toBe(true);

    const ev = screen.getByLabelText("Evidência (obrigatória)", {
      selector: "#ev-perf_nacional",
    }) as HTMLInputElement;
    await waitFor(() => expect(ev.getAttribute("aria-invalid")).toBe("true"));
    expect(POST).not.toHaveBeenCalledWith("/atletas/{id}/avaliacoes/previa", expect.anything());

    fireEvent.change(ev, { target: { value: "Ranking CBVela 2026" } });
    await waitFor(
      () =>
        expect(POST).toHaveBeenCalledWith("/atletas/{id}/avaliacoes/previa", {
          params: { path: { id: "a07" } },
          body: {
            notas: [{ indicadorId: "perf_nacional", valor: 4, evidencia: "Ranking CBVela 2026" }],
          },
        }),
      { timeout: 2000 },
    );
  });

  it("indicador calculado não recebe nota e envia peso e altura em medida", async () => {
    montar("a07");
    fireEvent.click(await screen.findByRole("button", { name: /Class Fit/ }));
    expect(screen.queryByRole("radiogroup", { name: "Nota de Peso" })).toBeNull();
    expect(screen.getByText(/Registrado, não pontua/)).toBeTruthy();
    expect((screen.getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("62");
    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "64.5" } });
    await waitFor(
      () =>
        expect(POST).toHaveBeenCalledWith("/atletas/{id}/avaliacoes/previa", {
          params: { path: { id: "a07" } },
          body: { notas: [], medida: { pesoKg: 64.5 } },
        }),
      { timeout: 2000 },
    );
  });

  it("mostra a mensagem da API quando o envio falha", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho.endsWith("/previa")
          ? { data: PREVIA, response: { status: 200 } }
          : {
              error: { erro: "requisicao_invalida", mensagem: "Ciclo encerrado." },
              response: { status: 400 },
            },
      ),
    );
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 5);
    fireEvent.change(evidencia(), {
      target: { value: "Regata de seleção" },
    });
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    expect((await screen.findByText("Ciclo encerrado.")).getAttribute("role") ?? "alert").toBe(
      "alert",
    );
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it("anexa evidência ao indicador e envia o anexoId junto da nota (prévia sem anexo)", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 3);
    const campo = screen.getByLabelText("Anexar evidência de Leitura de vento");

    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(campo, { target: { files: [grande] } });
    expect((await screen.findByRole("alert")).textContent).toContain("passa de 5 MB");
    expect(POST).not.toHaveBeenCalled();

    fireEvent.change(campo, {
      target: { files: [new File(["abc"], "regata.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/evidencias", {
        params: { path: { id: "a07" } },
        body: {
          nomeArquivo: "regata.pdf",
          tipoMime: "application/pdf",
          conteudoBase64: "YWJj",
          indicadorId: "tec_1",
        },
      }),
    );
    expect(await screen.findByText(/Anexo segue junto da nota/)).toBeTruthy();

    fireEvent.change(evidencia(), { target: { value: "Regata de seleção" } });
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    await waitFor(
      () =>
        expect(POST).toHaveBeenCalledWith("/atletas/{id}/avaliacoes/previa", {
          params: { path: { id: "a07" } },
          body: { notas: [{ indicadorId: "tec_1", valor: 3, evidencia: "Regata de seleção" }] },
        }),
      { timeout: 2000 },
    );
    fireEvent.click(salvar);
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    const envio = POST.mock.calls.find((c) => c[0] === "/atletas/{id}/avaliacoes");
    expect(envio?.[1]).toEqual({
      params: { path: { id: "a07" } },
      body: {
        notas: [
          { indicadorId: "tec_1", valor: 3, evidencia: "Regata de seleção", anexoId: "anx1" },
        ],
      },
    });
  });

  describe("upload de anexo em andamento", () => {
    let liberar: (v: unknown) => void;
    beforeEach(() => {
      liberar = undefined as never;
    });
    const anexoPronto = {
      data: { id: "anx1", nomeArquivo: "regata.pdf", indicadorId: "tec_1" },
      response: { status: 201 },
    };

    function subindo() {
      const padrao = POST.getMockImplementation()!;
      POST.mockImplementation((caminho: string, ...resto: unknown[]) =>
        caminho.endsWith("/evidencias")
          ? new Promise((res) => {
              liberar = res;
            })
          : padrao(caminho, ...resto),
      );
    }

    async function comecarUpload() {
      subindo();
      montar("a07");
      await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
      nota("Leitura de vento", 3);
      fireEvent.change(evidencia(), { target: { value: "Regata de seleção" } });
      fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento"), {
        target: { files: [new File(["abc"], "regata.pdf", { type: "application/pdf" })] },
      });
      await screen.findByText("Enviando…");
      await waitFor(() => expect(liberar).toBeTypeOf("function"));
    }

    it("Salvar e Descartar ficam desabilitados até o upload terminar", async () => {
      await comecarUpload();
      const salvar = screen.getByRole("button", { name: "Enviando anexo…" });
      expect(salvar.hasAttribute("disabled")).toBe(true);
      expect(screen.getByRole("button", { name: "Descartar" }).hasAttribute("disabled")).toBe(true);
      fireEvent.click(salvar);
      expect(POST.mock.calls.some((c) => c[0] === "/atletas/{id}/avaliacoes")).toBe(false);

      liberar(anexoPronto);
      const habilitado = await screen.findByRole("button", { name: "Salvar avaliação" });
      await waitFor(() => expect(habilitado.hasAttribute("disabled")).toBe(false));
      expect(screen.getByRole("button", { name: "Descartar" }).hasAttribute("disabled")).toBe(
        false,
      );
    });

    it("o corpo gravado depois do upload inclui o anexoId", async () => {
      await comecarUpload();
      liberar(anexoPronto);
      const salvar = await screen.findByRole("button", { name: "Salvar avaliação" });
      await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
      fireEvent.click(salvar);
      await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
      const envio = POST.mock.calls.find((c) => c[0] === "/atletas/{id}/avaliacoes");
      expect(envio?.[1].body.notas[0]).toMatchObject({ indicadorId: "tec_1", anexoId: "anx1" });
    });

    it("upload que termina depois de a nota voltar ao valor atual não cria rascunho fantasma", async () => {
      await comecarUpload();
      nota("Leitura de vento", 2);
      liberar(anexoPronto);
      await new Promise((res) => setTimeout(res, 50));
      expect(screen.queryByText(/Anexo segue junto da nota/)).toBeNull();
      expect(screen.queryByLabelText(/Evidência (obrigatória)/)).toBeNull();
    });

    it("trocar de pilar durante o upload não trava o Salvar", async () => {
      await comecarUpload();
      fireEvent.click(screen.getByRole("button", { name: /Class Fit/ }));
      liberar(anexoPronto);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Salvar avaliação" }).hasAttribute("disabled"),
        ).toBe(false),
      );
    });
  });
});

describe("TelaAvaliar: erros por campo", () => {
  async function abrirCf() {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    fireEvent.click(screen.getByRole("button", { name: /Class Fit/ }));
    return screen.findByLabelText("Peso (kg)");
  }

  it("altura em metros explica que é em centímetros, com aria-invalid e aria-describedby", async () => {
    await abrirCf();
    const altura = screen.getByLabelText("Altura (cm)");
    fireEvent.change(altura, { target: { value: "1.82" } });
    const msg = await screen.findByText(/A altura é em centímetros, não em metros/);
    expect(altura.getAttribute("aria-invalid")).toBe("true");
    expect(altura.getAttribute("aria-describedby")).toBe(msg.id);
    expect(POST).not.toHaveBeenCalled();
  });

  it("peso fora de 30 a 160 kg e evidência da medida curta mostram mensagem sob o campo", async () => {
    await abrirCf();
    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "200" } });
    expect(await screen.findByText("Informe o peso em kg, de 30 a 160.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText(/Evidência da medida/), { target: { value: "ab" } });
    expect(await screen.findByText(/evidência da medida deve ter de 3 a 200/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar avaliação" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("no celular, a barra mostra o erro certo e não 'Falta evidência'", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: true,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      await abrirCf();
      fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "5" } });
      const barra = await screen.findByRole("region", { name: /Resumo e ações/ });
      expect(barra.textContent).toContain("Informe o peso em kg, de 30 a 160.");
      expect(barra.textContent).not.toContain("Falta evidência");
    } finally {
      window.matchMedia = original;
    }
  });

  it("mostra sob o campo a mensagem do 400 da API (notas.0.evidencia)", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    fireEvent.change(evidencia(), { target: { value: "Regata de seleção" } });
    const base = POST.getMockImplementation()!;
    POST.mockImplementation((caminho: string, ...r: unknown[]) =>
      caminho === "/atletas/{id}/avaliacoes"
        ? Promise.resolve({
            error: {
              erro: "validacao",
              mensagem: "Dados inválidos.",
              campos: [{ campo: "notas.0.evidencia", mensagem: "Evidência já usada neste ciclo." }],
            },
            response: { status: 400 },
          })
        : base(caminho, ...r),
    );
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    const msg = await screen.findByText("Evidência já usada neste ciclo.");
    expect(evidencia().getAttribute("aria-invalid")).toBe("true");
    expect(evidencia().getAttribute("aria-describedby")).toBe(msg.id);
    fireEvent.change(evidencia(), { target: { value: "Outra evidência" } });
    await waitFor(() => expect(screen.queryByText("Evidência já usada neste ciclo.")).toBeNull());
  });
});

describe("TelaAvaliar: anexos órfãos", () => {
  let contador = 0;
  beforeEach(() => {
    contador = 0;
    const base = POST.getMockImplementation()!;
    POST.mockImplementation((caminho: string, ...r: unknown[]) =>
      caminho.endsWith("/evidencias")
        ? Promise.resolve({
            data: { id: `anx${++contador}`, nomeArquivo: "regata.pdf", indicadorId: "tec_1" },
            response: { status: 201 },
          })
        : base(caminho, ...r),
    );
  });

  const arquivo = (nome = "regata.pdf") => new File(["abc"], nome, { type: "application/pdf" });

  async function comAnexo(): Promise<void> {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 3);
    fireEvent.change(evidencia(), { target: { value: "Regata de seleção" } });
    fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento"), {
      target: { files: [arquivo()] },
    });
    await screen.findByText(/Anexo segue junto da nota/);
  }
  const apagados = () => DELETE.mock.calls.map((c) => c[1].params.path.id);

  it("remover (x) o anexo apaga o anexo no servidor", async () => {
    await comAnexo();
    fireEvent.click(screen.getByRole("button", { name: "Remover regata.pdf" }));
    await waitFor(() => expect(apagados()).toEqual(["anx1"]));
  });

  it("trocar o anexo apaga o anterior", async () => {
    await comAnexo();
    fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento"), {
      target: { files: [arquivo("nova.pdf")] },
    });
    await waitFor(() => expect(apagados()).toEqual(["anx1"]));
  });

  it("descartar apaga o anexo", async () => {
    await comAnexo();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(apagados()).toEqual(["anx1"]));
  });

  it("voltar a nota ao valor original apaga o anexo", async () => {
    await comAnexo();
    nota("Leitura de vento", 2);
    await waitFor(() => expect(apagados()).toEqual(["anx1"]));
  });

  it("salvar não apaga nada: o anexo agora está vinculado", async () => {
    await comAnexo();
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    cleanup();
    expect(DELETE).not.toHaveBeenCalled();
  });

  it("sair do editor com anexo não salvo apaga o anexo", async () => {
    await comAnexo();
    cleanup();
    await waitFor(() => expect(apagados()).toEqual(["anx1"]));
  });

  it("ignora 404, 410, 409 e falha de rede ao apagar, sem erro na tela", async () => {
    for (const resposta of [
      { response: { status: 409 } },
      { response: { status: 404 } },
      { response: { status: 410 } },
    ]) {
      DELETE.mockReset();
      DELETE.mockResolvedValue(resposta);
      await comAnexo();
      fireEvent.click(screen.getByRole("button", { name: "Remover regata.pdf" }));
      await waitFor(() => expect(DELETE).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("alert")).toBeNull();
      cleanup();
    }
    DELETE.mockReset();
    DELETE.mockRejectedValue(new Error("rede"));
    await comAnexo();
    fireEvent.click(screen.getByRole("button", { name: "Remover regata.pdf" }));
    await waitFor(() => expect(DELETE).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TelaAvaliar: confirmação ao sair com rascunho", () => {
  function montarComRota(inicial: string, navegador = false) {
    const raiz = createRootRoute({ component: () => <Outlet /> });
    const rota = createRoute({
      getParentRoute: () => raiz,
      path: "/avaliar",
      validateSearch: (s: Record<string, unknown>): { atleta?: string } =>
        typeof s["atleta"] === "string" ? { atleta: s["atleta"] } : {},
      component: function Tela() {
        const { atleta } = rota.useSearch();
        const navigate = useNavigate();
        return (
          <TelaAvaliar
            atletaId={atleta}
            aoEscolher={(id) => void navigate({ to: "/avaliar", search: id ? { atleta: id } : {} })}
          />
        );
      },
    });
    const fora = createRoute({
      getParentRoute: () => raiz,
      path: "/fora",
      component: () => <p>Fora</p>,
    });
    const router = createRouter({
      routeTree: raiz.addChildren([rota, fora]),
      history: navegador
        ? (window.history.replaceState({}, "", inicial), createBrowserHistory())
        : createMemoryHistory({ initialEntries: [inicial] }),
    });
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    return router;
  }

  it("trocar de atleta no select com alterações pede confirmação; continuar mantém tudo", async () => {
    const router = montarComRota("/avaliar?atleta=a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    fireEvent.change(await screen.findByLabelText("Atleta"), { target: { value: "a08" } });
    const dialogo = await screen.findByRole("dialog", { name: /Descartar a avaliação/ });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar editando" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(router.state.location.search).toEqual({ atleta: "a07" });
    const quatro = within(
      screen.getByRole("radiogroup", { name: "Nota de Leitura de vento" }),
    ).getByRole("radio", { name: "4" }) as HTMLInputElement;
    expect(quatro.checked).toBe(true);
  });

  it("descartar e sair navega e apaga os anexos órfãos", async () => {
    const base = POST.getMockImplementation()!;
    POST.mockImplementation((caminho: string, ...r: unknown[]) =>
      caminho.endsWith("/evidencias")
        ? Promise.resolve({
            data: { id: "anx9", nomeArquivo: "regata.pdf", indicadorId: "tec_1" },
            response: { status: 201 },
          })
        : base(caminho, ...r),
    );
    const router = montarComRota("/avaliar?atleta=a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    fireEvent.change(evidencia(), { target: { value: "Regata de seleção" } });
    fireEvent.change(screen.getByLabelText("Anexar evidência de Leitura de vento"), {
      target: { files: [new File(["abc"], "regata.pdf", { type: "application/pdf" })] },
    });
    await screen.findByText(/Anexo segue junto da nota/);
    void router.navigate({ to: "/fora" as "/" });
    const dialogo = await screen.findByRole("dialog", { name: /Descartar a avaliação/ });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Descartar e sair" }));
    await screen.findByText("Fora");
    await waitFor(() =>
      expect(DELETE.mock.calls.map((c) => c[1].params.path.id)).toEqual(["anx9"]),
    );
  });

  it("sem alterações, navega sem perguntar; beforeunload só com alteração", async () => {
    const router = montarComRota("/avaliar?atleta=a07", true);
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    const evento = () => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(evento()).toBe(false);
    nota("Leitura de vento", 4);
    expect(evento()).toBe(true);
    nota("Leitura de vento", 2);
    expect(evento()).toBe(false);
    await router.navigate({ to: "/fora" as "/" });
    await screen.findByText("Fora");
  });
});

describe("TelaAvaliar: evidência opcional e link do vídeo (D5)", () => {
  const comOpcional = () => {
    const base = GET.getMockImplementation()!;
    const params = {
      ...PARAMETROS,
      pilares: PARAMETROS.pilares.map((p) =>
        p.id === "tec"
          ? {
              ...p,
              indicadores: [
                {
                  id: "tec_1",
                  nome: "Leitura de vento",
                  tipo: "T",
                  calculado: false,
                  evidencia: "opcional",
                  exigeAnexo: false,
                },
              ],
            }
          : p,
      ),
    };
    GET.mockImplementation((caminho: string, ...r: unknown[]) =>
      caminho === "/parametros"
        ? Promise.resolve({ data: params, response: { status: 200 } })
        : base(caminho, ...r),
    );
  };
  const corpoGravado = () =>
    POST.mock.calls.find((c) => c[0] === "/atletas/{id}/avaliacoes")?.[1] as
      { body: unknown } | undefined;

  it("indicador opcional: rótulo muda e a nota segue sem evidência", async () => {
    comOpcional();
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    expect(screen.getByLabelText("Evidência (opcional)")).toBeTruthy();
    expect(screen.queryByLabelText("Evidência (obrigatória)")).toBeNull();
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    await waitFor(() =>
      expect(corpoGravado()?.body).toEqual({ notas: [{ indicadorId: "tec_1", valor: 4 }] }),
    );
  });

  it("indicador obrigatório sem evidência bloqueia o envio", async () => {
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    expect(screen.getByLabelText("Evidência (obrigatória)")).toBeTruthy();
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    expect(salvar.hasAttribute("disabled")).toBe(true);
    expect(corpoGravado()).toBeUndefined();
  });

  it("link com http:// bloqueia e https:// vai no corpo", async () => {
    comOpcional();
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    const campo = screen.getByLabelText("Link do vídeo (opcional)") as HTMLInputElement;
    fireEvent.change(campo, { target: { value: "http://exemplo.com/v" } });
    expect(await screen.findByText(/comece com https:\/\//)).toBeTruthy();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("button", { name: "Salvar avaliação" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.change(campo, { target: { value: "https://youtu.be/abc" } });
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    await waitFor(() =>
      expect(corpoGravado()?.body).toEqual({
        notas: [{ indicadorId: "tec_1", valor: 4, link: "https://youtu.be/abc" }],
      }),
    );
  });

  it("mostra sob o campo do link o 400 da API (notas.0.link)", async () => {
    comOpcional();
    montar("a07");
    await screen.findByRole("radiogroup", { name: "Nota de Leitura de vento" });
    nota("Leitura de vento", 4);
    fireEvent.change(screen.getByLabelText("Link do vídeo (opcional)"), {
      target: { value: "https://exemplo.com/v" },
    });
    const base = POST.getMockImplementation()!;
    POST.mockImplementation((caminho: string, ...r: unknown[]) =>
      caminho === "/atletas/{id}/avaliacoes"
        ? Promise.resolve({
            error: {
              erro: "requisicao_invalida",
              mensagem: "Dados inválidos.",
              campos: [{ campo: "notas.0.link", mensagem: "Link não aceito." }],
            },
            response: { status: 400 },
          })
        : base(caminho, ...r),
    );
    const salvar = screen.getByRole("button", { name: "Salvar avaliação" });
    await waitFor(() => expect(salvar.hasAttribute("disabled")).toBe(false));
    fireEvent.click(salvar);
    const msg = await screen.findByText("Link não aceito.");
    const campo = screen.getByLabelText("Link do vídeo (opcional)");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe(msg.id);
  });
});
