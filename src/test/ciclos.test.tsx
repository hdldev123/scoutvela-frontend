import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    PUT: (...args: unknown[]) => PUT(...args),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { TelaCiclos, diasAtePrazo, sugestaoCiclo } from "@/components/scout/TelaCiclos";

const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const falha = (status: number, erro: string, mensagem: string) => ({
  data: undefined,
  error: { erro, mensagem },
  response: { status },
});

const fechado = {
  id: "c1",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  prazo: "2026-10-31",
  status: "fechado",
  atletasComScore: 12,
  fechadoEm: "2026-11-01T12:00:00.000Z",
};
const aberto = {
  id: "c2",
  nome: "Novembro de 2026",
  inicio: "2026-11-01",
  prazo: "2026-11-30",
  status: "aberto",
  atletasComScore: 0,
  fechadoEm: null,
};

let itens: unknown[];

beforeEach(() => {
  vi.clearAllMocks();
  itens = [fechado];
  GET.mockImplementation(async () => ok({ itens }));
});

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <TelaCiclos />
    </QueryClientProvider>,
  );
  return inv;
}

describe("helpers", () => {
  it("sugere nome e prazo no fim do mês", () => {
    expect(sugestaoCiclo(new Date(2026, 1, 10))).toEqual({
      nome: "Fevereiro de 2026",
      inicio: "2026-02-10",
      prazo: "2026-02-28",
    });
  });
  it("conta dias até o prazo", () => {
    expect(diasAtePrazo("2026-11-12", new Date(2026, 10, 9))).toBe(3);
    expect(diasAtePrazo("2026-11-08", new Date(2026, 10, 9))).toBe(-1);
  });
});

describe("TelaCiclos", () => {
  it("lista ciclos e abre um novo quando não há aberto", async () => {
    POST.mockResolvedValue(ok({ ...aberto }, 201));
    const inv = montar();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ciclos de avaliação" }),
    ).toBeTruthy();
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("Outubro de 2026")).toBeTruthy();
    expect(within(tabela).getByText("31/10/2026")).toBeTruthy();
    expect(within(tabela).getByText("01/11/2026")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Dezembro de 2026" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir ciclo" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/ciclos", {
        body: { nome: "Dezembro de 2026", inicio: "2026-12-01", prazo: "2026-12-31" },
      }),
    );
    await waitFor(() => {
      for (const k of ["ciclos", "ranking", "atleta", "painel", "investimento"]) {
        expect(inv).toHaveBeenCalledWith({ queryKey: [k] });
      }
    });
  });

  it("mostra o erro 409 da API", async () => {
    POST.mockResolvedValue(falha(409, "requisicao_invalida", "Já existe um ciclo aberto."));
    montar();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Abrir ciclo" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Já existe um ciclo aberto.");
  });

  it("bloqueia o formulário com ciclo aberto e ajusta o prazo", async () => {
    itens = [aberto, fechado];
    PUT.mockResolvedValue(ok({ ...aberto, prazo: "2026-12-05" }));
    montar();
    expect(await screen.findByText(/Ciclo aberto: Novembro de 2026/)).toBeTruthy();
    expect(screen.getByLabelText("Nome").matches(":disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar prazo" }));
    fireEvent.change(screen.getByLabelText("Novo prazo"), { target: { value: "2026-12-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar prazo" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/ciclos/{id}", {
        params: { path: { id: "c2" } },
        body: { prazo: "2026-12-05" },
      }),
    );
  });

  it("fecha o ciclo só após confirmar e mostra quantos foram congelados", async () => {
    itens = [aberto, fechado];
    POST.mockResolvedValue(
      ok({ ciclo: { ...aberto, status: "fechado", atletasComScore: 9 }, atletas: 9 }),
    );
    montar();
    await screen.findByText(/Ciclo aberto: Novembro de 2026/);
    fireEvent.click(screen.getByRole("button", { name: "Fechar ciclo" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toContain("não se desfaz");
    expect(POST).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/ciclos/{id}/fechar", { params: { path: { id: "c2" } } }),
    );
    expect(await screen.findByText(/9 atletas tiveram o score congelado/)).toBeTruthy();
  });
});
