import type { PontoRanking } from "@/lib/api/world-sailing";

/** Geometria do gráfico do ranking World Sailing: posição 1 no topo (eixo Y invertido). */

export interface EixoPosicao {
  /** Menor posição mostrada (topo). */
  topo: number;
  /** Maior posição mostrada (base). */
  base: number;
  marcas: number[];
}

/** Eixo das posições: da melhor posição (com folga, no mínimo 1) à pior, com marcas inteiras. */
export function eixoPosicao(posicoes: number[]): EixoPosicao {
  if (posicoes.length === 0) return { topo: 1, base: 10, marcas: [1, 5, 10] };
  const melhor = Math.min(...posicoes);
  const pior = Math.max(...posicoes);
  const folga = Math.max(1, Math.round((pior - melhor) * 0.1));
  const topo = Math.max(1, melhor - folga);
  const base = Math.max(pior + folga, topo + 2);
  const passo = Math.max(1, Math.ceil((base - topo) / 4));
  const marcas: number[] = [];
  for (let v = topo; v <= base; v += passo) marcas.push(v);
  return { topo, base, marcas };
}

/** "2026-03-15" -> milissegundos UTC (só para escalar o eixo X). */
export const instante = (data: string): number => Date.parse(`${data.slice(0, 10)}T00:00:00Z`);

/** "2026-03-15" -> "03/26". */
export function rotuloMes(data: string): string {
  const [ano, mes] = data.slice(0, 10).split("-");
  return ano && mes ? `${mes}/${ano.slice(2)}` : data;
}

export const textoPontos = (p: PontoRanking): string =>
  p.pontos == null ? "sem pontos" : `${p.pontos.toLocaleString("pt-BR")} pts`;
