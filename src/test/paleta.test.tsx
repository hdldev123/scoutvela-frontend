import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { GET: (...args: unknown[]) => GET(...args) },
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
// O cmdk usa APIs que o jsdom não tem.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = () => {};

import { PaletaDeAtletas } from "@/components/scout/PaletaDeAtletas";

const FOTO = "https://storage.teste/assinado/fotos/x.jpg?token=abc";

function atleta(id: string, nome: string, fotoUrl: string | null) {
  return {
    posicao: 1,
    atleta: {
      id,
      nome,
      velaid: "SC-T01",
      numeroVela: null,
      uf: "SC",
      idade: 20,
      genero: "F" as const,
      classe: { id: "c1", nome: "ILCA 6", evento: "ILCA 6" },
      fotoUrl,
    },
    score: 80,
    faixa: { id: "f2", nome: "Alto potencial", nomeCurto: "Alto potencial" },
    completo: true,
    pilares: [],
    statusGates: "apto" as const,
    pontosCbvela: 0,
  };
}

function montar(ui: ReactNode) {
  const { container } = render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
  return container;
}

const abrir = () => fireEvent.click(screen.getByRole("button", { name: /Buscar atleta/ }));

describe("Busca de atletas", () => {
  beforeEach(() => GET.mockReset());

  it("mostra a foto do atleta ou as iniciais", async () => {
    GET.mockResolvedValue({
      data: {
        ciclo: null,
        itens: [atleta("a1", "Helena Vasques", FOTO), atleta("a2", "Marcos Lima", null)],
        ocultosSemConsentimento: null,
      },
      response: { status: 200 },
    });
    const container = montar(
      <PaletaDeAtletas me={{ usuario: { papel: "gestor" }, atleta: null, telas: ["ranking"] }} />,
    );
    abrir();
    expect(await screen.findByText("Helena Vasques")).toBeInTheDocument();
    const fotos = container.querySelectorAll(".cmdk .avatar img");
    expect(fotos).toHaveLength(1);
    expect(fotos[0]).toHaveAttribute("src", FOTO);
    expect(screen.getByText("ML")).toBeInTheDocument();
  });

  it("link vencido volta para as iniciais", async () => {
    GET.mockResolvedValue({
      data: {
        ciclo: null,
        itens: [atleta("a1", "Helena Vasques", FOTO)],
        ocultosSemConsentimento: null,
      },
      response: { status: 200 },
    });
    const container = montar(
      <PaletaDeAtletas me={{ usuario: { papel: "gestor" }, atleta: null, telas: ["ranking"] }} />,
    );
    abrir();
    await screen.findByText("Helena Vasques");
    fireEvent.error(container.querySelector(".cmdk .avatar img")!);
    expect(container.querySelector(".cmdk .avatar img")).toBeNull();
    expect(screen.getByText("HV")).toBeInTheDocument();
  });

  it('atleta vê a própria foto em "Minha ficha", sem chamar o ranking', () => {
    const container = montar(
      <PaletaDeAtletas
        me={{
          usuario: { papel: "atleta", fotoUrl: FOTO },
          atleta: { id: "a1", nome: "Helena Vasques" },
          telas: ["painel"],
        }}
      />,
    );
    abrir();
    expect(screen.getByText("Minha ficha")).toBeInTheDocument();
    expect(container.querySelector(".cmdk .avatar img")).toHaveAttribute("src", FOTO);
    expect(GET).not.toHaveBeenCalled();
  });
});
