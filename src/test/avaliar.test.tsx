import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
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
    await waitFor(() => expect(evidencia().value).toBe(""));
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
    expect(await screen.findByText(/regata\.pdf · segue junto da nota/)).toBeTruthy();

    nota("Leitura de vento", 3);
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
});
