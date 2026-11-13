import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
      ativa: true,
    },
    {
      id: "c2",
      nome: "470",
      evento: "470",
      posicao: "helm",
      pesoMinKg: 70,
      pesoMedioKg: 75,
      pesoMaxKg: 80,
      ativa: true,
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
    expect(screen.getByText("Treinador")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeEnabled();
  });

  it("desabilita salvar pesos quando a soma não é 100 e envia quando é", async () => {
    PUT.mockResolvedValue({ data: params, response: { status: 200 } });
    montar();
    fireEvent.change(await screen.findByLabelText("Performance"), { target: { value: "50" } });
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Class Fit"), { target: { value: "50" } });
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

  it("aceita vírgula e envia só a classe alterada", async () => {
    PUT.mockResolvedValue({ data: params, response: { status: 200 } });
    montar();
    const max = await screen.findByLabelText("Máximo de ILCA 7, Individual (kg)");
    fireEvent.change(max, { target: { value: "88,4" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas de peso" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { classes: [{ id: "c1", pesoMinKg: 82.8, pesoMedioKg: 85, pesoMaxKg: 88.4 }] },
      }),
    );
  });

  it("avisa quando mín. > média ou média > máx. e bloqueia o envio", async () => {
    montar();
    const min = await screen.findByLabelText("Mínimo de 470, Timoneiro (kg)");
    fireEvent.change(min, { target: { value: "78" } });
    expect(screen.getByText("O mínimo não pode passar da média.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar faixas de peso" })).toBeDisabled();
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
    fireEvent.change(apto, { target: { value: "0" } });
    expect(
      screen.getByText("O mínimo de apto não pode ser menor que o de condicional."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar G3" })).toBeDisabled();
    fireEvent.change(apto, { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Janela (meses)"), { target: { value: "36" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar G3" }));
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
    fireEvent.change(await screen.findByLabelText("Perfil C · status"), {
      target: { value: "alerta" },
    });
    fireEvent.change(screen.getByLabelText("Perfil C · motivo"), {
      target: { value: "Alta dependência." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar G4" }));
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

  it("desativa uma classe e mostra o erro 400 da API", async () => {
    PUT.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "A classe 470 tem atleta ativo." },
      response: { status: 400 },
    });
    montar();
    fireEvent.click(await screen.findByRole("switch", { name: "Ativa: 470, Timoneiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar faixas de peso" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/parametros", {
        body: { classes: [{ id: "c2", ativa: false }] },
      }),
    );
    expect(await screen.findByText("A classe 470 tem atleta ativo.")).toBeInTheDocument();
    expect(toastFn.success).not.toHaveBeenCalled();
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
