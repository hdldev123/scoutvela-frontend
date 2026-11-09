import { describe, expect, it } from "vitest";
import { iniciais, itensDeNavegacao, rotaDaTelaInicial } from "@/lib/auth/navegacao";

const gestor = {
  usuario: { papel: "gestor" },
  atleta: null,
  telas: ["ranking", "avaliar", "cadastro", "investimento", "parametros"],
};

describe("navegação por papel", () => {
  it("gestor vê as cinco telas com rótulo e rota", () => {
    const itens = itensDeNavegacao(gestor);
    expect(itens.map((i) => i.rotulo)).toEqual([
      "Ranking",
      "Lançar avaliação",
      "Cadastrar atleta",
      "Investimento",
      "Parâmetros",
    ]);
    expect(itens.map((i) => i.to)).toEqual(["/ranking", "/avaliar", "/cadastro", "/investimento", "/parametros"]);
  });

  it("treinador vê o ranking como Meus atletas", () => {
    const itens = itensDeNavegacao({ usuario: { papel: "treinador" }, atleta: null, telas: ["ranking", "avaliar"] });
    expect(itens.map((i) => i.rotulo)).toEqual(["Meus atletas", "Lançar avaliação"]);
    expect(itens[0]?.to).toBe("/ranking");
  });

  it("atleta vê painel e a própria ficha", () => {
    const itens = itensDeNavegacao({
      usuario: { papel: "atleta" },
      atleta: { id: "abc", nome: "Helena" },
      telas: ["painel", "ficha"],
    });
    expect(itens.map((i) => i.rotulo)).toEqual(["Meu painel", "Minha ficha"]);
    expect(itens[1]).toMatchObject({ to: "/atletas/$id", params: { id: "abc" } });
  });

  it("ignora ficha sem atleta vinculado e telas desconhecidas", () => {
    const itens = itensDeNavegacao({ usuario: { papel: "atleta" }, atleta: null, telas: ["ficha", "xyz"] });
    expect(itens).toEqual([]);
  });

  it("resolve a tela inicial e as iniciais", () => {
    expect(rotaDaTelaInicial("painel")).toBe("/painel");
    expect(rotaDaTelaInicial("investimento")).toBe("/investimento");
    expect(rotaDaTelaInicial("ficha")).toBe("/ranking");
    expect(iniciais("Ana Maria Ribeiro")).toBe("AR");
    expect(iniciais("Helena")).toBe("H");
  });
});
