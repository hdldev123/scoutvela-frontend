import { describe, expect, it } from "vitest";
import { seloApoio, seloAutonomia } from "@/components/scout/financeiro-util";

describe("selos do financeiro da ficha", () => {
  it("autonomia: alta é bom, baixa é alerta", () => {
    expect(seloAutonomia("alta").classe).toBe("st-apto");
    expect(seloAutonomia("parcial")).toEqual({ rotulo: "Média", classe: "st-cond" });
    expect(seloAutonomia("Baixa").classe).toBe("st-alerta");
  });

  it("apoio da CBVela: alto é alerta, baixo é neutro", () => {
    expect(seloApoio("alta").classe).toBe("st-alerta");
    expect(seloApoio("media")).toEqual({ rotulo: "Média", classe: "st-cond" });
    expect(seloApoio("média").classe).toBe("st-cond");
    expect(seloApoio("baixa").classe).toBe("st-neutro");
  });

  it("valor desconhecido aparece como veio, em selo neutro", () => {
    expect(seloAutonomia("x")).toEqual({ rotulo: "x", classe: "st-neutro" });
  });
});
