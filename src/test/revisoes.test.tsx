import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    PUT: (...args: unknown[]) => PUT(...args),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: { id: string };
  }) => <a href={params ? to.replace("$id", params.id) : to}>{children}</a>,
}));

import { TelaRevisoes } from "@/components/scout/TelaRevisoes";

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } });

const revisao = {
  id: "r1",
  atleta: { id: "a1", nome: "Helena Prado" },
  pilar: { id: "p1", nomeCurto: "Técnica" },
  indicador: null,
  motivo: "A nota de largada parece baixa.",
  status: "aberto",
  criadoEm: "2026-11-05T12:00:00.000Z",
  resposta: null,
  respondidoEm: null,
};
const pedido = {
  id: "t1",
  atleta: { id: "a2", nome: "Bruno Lima" },
  tipo: "exclusao",
  descricao: "Quero excluir meus dados.",
  status: "aberto",
  criadoEm: "2026-11-04T12:00:00.000Z",
  resposta: null,
  respondidoEm: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  GET.mockImplementation(async (caminho: string) =>
    ok(caminho === "/revisoes" ? [revisao] : [pedido]),
  );
});

function montar(papel: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <TelaRevisoes papel={papel} />
    </QueryClientProvider>,
  );
  return inv;
}

describe("TelaRevisoes", () => {
  it("gestor filtra e responde uma revisão", async () => {
    PUT.mockResolvedValue(ok({ ...revisao, status: "respondido", resposta: "Revisada." }));
    const inv = montar("gestor");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Pedidos de revisão" }),
    ).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Helena Prado" });
    expect(link.getAttribute("href")).toBe("/atletas/a1");
    expect(GET).toHaveBeenCalledWith("/revisoes", { params: { query: { status: "aberto" } } });

    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: "todos" } });
    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith("/revisoes", { params: { query: {} } }),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Resposta"), {
      target: { value: "Revisada." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/revisoes/{id}", {
        params: { path: { id: "r1" } },
        body: { resposta: "Revisada." },
      }),
    );
    await waitFor(() => expect(inv).toHaveBeenCalledWith({ queryKey: ["revisoes"] }));
  });

  it("treinador só lê e não vê a aba LGPD", async () => {
    montar("treinador");
    await screen.findByRole("link", { name: "Helena Prado" });
    expect(screen.queryByRole("button", { name: "Responder" })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Quem responde é o gestor/)).toBeTruthy();
    expect(GET).not.toHaveBeenCalledWith("/pedidos-titular");
  });

  it("gestor responde pedido do titular e vê o aviso da exclusão", async () => {
    PUT.mockResolvedValue(ok({ ...pedido, status: "respondido", resposta: "Feito." }));
    const inv = montar("gestor");
    fireEvent.click(await screen.findByRole("tab", { name: "Pedidos do titular (LGPD)" }));
    expect(await screen.findByText("Exclusão")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain("procedimento manual");
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Resposta"), { target: { value: "Feito." } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/pedidos-titular/{id}", {
        params: { path: { id: "t1" } },
        body: { resposta: "Feito." },
      }),
    );
    await waitFor(() => expect(inv).toHaveBeenCalledWith({ queryKey: ["pedidos-titular"] }));
  });
});
