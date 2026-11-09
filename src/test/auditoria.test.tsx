import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { GET: (...args: unknown[]) => GET(...args) },
}));

import { TelaAuditoria } from "@/components/scout/TelaAuditoria";

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } });
const evento = (id: string, acao: string, extra: Record<string, unknown> = {}) => ({
  id,
  em: "2026-11-06T15:30:00.000Z",
  usuario: { id: "u1", nome: "Ana Ribeiro", papel: "gestor" },
  acao,
  entidade: "atleta",
  entidadeId: "a1",
  detalhes: { nota: 4 },
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  GET.mockImplementation(async (_c: string, opcoes: { params: { query: { antesDe?: string } } }) =>
    opcoes.params.query.antesDe
      ? ok({ itens: [evento("3", "decidir_gate")], proximo: null })
      : ok({
          itens: [evento("1", "lancar_avaliacao"), evento("2", "acao_nova_x", { usuario: null })],
          proximo: "2",
        }),
  );
});

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <TelaAuditoria />
    </QueryClientProvider>,
  );
}

describe("TelaAuditoria", () => {
  it("mostra rótulos legíveis, ação desconhecida crua e detalhes", async () => {
    montar();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Trilha de auditoria" }),
    ).toBeTruthy();
    const tabela = await screen.findByRole("table");
    expect(tabela.textContent).toContain("Lançou avaliação");
    expect(tabela.textContent).toContain("acao_nova_x");
    expect(tabela.textContent).toContain("Ana Ribeiro");
    expect(tabela.textContent).toContain("06/11/2026 12:30");
    expect(tabela.textContent).toContain('"nota": 4');
  });

  it("transforma filtros em query", async () => {
    montar();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Ação"), { target: { value: "fechar_ciclo" } });
    fireEvent.change(screen.getByLabelText("Entidade"), { target: { value: "ciclo" } });
    fireEvent.change(screen.getByLabelText("Atleta (id)"), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-11-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith("/auditoria", {
        params: {
          query: {
            acao: "fechar_ciclo",
            entidade: "ciclo",
            atletaId: "a1",
            desde: "2026-11-01",
            ate: "2026-11-30",
          },
        },
      }),
    );
  });

  it("carrega mais usando o cursor proximo como antesDe", async () => {
    montar();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith("/auditoria", { params: { query: { antesDe: "2" } } }),
    );
    await waitFor(() => expect(screen.getByRole("table").textContent).toContain("Decidiu gate"));
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });
});
