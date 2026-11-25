import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = () => {};

vi.mock("@/components/scout/PerfilDialog", async () => {
  const { Dialogo } = await import("@/components/scout/Dialogo");
  return {
    PerfilDialog: ({ aoFechar }: { aoFechar: () => void }) => (
      <Dialogo titulo="Meu perfil" aoFechar={aoFechar}>
        <button type="button">dentro</button>
      </Dialogo>
    ),
  };
});

import { CommandPalette } from "@/components/scout/CommandPalette";
import { Dialogo } from "@/components/scout/Dialogo";
import { PedirRevisaoDialog } from "@/components/scout/PedirRevisaoDialog";
import { PlanoIndividual } from "@/components/scout/PlanoIndividual";
import { ResultadoDialog } from "@/components/scout/ResultadoDialog";
import { Shell } from "@/components/scout/Shell";

const ITENS = [
  {
    id: "a1",
    nome: "Helena Vasques",
    classe: "ILCA 6",
    score: 71.5,
    faixa: "Em desenvolvimento",
    status: "Apto",
    avatar: { nome: "Helena Vasques", fotoUrl: null },
  },
];

const teclar = (init: KeyboardEventInit) => fireEvent.keyDown(window, init);

function Pilha() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(true);
  return (
    <>
      {a && (
        <Dialogo titulo="De baixo" aoFechar={() => setA(false)}>
          <button type="button">baixo</button>
        </Dialogo>
      )}
      {b && (
        <Dialogo titulo="De cima" aoFechar={() => setB(false)}>
          <button type="button">cima</button>
        </Dialogo>
      )}
    </>
  );
}

afterEach(() => {
  cleanup();
  document.body.removeAttribute("style");
});

describe("pilha de sobreposições", () => {
  it("o Esc fecha só o diálogo do topo", () => {
    render(<Pilha />);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "De cima" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "De baixo" })).toBeTruthy();
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o Tab fica preso no diálogo do topo", () => {
    render(<Pilha />);
    const cima = screen.getByRole("button", { name: "cima" });
    cima.focus();
    // Último item da caixa de cima: o Tab volta ao primeiro DELA, não ao de baixo.
    const fechar = within2("De cima").getByRole("button", { name: "Fechar" });
    cima.focus();
    teclar({ key: "Tab" });
    expect(document.activeElement).toBe(fechar);
  });

  it("a busca sobre um diálogo trata o Esc e o Tab sozinha", () => {
    render(
      <>
        <CommandPalette itens={ITENS} aoSelecionar={() => {}} />
        <Dialogo titulo="Resultado" aoFechar={() => {}}>
          <button type="button">ok</button>
        </Dialogo>
      </>,
    );
    // Abre a busca clicando (o atalho não abre por baixo de um diálogo).
    fireEvent.click(screen.getByRole("button", { name: /Buscar atleta/ }));
    const busca = screen.getByRole("dialog", { name: "Buscar atleta" });
    expect(busca).toHaveAttribute("aria-modal", "true");
    const entrada = screen.getByPlaceholderText(/Nome, classe/);
    expect(document.activeElement).toBe(entrada);
    teclar({ key: "Tab" });
    // O Tab não é capturado pelo diálogo de baixo: o foco continua dentro da busca.
    expect(busca.contains(document.activeElement)).toBe(true);
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Buscar atleta" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Resultado" })).toBeTruthy();
  });

  it("Ctrl+K não abre a busca com um diálogo aberto, e abre sem ele", () => {
    const { rerender } = render(
      <>
        <CommandPalette itens={ITENS} aoSelecionar={() => {}} />
        <Dialogo titulo="Resultado" aoFechar={() => {}}>
          <button type="button">ok</button>
        </Dialogo>
      </>,
    );
    teclar({ key: "k", ctrlKey: true });
    expect(screen.queryByPlaceholderText(/Nome, classe/)).toBeNull();
    rerender(<CommandPalette itens={ITENS} aoSelecionar={() => {}} />);
    teclar({ key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/Nome, classe/)).toBeTruthy();
  });

  it("a busca devolve o foco ao botão 'Buscar atleta' ao fechar", () => {
    render(<CommandPalette itens={ITENS} aoSelecionar={() => {}} />);
    const botao = screen.getByRole("button", { name: /Buscar atleta/ });
    botao.focus();
    fireEvent.click(botao);
    teclar({ key: "Escape" });
    expect(document.activeElement).toBe(botao);
  });

  it("a dica mostra Ctrl K fora do Mac e ⌘K no Mac", () => {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "platform");
    const plataforma = (v: string) =>
      Object.defineProperty(Navigator.prototype, "platform", { configurable: true, get: () => v });
    try {
      plataforma("Win32");
      render(<CommandPalette itens={ITENS} aoSelecionar={() => {}} />);
      expect(screen.getByText("Ctrl K")).toBeTruthy();
      cleanup();
      plataforma("MacIntel");
      render(<CommandPalette itens={ITENS} aoSelecionar={() => {}} />);
      expect(screen.getByText("⌘K")).toBeTruthy();
    } finally {
      if (original) Object.defineProperty(Navigator.prototype, "platform", original);
    }
  });
});

function within2(titulo: string) {
  const caixa = screen.getByRole("dialog", { name: titulo });
  return {
    getByRole: (papel: "button", opcoes: { name: string }) =>
      Array.from(caixa.querySelectorAll<HTMLElement>("button")).find(
        (b) => b.getAttribute("aria-label") === opcoes.name || b.textContent === opcoes.name,
      )!,
  };
}

describe("foco ao fechar o diálogo", () => {
  function ComAutoFocus() {
    const [aberto, setAberto] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setAberto(true)}>
          abrir
        </button>
        {aberto && (
          <Dialogo titulo="T" aoFechar={() => setAberto(false)}>
            <input aria-label="campo" autoFocus />
          </Dialogo>
        )}
      </>
    );
  }

  it("com autoFocus no conteúdo, o foco volta ao botão que abriu", () => {
    render(<ComAutoFocus />);
    const abrir = screen.getByRole("button", { name: "abrir" });
    abrir.focus();
    fireEvent.click(abrir);
    expect(document.activeElement).toBe(screen.getByLabelText("campo"));
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("no StrictMode (efeito duplo do dev), o foco fica no campo com autoFocus, não no Fechar", () => {
    render(
      <StrictMode>
        <ComAutoFocus />
      </StrictMode>,
    );
    const abrir = screen.getByRole("button", { name: "abrir" });
    abrir.focus();
    fireEvent.click(abrir);
    expect(document.activeElement).toBe(screen.getByLabelText("campo"));
    teclar({ key: "Escape" });
    expect(document.activeElement).toBe(abrir);
  });
});

describe("foco ao fechar os diálogos reais com autoFocus", () => {
  function Abridor({ children }: { children: (fechar: () => void) => React.ReactNode }) {
    const [aberto, setAberto] = useState(false);
    return (
      <QueryClientProvider client={new QueryClient()}>
        <button type="button" onClick={() => setAberto(true)}>
          abrir
        </button>
        {aberto && children(() => setAberto(false))}
      </QueryClientProvider>
    );
  }

  const casos: Array<[string, (fechar: () => void) => React.ReactNode]> = [
    ["PedirRevisaoDialog", (f) => <PedirRevisaoDialog pilares={[]} aoFechar={f} />],
    ["ResultadoDialog", (f) => <ResultadoDialog atletaId="a1" aoFechar={f} />],
  ];
  it.each(casos)("%s devolve o foco a quem abriu", (_nome, fazer) => {
    render(<Abridor>{fazer}</Abridor>);
    const abrir = screen.getByRole("button", { name: "abrir" });
    abrir.focus();
    fireEvent.click(abrir);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("PlanoIndividual devolve o foco a 'Registrar plano'", () => {
    const ficha = { atleta: { id: "a1" }, plano: null, sugestaoPlano: null } as never;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PlanoIndividual ficha={ficha} papel="gestor" />
      </QueryClientProvider>,
    );
    const botao = screen.getByRole("button", { name: "Registrar plano" });
    botao.focus();
    fireEvent.click(botao);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(botao);
  });
});

describe("fundo do diálogo e rolagem", () => {
  it("arrastar uma seleção para fora não fecha; mousedown e clique no fundo fecham", () => {
    const fechar = vi.fn();
    render(
      <Dialogo titulo="T" aoFechar={fechar}>
        <input aria-label="campo" />
      </Dialogo>,
    );
    const fundo = document.querySelector(".dialogo-overlay")!;
    const campo = screen.getByLabelText("campo");
    // Começa dentro, termina no fundo (o clique cai no ancestral comum).
    fireEvent.mouseDown(campo);
    fireEvent.click(fundo);
    expect(fechar).not.toHaveBeenCalled();
    fireEvent.mouseDown(fundo);
    fireEvent.click(fundo);
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it("trava a rolagem do body enquanto aberto e restaura ao fechar", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = render(
      <Dialogo titulo="T" aoFechar={() => {}}>
        <button type="button">x</button>
      </Dialogo>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("bloqueado: Esc, fundo e Fechar não fecham", () => {
    const fechar = vi.fn();
    render(
      <Dialogo titulo="T" aoFechar={fechar} bloqueado>
        <button type="button">x</button>
      </Dialogo>,
    );
    teclar({ key: "Escape" });
    const fundo = document.querySelector(".dialogo-overlay")!;
    fireEvent.mouseDown(fundo);
    fireEvent.click(fundo);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(fechar).not.toHaveBeenCalled();
  });
});

describe("gaveta e Meu perfil no celular", () => {
  it("abrir o perfil fecha a gaveta; o Esc fecha só o perfil e o foco volta ao menu", async () => {
    const me = {
      usuario: { nome: "Ana Souza", papel: "gestor" },
      atleta: null,
      telas: ["ranking"],
    };
    const raiz = createRootRoute({
      component: () => (
        <Shell me={me} onSair={() => {}}>
          x
        </Shell>
      ),
    });
    const router = createRouter({
      routeTree: raiz.addChildren([createRoute({ getParentRoute: () => raiz, path: "/" })]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      );
    });
    const menu = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /Ana Souza/ }));
    expect(screen.getByRole("dialog", { name: "Meu perfil" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    teclar({ key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveFocus();
  });
});
