import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GaugeClassFit } from "@/components/scout/GaugeClassFit";

// ILCA 7 (referência): 82,8 a 87,2 kg, média 85,0. O jsdom não tem layout, então os rótulos
// são medidos pela posição (x e âncora) e por uma largura de caractere de fonte monoespaçada.
const LARGURA_CHAR = 0.62;

interface Caixa {
  texto: string;
  y: number;
  de: number;
  ate: number;
}

function caixas(svg: SVGElement): Caixa[] {
  return [...svg.querySelectorAll("text")].map((t) => {
    const x = Number(t.getAttribute("x"));
    const tamanho = Number(t.getAttribute("font-size"));
    const texto = t.textContent ?? "";
    const largura = texto.length * tamanho * LARGURA_CHAR;
    const ancora = t.getAttribute("text-anchor");
    const de = ancora === "end" ? x - largura : ancora === "middle" ? x - largura / 2 : x;
    return { texto, y: Number(t.getAttribute("y")), de, ate: de + largura };
  });
}

function desenhar(valor: number) {
  const { container } = render(
    <GaugeClassFit
      grandeza="Peso"
      unidade="kg"
      casas={1}
      valor={valor}
      min={82.8}
      media={85}
      max={87.2}
      classe="ILCA 7"
      status="alerta"
    />,
  );
  return container.querySelector("svg") as SVGElement;
}

describe("GaugeClassFit com valores extremos", () => {
  it.each([60, 110, 85, 82.8, 87.2, 40, 150])(
    "%s kg: rótulos sem sobreposição e dentro do quadro",
    (kg) => {
      const svg = desenhar(kg);
      const [, , largura] = svg.getAttribute("viewBox")!.split(" ").map(Number);
      const itens = caixas(svg);
      for (const c of itens) {
        expect(c.de, `${c.texto} à esquerda`).toBeGreaterThanOrEqual(0);
        expect(c.ate, `${c.texto} à direita`).toBeLessThanOrEqual(largura!);
      }
      for (let i = 0; i < itens.length; i++) {
        for (let j = i + 1; j < itens.length; j++) {
          const a = itens[i]!;
          const b = itens[j]!;
          // Só rótulos na mesma linha podem se sobrepor.
          if (Math.abs(a.y - b.y) >= 10) continue;
          const sobrepoe = a.de < b.ate && b.de < a.ate;
          expect(sobrepoe, `"${a.texto}" × "${b.texto}"`).toBe(false);
        }
      }
    },
  );

  it("a altura do quadro cresce quando a média desce para a segunda linha", () => {
    const longe = desenhar(60).getAttribute("viewBox");
    expect(longe).toBe("0 0 320 100");
  });
});
