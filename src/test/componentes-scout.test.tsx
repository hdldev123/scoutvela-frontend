import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaixaPill } from "@/components/scout/FaixaPill";
import { fmt0, fmt1, fmtData, fmtDelta, rotuloCiclo } from "@/components/scout/formato";
import { PilaresStrip } from "@/components/scout/PilaresStrip";
import { StatusPill } from "@/components/scout/StatusPill";

describe("formato", () => {
  it("formata em pt-BR", () => {
    expect(fmt1(71.46)).toBe("71,5");
    expect(fmt0(1234.4)).toBe("1.234");
    expect(fmtData("2026-11-06")).toBe("06/11/2026");
    expect(fmtData("2026-11-06T10:00:00.000Z")).toBe("06/11/2026");
    expect(fmtDelta(1.25)).toBe("+1,3 kg");
    expect(fmtDelta(-0.8)).toBe("−0,8 kg");
    expect(rotuloCiclo("Setembro de 2026")).toBe("Set");
  });
});

describe("pills e strip", () => {
  it("StatusPill usa texto e classe de cada status", () => {
    const { container } = render(
      <>
        <StatusPill status="apto" />
        <StatusPill status="condicional" />
        <StatusPill status="nao_prioritario" ponto />
        <StatusPill status="alerta" />
      </>,
    );
    expect(screen.getByText("Apto")).toHaveClass("st-apto");
    expect(screen.getByText("Condicional")).toHaveClass("st-cond");
    expect(screen.getByText("Não prioritário")).toHaveClass("st-nao");
    expect(screen.getByText("Sinal de alerta")).toHaveClass("st-alerta");
    expect(container.querySelectorAll(".dot")).toHaveLength(1);
  });

  it("FaixaPill usa a classe da faixa e o nome curto", () => {
    render(<FaixaPill faixa={{ id: "f1", nome: "Prioridade de programa", nomeCurto: "Prioridade" }} curto />);
    expect(screen.getByText("Prioridade")).toHaveClass("pill", "f1");
  });

  it("PilaresStrip marca pilar sem nota como tracejado", () => {
    const { container } = render(
      <PilaresStrip
        pilares={[
          { id: "a", nomeCurto: "A", nota: 5 },
          { id: "b", nomeCurto: "B", nota: null },
        ]}
      />,
    );
    expect(container.querySelectorAll("i")).toHaveLength(2);
    expect(container.querySelector("i.empty")).toHaveAttribute("title", "B: sem nota");
  });
});
