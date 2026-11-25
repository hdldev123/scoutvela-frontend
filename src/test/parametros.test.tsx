import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    PUT: (...a: unknown[]) => PUT(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { TelaParametros } from "@/components/scout/TelaParametros";
import type { Parametros } from "@/lib/api/parametros";

const pilar = (id: string, nome: string, peso: number) => ({
  id,
  nome,
  nomeCurto: nome,
  peso,
  sensivel: false,
  evidenciaPadrao: "",
  indicadores: [],
});

const params: Parametros = {
  pilares: [pilar("perf", "Performance", 60), pilar("cf", "Class Fit", 40)],
  faixas: [
    { id: "f1", nome: "Prioridade de programa", nomeCurto: "Prioridade", scoreMin: 85 },
    { id: "f2", nome: "Alto potencial", nomeCurto: "Alto", scoreMin: 75 },
    { id: "f3", nome: "Em desenvolvimento", nomeCurto: "Desenv.", scoreMin: 65 },
    { id: "f4", nome: "No radar", nomeCurto: "Radar", scoreMin: 0 },
  ],
  classes: [
    {
      id: "c1",
      nome: "ILCA 7",
      evento: "ILCA 7",
      posicao: "ind",
      pesoMinKg: 82.8,
      pesoMedioKg: 85,
      pesoMaxKg: 87.2,
      alturaMinCm: 182,
      alturaMediaCm: 187,
      alturaMaxCm: 192,
      ativa: true,
      fonte: null,
    },
    {
      id: "c2",
      nome: "470",
      evento: "470",
      posicao: "helm",
      pesoMinKg: 70,
      pesoMedioKg: 75,
      pesoMaxKg: 80,
      alturaMinCm: null,
      alturaMediaCm: null,
      alturaMaxCm: null,
      ativa: true,
      fonte: null,
    },
  ],
  rubricas: [
    { pilarId: null, nota: 0, descricao: "Sem evidência" },
    { pilarId: "perf", nota: 5, descricao: "Pódio mundial" },
  ],
  regras: [
    {
      codigo: "P2",
      descricao: "Nota do pilar = média",
      valor: { modo: "media", ativo: true },
      atualizadoEm: "2026-11-01T12:00:00.000Z",
    },
    {
      codigo: "G3",
      descricao: "Gate 3",
      valor: { apto_min_eventos: 3, condicional_min_eventos: 1, janela_meses: 24 },
      atualizadoEm: "2026-11-02T12:00:00.000Z",
    },
    {
      codigo: "G4",
      descricao: "Gate 4",
      valor: {
        A: { status: "apto", motivo: "Plano para 36 meses" },
        B: { status: "apto", motivo: "Plano para 24 meses" },
        C: { status: "condicional", motivo: "Depende da CBVela" },
        D: { status: "alerta", motivo: "Sem estrutura" },
      },
      atualizadoEm: "2026-11-03T12:00:00.000Z",
    },
    {
      codigo: "META_EVOLUCAO",
      descricao: "Meta de evolução da turma",
      valor: { percentual: 10 },
      atualizadoEm: "2026-11-04T12:00:00.000Z",
    },
    {
      codigo: "MIN_GRUPO_AGREGADO",
      descricao: "Menor grupo em agregado",
      valor: { minimo: 3 },
      atualizadoEm: "2026-11-04T12:00:00.000Z",
    },
    {
      codigo: "TENDENCIA",
      descricao: "Limiar da tendência",
      valor: { limiar: 2 },
      atualizadoEm: "2026-11-04T12:00:00.000Z",
    },
  ],
  componentesCusto: [{ id: "treinador", nome: "Treinador" }],
};

function renderizar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaParametros />
    </QueryClientProvider>,
  );
}

const irPara = (aba: string) => fireEvent.click(screen.getByRole("tab", { name: aba }));

function montar() {
  GET.mockImplementation(async (caminho: string) => ({
    data: caminho === "/termos" ? [] : params,
    response: { status: 200 },
  }));
  renderizar();
}

describe("TelaParametros", () => {
  beforeEach(() => {
    GET.mockReset();
    PUT.mockReset();
    window.location.hash = "";
    toastFn.success.mockReset();
  });

  it("mostra aviso, itens somente leitura e soma dos pesos", async () => {
    montar();
    expect(await screen.findByRole("heading", { name: "Parâmetros" })).toBeInTheDocument();
    expect(screen.getByText(/ficam na trilha de auditoria/)).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Pódio mundial")).toBeInTheDocument();
    expect(
      screen.getByText(/só Experiência de alto rendimento tem rubrica própria/),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizada em 02/11/2026")).toBeInTheDocument();
    expect(screen.getByText(/modo: media; ativo: Sim/)).toBeInTheDocument();
    irPara("Componentes de custo");
    expect(screen.getByText("Treinador")).toBeInTheDocument();
    irPara("Pesos e faixas");
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeEnabled();
  });

  it("desabilita salvar pesos quando a soma não é 100 e envia quando é", async () => {
    PUT.mockResolvedValue({ data: params, response: { status: 200 } });
    montar();
    fireEvent.change(await screen.findByLabelText("Performance"), { target: { value: "50" } });
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Class Fit" }), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar pesos" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", { body: { pesos: { perf: 50, cf: 50 } } }),
    );
    await waitFor(() =>
      expect(toastFn.success).toHaveBeenCalledWith(
        "Parâmetros salvos. O ranking já usa os novos valores.",
      ),
    );
  });

  it("evidência por indicador: edita e envia só os indicadores alterados", async () => {
    const comIndicadores: Parametros = {
      ...params,
      pilares: params.pilares.map((p) =>
        p.id === "perf"
          ? {
              ...p,
              indicadores: [
                {
                  id: "perf_nacional",
                  nome: "Pódio nacional",
                  tipo: "T" as const,
                  calculado: false,
                  evidencia: "obrigatoria" as const,
                  exigeAnexo: false,
                  autoavaliacao: true,
                  orientacao: null,
                },
                {
                  id: "tec_1",
                  nome: "Leitura de vento",
                  tipo: "T" as const,
                  calculado: false,
                  evidencia: "opcional" as const,
                  exigeAnexo: false,
                  autoavaliacao: true,
                  orientacao: null,
                },
              ],
            }
          : p.id === "cf"
            ? {
                ...p,
                indicadores: [
                  {
                    id: "cf_peso_kg",
                    nome: "Peso",
                    tipo: "T" as const,
                    calculado: true,
                    evidencia: "obrigatoria" as const,
                    exigeAnexo: true,
                    autoavaliacao: false,
                    orientacao: null,
                  },
                ],
              }
            : p,
      ),
    };
    GET.mockImplementation(async (caminho: string) => ({
      data: caminho === "/termos" ? [] : comIndicadores,
      response: { status: 200 },
    }));
    PUT.mockResolvedValue({ data: comIndicadores, response: { status: 200 } });
    renderizar();
    await screen.findByRole("tab", { name: "Evidência" });
    irPara("Evidência");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
    expect(screen.getByLabelText("Evidência de Pódio nacional")).toHaveValue("obrigatoria");
    expect(screen.getByLabelText("Evidência de Leitura de vento")).toHaveValue("opcional");
    // O peso só mostra que exige anexo, sem seletor.
    expect(screen.getByText(/Exige anexo: a nota depende de arquivo/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Evidência de Peso")).toBeNull();
    fireEvent.change(screen.getByLabelText("Evidência de Leitura de vento"), {
      target: { value: "obrigatoria" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { indicadores: [{ id: "tec_1", evidencia: "obrigatoria" }] },
      }),
    );
  });

  describe("autoavaliação por indicador (D9)", () => {
    const base = (indicadores: Record<string, unknown>[]): Parametros => ({
      ...params,
      pilares: params.pilares.map((p) =>
        p.id === "perf" ? ({ ...p, indicadores } as unknown as typeof p) : p,
      ),
    });
    const T = {
      tipo: "T" as const,
      calculado: false,
      exigeAnexo: false,
      orientacao: null,
    };

    function abrir(dados: Parametros) {
      GET.mockImplementation(async (caminho: string) => ({
        data: caminho === "/termos" ? [] : dados,
        response: { status: 200 },
      }));
      PUT.mockResolvedValue({ data: dados, response: { status: 200 } });
      renderizar();
    }

    it("liga e desliga, e desabilita em indicadores A e calculados", async () => {
      abrir(
        base([
          {
            ...T,
            id: "tec_1",
            nome: "Leitura de vento",
            evidencia: "obrigatoria",
            autoavaliacao: true,
          },
          {
            ...T,
            id: "amb_apoio",
            nome: "Apoio do clube",
            tipo: "A",
            evidencia: "obrigatoria",
            autoavaliacao: false,
          },
          {
            ...T,
            id: "cf_peso_kg",
            nome: "Peso",
            calculado: true,
            exigeAnexo: true,
            evidencia: "obrigatoria",
            autoavaliacao: false,
          },
        ]),
      );
      await screen.findByRole("tab", { name: "Evidência" });
      irPara("Evidência");
      const vento = screen.getByRole("switch", { name: "Autoavaliação de Leitura de vento" });
      expect(vento).toHaveAttribute("aria-checked", "true");
      for (const nome of ["Apoio do clube", "Peso"]) {
        const chave = screen.getByRole("switch", { name: `Autoavaliação de ${nome}` });
        expect(chave).toHaveAttribute("aria-disabled", "true");
        fireEvent.click(chave);
        expect(chave).toHaveAttribute("aria-checked", "false");
      }
      expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
      fireEvent.click(vento);
      expect(vento).toHaveAttribute("aria-checked", "false");
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      await waitFor(() =>
        expect(PUT).toHaveBeenCalledWith("/parametros", {
          body: { indicadores: [{ id: "tec_1", autoavaliacao: false }] },
        }),
      );
    });

    it("envia evidência e autoavaliação do mesmo indicador no mesmo item", async () => {
      abrir(
        base([
          {
            ...T,
            id: "tec_1",
            nome: "Leitura de vento",
            evidencia: "opcional",
            autoavaliacao: true,
          },
        ]),
      );
      await screen.findByRole("tab", { name: "Evidência" });
      irPara("Evidência");
      fireEvent.change(screen.getByLabelText("Evidência de Leitura de vento"), {
        target: { value: "obrigatoria" },
      });
      fireEvent.click(screen.getByRole("switch", { name: "Autoavaliação de Leitura de vento" }));
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      await waitFor(() =>
        expect(PUT).toHaveBeenCalledWith("/parametros", {
          body: {
            indicadores: [{ id: "tec_1", evidencia: "obrigatoria", autoavaliacao: false }],
          },
        }),
      );
    });

    it("mostra o 400 de autoavaliacao junto do interruptor", async () => {
      abrir(
        base([
          {
            ...T,
            id: "tec_1",
            nome: "Leitura de vento",
            evidencia: "opcional",
            autoavaliacao: true,
          },
        ]),
      );
      PUT.mockResolvedValue({
        error: {
          erro: "requisicao_invalida",
          mensagem: "Dados inválidos.",
          campos: [
            { campo: "indicadores.0.autoavaliacao", mensagem: "Indicador sem autoavaliação." },
          ],
        },
        response: { status: 400 },
      });
      await screen.findByRole("tab", { name: "Evidência" });
      irPara("Evidência");
      fireEvent.click(screen.getByRole("switch", { name: "Autoavaliação de Leitura de vento" }));
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      expect(await screen.findByText("Indicador sem autoavaliação.")).toBeInTheDocument();
    });
  });

  it("aceita vírgula e envia só a classe alterada", async () => {
    PUT.mockResolvedValue({ data: params, response: { status: 200 } });
    montar();
    const max = await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
    irPara("Class Fit");
    fireEvent.change(max, { target: { value: "88,4" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas da classe" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { classes: [{ id: "c1", pesoMinKg: 82.8, pesoMedioKg: 85, pesoMaxKg: 88.4 }] },
      }),
    );
  });

  describe("altura de referência", () => {
    it("mostra os cabeçalhos agrupados e os valores atuais", async () => {
      montar();
      await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
      irPara("Class Fit");
      expect(screen.getByRole("columnheader", { name: "Peso (kg)" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Altura (cm)" })).toBeInTheDocument();
      expect(screen.getByLabelText("Altura mínima de ILCA 7, Individual (cm)")).toHaveValue("182");
      expect(screen.getByLabelText("Altura média de ILCA 7, Individual (cm)")).toHaveValue("187");
      expect(screen.getByLabelText("Altura máxima de ILCA 7, Individual (cm)")).toHaveValue("192");
      expect(screen.getByLabelText("Altura mínima de 470, Timoneiro (cm)")).toHaveValue("");
      expect(
        screen.getByText("A altura é informativa (não entra no score nem nos gates)."),
      ).toBeInTheDocument();
    });

    it("envia os três campos de altura juntos, só da classe alterada", async () => {
      PUT.mockResolvedValue({ data: params, response: { status: 200 } });
      montar();
      await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
      irPara("Class Fit");
      fireEvent.change(screen.getByLabelText("Altura mínima de 470, Timoneiro (cm)"), {
        target: { value: "170" },
      });
      fireEvent.change(screen.getByLabelText("Altura média de 470, Timoneiro (cm)"), {
        target: { value: "175,5" },
      });
      fireEvent.change(screen.getByLabelText("Altura máxima de 470, Timoneiro (cm)"), {
        target: { value: "180" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Salvar faixas da classe" }));
      await waitFor(() =>
        expect(PUT).toHaveBeenCalledWith("/parametros", {
          body: {
            classes: [{ id: "c2", alturaMinCm: 170, alturaMediaCm: 175.5, alturaMaxCm: 180 }],
          },
        }),
      );
    });

    it("vazio nos três envia null para limpar", async () => {
      PUT.mockResolvedValue({ data: params, response: { status: 200 } });
      montar();
      await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
      irPara("Class Fit");
      for (const r of ["mínima", "média", "máxima"]) {
        fireEvent.change(screen.getByLabelText(`Altura ${r} de ILCA 7, Individual (cm)`), {
          target: { value: "" },
        });
      }
      fireEvent.click(screen.getByRole("button", { name: "Salvar faixas da classe" }));
      await waitFor(() =>
        expect(PUT).toHaveBeenCalledWith("/parametros", {
          body: {
            classes: [{ id: "c1", alturaMinCm: null, alturaMediaCm: null, alturaMaxCm: null }],
          },
        }),
      );
    });

    it("exige os três ou nenhum e bloqueia o envio", async () => {
      montar();
      await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
      irPara("Class Fit");
      fireEvent.change(screen.getByLabelText("Altura mínima de 470, Timoneiro (cm)"), {
        target: { value: "170" },
      });
      expect(
        screen.getByText("Informe os três valores de altura ou deixe os três vazios."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar faixas da classe" })).toBeDisabled();
      expect(PUT).not.toHaveBeenCalled();
    });

    it("valida o intervalo de 120 a 230 e a ordem mín. <= média <= máx.", async () => {
      montar();
      await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
      irPara("Class Fit");
      const min = screen.getByLabelText("Altura mínima de ILCA 7, Individual (cm)");
      const med = screen.getByLabelText("Altura média de ILCA 7, Individual (cm)");
      fireEvent.change(min, { target: { value: "100" } });
      expect(screen.getByText("A altura deve ficar entre 120 e 230 cm.")).toBeInTheDocument();
      fireEvent.change(min, { target: { value: "190" } });
      expect(screen.getByText("A altura mínima não pode passar da média.")).toBeInTheDocument();
      fireEvent.change(min, { target: { value: "182" } });
      fireEvent.change(med, { target: { value: "195" } });
      expect(screen.getByText("A altura média não pode passar da máxima.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar faixas da classe" })).toBeDisabled();
    });
  });

  it("avisa quando mín. > média ou média > máx. e bloqueia o envio", async () => {
    montar();
    const min = await screen.findByLabelText("Mínimo de 470, Timoneiro (kg)");
    irPara("Class Fit");
    fireEvent.change(min, { target: { value: "78" } });
    expect(screen.getByText("O mínimo não pode passar da média.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar faixas da classe" })).toBeDisabled();
    fireEvent.change(min, { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText("Média de 470, Timoneiro (kg)"), {
      target: { value: "81" },
    });
    expect(screen.getByText("A média não pode passar do máximo.")).toBeInTheDocument();
  });

  it("exibe o erro 400 da API", async () => {
    PUT.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "Pesos inválidos no servidor." },
      response: { status: 400 },
    });
    montar();
    await screen.findByLabelText("Performance");
    fireEvent.click(screen.getByRole("button", { name: "Salvar pesos" }));
    expect(await screen.findByText("Pesos inválidos no servidor.")).toBeInTheDocument();
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  const MSG = "Parâmetros salvos. O ranking já usa os novos valores.";
  const ok = () => PUT.mockResolvedValue({ data: params, response: { status: 200 } });

  it("valida as faixas de score e envia as 4 faixas", async () => {
    ok();
    montar();
    const alto = await screen.findByLabelText("Score mínimo de Alto potencial");
    fireEvent.change(alto, { target: { value: "90" } });
    expect(screen.getByText(/estritamente decrescente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar faixas" })).toBeDisabled();
    fireEvent.change(alto, { target: { value: "78" } });
    fireEvent.change(screen.getByLabelText("Score mínimo de No radar"), { target: { value: "5" } });
    expect(screen.getByText("A última faixa precisa começar em 0.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Score mínimo de No radar"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: {
          faixas: [
            { id: "f1", scoreMin: 85 },
            { id: "f2", scoreMin: 78 },
            { id: "f3", scoreMin: 65 },
            { id: "f4", scoreMin: 0 },
          ],
        },
      }),
    );
    await waitFor(() => expect(toastFn.success).toHaveBeenCalledWith(MSG));
  });

  it("envia só a rubrica editada", async () => {
    ok();
    montar();
    const campo = await screen.findByLabelText("Descrição da nota 0, escala geral");
    irPara("Rubricas");
    fireEvent.change(campo, { target: { value: "Nenhuma evidência" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rubricas" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { rubricas: [{ pilarId: null, nota: 0, descricao: "Nenhuma evidência" }] },
      }),
    );
  });

  it("remove a rubrica de um pilar depois da confirmação; a escala geral não tem o botão", async () => {
    ok();
    montar();
    await screen.findByDisplayValue("Pódio mundial");
    irPara("Rubricas");
    const botoes = screen.getAllByRole("button", { name: /Remover rubrica deste pilar/ });
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toHaveAccessibleName("Remover rubrica deste pilar (Performance)");
    fireEvent.click(botoes[0]!);
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(/As notas desse pilar passam a usar a escala geral/),
    ).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Remover rubrica" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", { body: { rubricasRemover: ["perf"] } }),
    );
    await waitFor(() =>
      expect(toastFn.success).toHaveBeenCalledWith("Rubrica de Performance removida."),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("adiciona rubrica de um pilar com as 6 notas", async () => {
    ok();
    montar();
    await screen.findByDisplayValue("Pódio mundial");
    irPara("Rubricas");
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar rubrica para um pilar" }));
    fireEvent.change(screen.getByLabelText("Pilar"), { target: { value: "cf" } });
    expect(screen.getByRole("button", { name: "Salvar rubricas" })).toBeDisabled();
    for (let n = 0; n <= 5; n++)
      fireEvent.change(screen.getByLabelText(`Nova rubrica, descrição da nota ${n}`), {
        target: { value: `Nível ${n} de Class Fit` },
      });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rubricas" }));
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
    const rubricas = PUT.mock.calls[0]![1].body.rubricas;
    expect(rubricas).toHaveLength(6);
    expect(rubricas).toContainEqual({ pilarId: "cf", nota: 5, descricao: "Nível 5 de Class Fit" });
    expect(rubricas.every((r: { pilarId: string }) => r.pilarId === "cf")).toBe(true);
  });

  it("salva a regra G3 com o corpo certo e bloqueia valor inválido", async () => {
    ok();
    montar();
    const apto = await screen.findByLabelText("Mínimo de eventos para apto");
    irPara("Regras provisórias");
    fireEvent.change(apto, { target: { value: "0" } });
    expect(
      screen.getByText("O mínimo de apto não pode ser menor que o de condicional."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar G3 · Alto rendimento" })).toBeDisabled();
    fireEvent.change(apto, { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Janela (meses)"), { target: { value: "36" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar G3 · Alto rendimento" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: {
          regras: { G3: { apto_min_eventos: 4, condicional_min_eventos: 1, janela_meses: 36 } },
        },
      }),
    );
  });

  it("salva a regra G4 por perfil", async () => {
    ok();
    montar();
    await screen.findByLabelText("Perfil C · status");
    irPara("Regras provisórias");
    const motivo = screen.getByLabelText("Perfil C · motivo");
    expect(motivo.tagName).toBe("TEXTAREA");
    expect(motivo).toHaveAttribute("rows", "2");
    expect(motivo).toHaveAttribute("maxlength", "200");
    fireEvent.change(screen.getByLabelText("Perfil C · status"), {
      target: { value: "alerta" },
    });
    fireEvent.change(screen.getByLabelText("Perfil C · motivo"), {
      target: { value: "Alta dependência." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar G4 · Campanha" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: {
          regras: {
            G4: {
              A: { status: "apto", motivo: "Plano para 36 meses" },
              B: { status: "apto", motivo: "Plano para 24 meses" },
              C: { status: "alerta", motivo: "Alta dependência." },
              D: { status: "alerta", motivo: "Sem estrutura" },
            },
          },
        },
      }),
    );
  });

  it("regras da evolução (D12): valida cada limite e salva META_EVOLUCAO, MIN_GRUPO_AGREGADO e TENDENCIA", async () => {
    ok();
    montar();
    await screen.findByLabelText("Alta esperada (%)");
    irPara("Regras provisórias");

    const meta = screen.getByLabelText("Alta esperada (%)");
    expect(meta).toHaveValue("10");
    fireEvent.change(meta, { target: { value: "1001" } });
    expect(
      screen.getByText("Alta esperada (%): informe um número entre 0 e 1000."),
    ).toBeInTheDocument();
    const salvarMeta = screen.getByRole("button", { name: "Salvar Meta de evolução da turma" });
    expect(salvarMeta).toBeDisabled();
    fireEvent.change(meta, { target: { value: "12,5" } });
    fireEvent.click(salvarMeta);
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { regras: { META_EVOLUCAO: { percentual: 12.5 } } },
      }),
    );

    const minimo = screen.getByLabelText("Mínimo de atletas");
    fireEvent.change(minimo, { target: { value: "0" } });
    expect(
      screen.getByText("Mínimo de atletas: informe um inteiro entre 1 e 1000."),
    ).toBeInTheDocument();
    fireEvent.change(minimo, { target: { value: "2,5" } });
    expect(screen.getByRole("button", { name: "Salvar Menor grupo em agregado" })).toBeDisabled();
    fireEvent.change(minimo, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar Menor grupo em agregado" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { regras: { MIN_GRUPO_AGREGADO: { minimo: 5 } } },
      }),
    );

    const limiar = screen.getByLabelText("Limiar (pontos de score)");
    fireEvent.change(limiar, { target: { value: "0" } });
    expect(
      screen.getByText("Limiar (pontos de score): informe um número maior que 0 e até 100."),
    ).toBeInTheDocument();
    fireEvent.change(limiar, { target: { value: "101" } });
    expect(screen.getByRole("button", { name: "Salvar Limiar da tendência" })).toBeDisabled();
    fireEvent.change(limiar, { target: { value: "1,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar Limiar da tendência" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { regras: { TENDENCIA: { limiar: 1.5 } } },
      }),
    );
  });

  it("desativa uma classe e mostra o erro 400 da API", async () => {
    PUT.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "A classe 470 tem atleta ativo." },
      response: { status: 400 },
    });
    montar();
    await screen.findByDisplayValue("Pódio mundial");
    irPara("Class Fit");
    fireEvent.click(await screen.findByRole("switch", { name: "Ativa: 470, Timoneiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas da classe" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { classes: [{ id: "c2", ativa: false }] },
      }),
    );
    expect(await screen.findByText("A classe 470 tem atleta ativo.")).toBeInTheDocument();
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it("divide a página em abas, guarda a aba no hash e mantém as edições ao trocar", async () => {
    montar();
    const abas = await screen.findAllByRole("tab");
    expect(abas.map((a) => a.textContent)).toEqual([
      "Pesos e faixas",
      "Class Fit",
      "Rubricas",
      "Evidência",
      "Regras provisórias",
      "Termo de consentimento",
      "Componentes de custo",
    ]);
    expect(screen.getByRole("tab", { name: "Pesos e faixas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar faixas da classe" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Performance"), { target: { value: "55" } });
    irPara("Class Fit");
    expect(window.location.hash).toBe("#classes");
    expect(screen.getByRole("button", { name: "Salvar faixas da classe" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar pesos" })).toBeNull();
    irPara("Componentes de custo");
    expect(screen.getByText("Treinador")).toBeVisible();
    irPara("Pesos e faixas");
    expect(screen.getByLabelText("Performance")).toHaveValue(55);
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("95").closest(".pill")?.className).toContain("st-alerta");
  });

  it("abre a aba indicada no hash da URL", async () => {
    window.location.hash = "#regras";
    montar();
    expect(await screen.findByRole("tab", { name: "Regras provisórias" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar G3 · Alto rendimento" })).toBeVisible(),
    );
  });

  it("regras: botão curto, código em selo e somente leitura com valor em selo", async () => {
    montar();
    await screen.findByLabelText("Janela (meses)");
    irPara("Regras provisórias");
    const botao = screen.getByRole("button", { name: "Salvar G3 · Alto rendimento" });
    expect(botao).toHaveTextContent(/^Salvar$/);
    expect(screen.getByText("G3", { selector: "code" })).toBeVisible();
  });

  it("mostra a mensagem da API quando a leitura falha", async () => {
    GET.mockResolvedValue({
      error: { erro: "sem_acesso", mensagem: "Sem permissão." },
      response: { status: 403 },
    });
    renderizar();
    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
  });
});

describe("TelaParametros: ressincronização e erros do servidor", () => {
  beforeEach(() => {
    GET.mockReset();
    PUT.mockReset();
    window.location.hash = "";
    toastFn.success.mockReset();
  });

  it("adicionar rubrica de um pilar e salvar mostra os valores salvos, sem erro", async () => {
    let atual: Parametros = {
      ...params,
      rubricas: [{ pilarId: null, nota: 0, descricao: "Sem evidência" }],
    };
    GET.mockImplementation(async (c: string) => ({
      data: c === "/termos" ? [] : atual,
      response: { status: 200 },
    }));
    PUT.mockImplementation(
      async (_c: string, { body }: { body: { rubricas: Parametros["rubricas"] } }) => {
        atual = { ...atual, rubricas: [...atual.rubricas, ...body.rubricas] };
        return { data: atual, response: { status: 200 } };
      },
    );
    renderizar();
    fireEvent.click(await screen.findByRole("tab", { name: "Rubricas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar rubrica para um pilar" }));
    fireEvent.change(screen.getByLabelText("Pilar"), { target: { value: "cf" } });
    for (let n = 0; n <= 5; n++) {
      fireEvent.change(screen.getByLabelText(`Nova rubrica, descrição da nota ${n}`), {
        target: { value: `Nível ${n} de Class Fit` },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Salvar rubricas" }));
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
    const campo = (await screen.findByLabelText(
      "Descrição da nota 5, class fit",
    )) as HTMLTextAreaElement;
    expect(campo.value).toBe("Nível 5 de Class Fit");
    expect(screen.queryByText(/Cada descrição editada precisa/)).toBeNull();
    expect(screen.queryByRole("group", { name: "Nova rubrica de pilar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar rubricas" })).toBeDisabled();
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
  });

  it("quando outro gestor muda as faixas, o formulário mostra os valores novos", async () => {
    GET.mockImplementation(async () => ({ data: params, response: { status: 200 } }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TelaParametros />
      </QueryClientProvider>,
    );
    const alto = (await screen.findByLabelText(
      "Score mínimo de Alto potencial",
    )) as HTMLInputElement;
    expect(alto.value).toBe("75");
    await act(async () => {
      qc.setQueryData(["parametros"], {
        ...params,
        faixas: params.faixas.map((f) => (f.id === "f2" ? { ...f, scoreMin: 78 } : f)),
      });
    });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Score mínimo de Alto potencial") as HTMLInputElement).value,
      ).toBe("78"),
    );
  });

  it("mostra sob o campo o erro por campo do 400 (faixas.1.scoreMin)", async () => {
    PUT.mockResolvedValue({
      error: {
        erro: "validacao",
        mensagem: "Dados inválidos.",
        campos: [{ campo: "faixas.1.scoreMin", mensagem: "O valor máximo é 84." }],
      },
      response: { status: 400 },
    });
    montar();
    const alto = await screen.findByLabelText("Score mínimo de Alto potencial");
    fireEvent.change(alto, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas" }));
    const msg = await screen.findByText("O valor máximo é 84.");
    expect(alto).toHaveAttribute("aria-invalid", "true");
    expect(alto).toHaveAttribute("aria-describedby", msg.id);
  });

  it("mostra sob o peso e sob a classe os erros por campo do 400", async () => {
    PUT.mockResolvedValue({
      error: {
        erro: "validacao",
        mensagem: "Dados inválidos.",
        campos: [
          { campo: "pesos.perf", mensagem: "O valor máximo é 40." },
          { campo: "classes.0.pesoMaxKg", mensagem: "O valor máximo é 200." },
        ],
      },
      response: { status: 400 },
    });
    montar();
    const perf = await screen.findByLabelText("Performance");
    fireEvent.change(perf, { target: { value: "50" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Class Fit" }), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar pesos" }));
    const msg = await screen.findByText("O valor máximo é 40.");
    expect(perf).toHaveAttribute("aria-describedby", msg.id);
    fireEvent.click(await screen.findByRole("tab", { name: "Class Fit" }));
    const max = screen.getByLabelText("Máximo de ILCA 7, Individual (kg)");
    fireEvent.change(max, { target: { value: "88,4" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas da classe" }));
    const msgClasse = await screen.findByText("O valor máximo é 200.");
    expect(max).toHaveAttribute("aria-invalid", "true");
    expect(max).toHaveAttribute("aria-describedby", msgClasse.id);
  });
});

describe("TelaParametros: nota dos resultados e orientação (D10)", () => {
  const REGRA = {
    edicoes_max: 4,
    sem_resultado: 0,
    niveis: {
      mundial: [
        { ate: 3, nota: 5 },
        { ate: 10, nota: 4 },
        { ate: 25, nota: 3 },
        { ate: null, nota: 2 },
      ],
      continental: [
        { ate: 3, nota: 5 },
        { ate: null, nota: 2 },
      ],
      nacional: [
        { ate: 1, nota: 5 },
        { ate: 2, nota: 4 },
        { ate: 3, nota: 3 },
        { ate: null, nota: 0 },
      ],
    },
  };
  const comRegra: Parametros = {
    ...params,
    regras: [
      ...params.regras,
      {
        codigo: "PERF_RESULTADOS",
        descricao: "Nota dos resultados",
        valor: REGRA,
        atualizadoEm: "2026-11-24T12:00:00.000Z",
      },
    ],
  };
  const NOME_SALVAR = "Salvar PERF_RESULTADOS · Nota dos resultados";

  function abrir(dados: Parametros) {
    GET.mockImplementation(async (caminho: string) => ({
      data: caminho === "/termos" ? [] : dados,
      response: { status: 200 },
    }));
    PUT.mockResolvedValue({ data: dados, response: { status: 200 } });
    renderizar();
  }

  beforeEach(() => {
    GET.mockReset();
    PUT.mockReset();
    window.location.hash = "";
    toastFn.success.mockReset();
  });

  it("mostra o editor com os valores atuais e o aviso de regra provisória (P12)", async () => {
    abrir(comRegra);
    await screen.findByRole("tab", { name: "Regras provisórias" });
    irPara("Regras provisórias");
    expect(await screen.findByLabelText("Edições máximas")).toHaveValue("4");
    expect(screen.getByLabelText("Nota sem resultado validado")).toHaveValue("0");
    expect(screen.getByText(/Valores provisórios \(P12\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mundial, faixa 2, até a colocação")).toHaveValue("10");
    expect(screen.getByLabelText("Mundial, faixa 2, nota")).toHaveValue("4");
    // A última faixa vale para as demais colocações e não tem limite digitável.
    expect(screen.queryByLabelText("Mundial, faixa 4, até a colocação")).toBeNull();
    expect(screen.getAllByText("Demais colocações")).toHaveLength(3);
    expect(screen.getByRole("button", { name: NOME_SALVAR })).toBeDisabled();
  });

  it("envia a regra em snake_case, com a última faixa sem limite", async () => {
    abrir(comRegra);
    await screen.findByRole("tab", { name: "Regras provisórias" });
    irPara("Regras provisórias");
    fireEvent.change(await screen.findByLabelText("Edições máximas"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Nacional, faixa 3, nota"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: NOME_SALVAR }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: {
          regras: {
            PERF_RESULTADOS: {
              ...REGRA,
              edicoes_max: 5,
              niveis: {
                ...REGRA.niveis,
                nacional: [
                  { ate: 1, nota: 5 },
                  { ate: 2, nota: 4 },
                  { ate: 3, nota: 2 },
                  { ate: null, nota: 0 },
                ],
              },
            },
          },
        },
      }),
    );
  });

  it("adiciona e remove faixa, e valida como o back", async () => {
    abrir(comRegra);
    await screen.findByRole("tab", { name: "Regras provisórias" });
    irPara("Regras provisórias");
    const salvar = await screen.findByRole("button", { name: NOME_SALVAR });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar faixa em Continental" }));
    // A faixa nova nasce sem limite: não dá para salvar.
    expect(screen.getByLabelText("Continental, faixa 2, até a colocação")).toHaveValue("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Continental, faixa 2: informe a colocação limite/,
    );
    expect(salvar).toBeDisabled();
    const ate = screen.getByLabelText("Continental, faixa 2, até a colocação");
    fireEvent.change(ate, { target: { value: "3" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/maior que a da faixa anterior/);
    fireEvent.change(ate, { target: { value: "10" } });
    // A nova faixa copia a nota da última (2); a última faixa (nota 2) não pode ficar acima da anterior (1).
    fireEvent.change(screen.getByLabelText("Continental, faixa 2, nota"), {
      target: { value: "1" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/a nota não pode ser maior/);
    fireEvent.change(screen.getByLabelText("Continental, faixa 2, nota"), {
      target: { value: "3" },
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(salvar).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Remover Continental, faixa 2" }));
    // Sobram duas faixas: a segunda volta a ser a última, sem limite digitável.
    expect(screen.queryByLabelText("Continental, faixa 2, até a colocação")).toBeNull();
    expect(screen.queryByLabelText("Continental, faixa 3, nota")).toBeNull();
    fireEvent.change(screen.getByLabelText("Edições máximas"), { target: { value: "21" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Edições máximas: informe um inteiro de 1 a 20/,
    );
    expect(salvar).toBeDisabled();
    expect(PUT).not.toHaveBeenCalled();
  });

  it("orientação por indicador: edita, envia e apaga com null", async () => {
    const dados: Parametros = {
      ...comRegra,
      pilares: params.pilares.map((p) =>
        p.id === "perf"
          ? {
              ...p,
              indicadores: [
                {
                  id: "perf_mundial",
                  nome: "Resultados mundiais",
                  tipo: "T" as const,
                  calculado: true,
                  evidencia: "obrigatoria" as const,
                  exigeAnexo: false,
                  autoavaliacao: false,
                  orientacao: "Informe cada edição com a súmula.",
                },
                {
                  id: "tec_1",
                  nome: "Leitura de vento",
                  tipo: "T" as const,
                  calculado: false,
                  evidencia: "opcional" as const,
                  exigeAnexo: false,
                  autoavaliacao: true,
                  orientacao: null,
                },
              ],
            }
          : p,
      ),
    };
    abrir(dados);
    await screen.findByRole("tab", { name: "Evidência" });
    irPara("Evidência");
    const calc = screen.getByLabelText("Orientação de Resultados mundiais");
    expect(calc).toHaveValue("Informe cada edição com a súmula.");
    expect(calc).toHaveAttribute("maxlength", "1000");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Orientação de Leitura de vento"), {
      target: { value: "  Descreva o teste de campo.  " },
    });
    fireEvent.change(calc, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar 2 indicadores" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: {
          indicadores: [
            { id: "perf_mundial", orientacao: null },
            { id: "tec_1", orientacao: "Descreva o teste de campo." },
          ],
        },
      }),
    );
  });
});
