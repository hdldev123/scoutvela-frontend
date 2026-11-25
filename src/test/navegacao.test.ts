import { describe, expect, it } from "vitest";
import { iniciais, itensDeNavegacao, rotaDaTelaInicial } from "@/lib/auth/navegacao";

const gestor = {
  usuario: { papel: "gestor" },
  atleta: null,
  telas: ["ranking", "avaliar", "cadastro", "investimento", "parametros", "sugestoes"],
};

describe("navegação por papel", () => {
  it("gestor vê as telas liberadas e Sugestões, com rótulo e rota", () => {
    const itens = itensDeNavegacao(gestor);
    expect(itens.map((i) => i.rotulo)).toEqual([
      "Ranking",
      "Lançar avaliação",
      "Cadastrar atleta",
      "Investimento",
      "Parâmetros",
      "Sugestões",
    ]);
    expect(itens.map((i) => i.to)).toEqual([
      "/ranking",
      "/avaliar",
      "/cadastro",
      "/investimento",
      "/parametros",
      "/sugestoes",
    ]);
  });

  it("o menu só espelha as telas da API: Sugestões aparece quando o back libera", () => {
    const tem = (papel: string, telas: string[]) =>
      itensDeNavegacao({ usuario: { papel }, atleta: null, telas }).some(
        (i) => i.tela === "sugestoes",
      );
    expect(tem("gestor", ["ranking", "sugestoes"])).toBe(true);
    expect(tem("treinador", ["ranking", "sugestoes"])).toBe(true);
    // Sem a tela em `telas`, o front não inventa o item, qualquer que seja o papel.
    expect(tem("gestor", ["ranking"])).toBe(false);
    expect(tem("atleta", ["painel"])).toBe(false);
    expect(tem("ibvar", ["investimento"])).toBe(false);
  });

  it("treinador vê o ranking como Meus atletas", () => {
    const itens = itensDeNavegacao({
      usuario: { papel: "treinador" },
      atleta: null,
      telas: ["ranking", "avaliar", "sugestoes"],
    });
    expect(itens.map((i) => i.rotulo)).toEqual(["Meus atletas", "Lançar avaliação", "Sugestões"]);
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
    const itens = itensDeNavegacao({
      usuario: { papel: "atleta" },
      atleta: null,
      telas: ["ficha", "xyz"],
    });
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
