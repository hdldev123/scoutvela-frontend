import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Abas, PainelAba } from "@/components/scout/Abas";
import { CampoArquivo } from "@/components/scout/CampoArquivo";
import { EstadoVazio } from "@/components/scout/EstadoVazio";
import { Interruptor } from "@/components/scout/Interruptor";

describe("EstadoVazio", () => {
  it("renderiza título, texto e ação", () => {
    render(
      <EstadoVazio
        icone="users"
        titulo="Sem atletas"
        texto="Cadastre o primeiro."
        acao={<button>Cadastrar</button>}
      />,
    );
    expect(screen.getByText("Sem atletas")).toBeInTheDocument();
    expect(screen.getByText("Cadastre o primeiro.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeInTheDocument();
  });
});

describe("CampoArquivo", () => {
  function Caso() {
    const [f, setF] = useState<File | null>(null);
    return (
      <CampoArquivo
        id="arq"
        rotulo="Planilha"
        accept=".csv"
        dica="Aceita .csv"
        arquivo={f}
        aoEscolher={(x) => setF(x ?? null)}
      />
    );
  }
  it("escolhe, mostra o nome e limpa", async () => {
    render(<Caso />);
    expect(screen.getByText("Aceita .csv")).toBeInTheDocument();
    const arquivo = new File(["a"], "dados.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Planilha"), { target: { files: [arquivo] } });
    expect(await screen.findByText("dados.csv")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover dados.csv" }));
    expect(screen.queryByText("dados.csv")).not.toBeInTheDocument();
  });
  it("chama aoEscolher com o arquivo", () => {
    const aoEscolher = vi.fn();
    render(<CampoArquivo id="a" rotulo="Foto" accept="image/png" aoEscolher={aoEscolher} />);
    const f = new File(["x"], "foto.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Foto"), { target: { files: [f] } });
    expect(aoEscolher).toHaveBeenCalledWith(f);
  });
});

describe("Abas", () => {
  function Caso() {
    const [a, setA] = useState("um");
    return (
      <>
        <Abas
          rotulo="Seções"
          ativa={a}
          aoMudar={setA}
          itens={[
            { id: "um", rotulo: "Um", contagem: 3 },
            { id: "dois", rotulo: "Dois" },
            { id: "tres", rotulo: "Três" },
          ]}
        />
        <PainelAba id="um" ativa={a === "um"}>
          conteúdo um
        </PainelAba>
        <PainelAba id="dois" ativa={a === "dois"}>
          conteúdo dois
        </PainelAba>
      </>
    );
  }
  it("clica e navega por teclado", () => {
    render(<Caso />);
    const um = screen.getByRole("tab", { name: /Um/ });
    expect(um).toHaveAttribute("aria-selected", "true");
    expect(um).toHaveAttribute("aria-controls", "painel-um");
    expect(screen.getByRole("tab", { name: "Dois" })).toHaveAttribute("tabindex", "-1");
    fireEvent.click(screen.getByRole("tab", { name: "Dois" }));
    screen.getByRole("tab", { name: "Dois" }).focus();
    expect(screen.getByRole("tab", { name: "Dois" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("conteúdo dois")).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Três" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /Um/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "End" });
    expect(screen.getByRole("tab", { name: "Três" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Home" });
    expect(screen.getByRole("tab", { name: /Um/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Três" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Interruptor", () => {
  it("alterna aria-checked e chama aoMudar", () => {
    const aoMudar = vi.fn();
    function Caso() {
      const [v, setV] = useState(false);
      return (
        <Interruptor
          id="i"
          rotulo="Compartilhar com o IBVAR"
          ligado={v}
          aoMudar={(x) => {
            aoMudar(x);
            setV(x);
          }}
        />
      );
    }
    render(<Caso />);
    const sw = screen.getByRole("switch", { name: "Compartilhar com o IBVAR" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Desativado")).toBeInTheDocument();
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(aoMudar).toHaveBeenCalledWith(true);
    expect(screen.getByText("Ativado")).toBeInTheDocument();
  });
});
