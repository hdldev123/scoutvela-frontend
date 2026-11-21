import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PUT = vi.fn();
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { PUT: (...a: unknown[]) => PUT(...a) },
}));

import { useAlterarAtivo, useEditarAtleta } from "@/lib/api/usuarios";

function montar() {
  const qc = new QueryClient();
  const inv = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { inv, wrapper };
}

const chaves = (inv: { mock: { calls: unknown[][] } }) =>
  inv.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));

beforeEach(() => PUT.mockReset());

describe("invalidações de cache", () => {
  it("ativar ou desativar o atleta em Editar atualiza as notificações", async () => {
    PUT.mockResolvedValue({ data: { id: "a1" }, response: { status: 200 } });
    const { inv, wrapper } = montar();
    const { result } = renderHook(() => useEditarAtleta(), { wrapper });
    await act(async () => {
      result.current.mutate({ id: "a1", corpo: { ativo: false } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chaves(inv)).toEqual(
      expect.arrayContaining([
        '["ranking"]',
        '["atleta"]',
        '["usuarios"]',
        '["atletas-gestao"]',
        '["notificacoes"]',
      ]),
    );
  });

  it("ativar ou desativar uma conta atualiza as notificações", async () => {
    PUT.mockResolvedValue({ data: { id: "u1" }, response: { status: 200 } });
    const { inv, wrapper } = montar();
    const { result } = renderHook(() => useAlterarAtivo(), { wrapper });
    await act(async () => {
      result.current.mutate({ id: "u1", ativo: false });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chaves(inv)).toEqual(expect.arrayContaining(['["usuarios"]', '["notificacoes"]']));
  });
});
