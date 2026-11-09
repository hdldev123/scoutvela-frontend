import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  GET.mockResolvedValue({ data: params, response: { status: 200 } });
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
    expect(await screen.findByText("Pódio mundial")).toBeInTheDocument();
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

  it("mostra a mensagem da API quando a leitura falha", async () => {
    GET.mockResolvedValue({
      error: { erro: "sem_acesso", mensagem: "Sem permissão." },
      response: { status: 403 },
    });
    renderizar();
    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
  });
});
