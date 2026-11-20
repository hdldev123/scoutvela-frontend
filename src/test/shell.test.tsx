import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvisoAmbiente } from "@/components/scout/AvisoAmbiente";
import { Shell } from "@/components/scout/Shell";

const me = {
  usuario: { nome: "Ana Souza", papel: "gestor" },
  atleta: null,
  telas: ["ranking", "avaliar"],
};

async function montar() {
  const raiz = createRootRoute({
    component: () => (
      <Shell me={me} onSair={() => {}}>
        <Link to="/avaliar">ir</Link>
      </Shell>
    ),
  });
  const rotas = ["/", "/ranking", "/avaliar"].map((path) =>
    createRoute({ getParentRoute: () => raiz, path }),
  );
  const router = createRouter({
    routeTree: raiz.addChildren(rotas),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
  return router;
}

afterEach(() => vi.unstubAllEnvs());

describe("Gaveta do menu", () => {
  it("abre e fecha pelo teclado, com aria e foco", async () => {
    await montar();
    const botao = screen.getByRole("button", { name: "Abrir menu" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveAttribute("aria-controls", "menu-lateral");

    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  it("fecha ao trocar de rota e devolve o foco ao botão", async () => {
    const router = await montar();
    const botao = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");

    await act(async () => {
      await router.navigate({ to: "/avaliar" });
    });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  it("não exibe mais os textos de protótipo", async () => {
    await montar();
    expect(screen.queryByText(/protótipo/i)).toBeNull();
  });
});

describe("AvisoAmbiente", () => {
  it("aparece fora de produção", () => {
    vi.stubEnv("VITE_AMBIENTE", "homologacao");
    render(<AvisoAmbiente />);
    expect(screen.getByRole("note")).toHaveTextContent(/fictícios/);
  });

  it("some em produção", () => {
    vi.stubEnv("VITE_AMBIENTE", "producao");
    render(<AvisoAmbiente />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
