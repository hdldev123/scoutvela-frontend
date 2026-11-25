/** Geometria e textos do gráfico de evolução da turma. Só apresentação: a meta e o realizado vêm da API. */
import { fmt1 } from "./formato";

/** "Novembro de 2026" -> "Nov/26"; sem ano, as 6 primeiras letras. */
export function rotuloEixo(nome: string): string {
  const ano = /(\d{4})/.exec(nome)?.[1];
  const mes = nome.trim().slice(0, 3);
  return ano ? `${mes}/${ano.slice(2)}` : nome.trim().slice(0, 6);
}

/** Percentual com sinal para o texto: "+10,0%" / "−2,5%". */
export function fmtPercentualSinal(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Diferença em pontos com sinal: "+3,2" / "−1,0". */
export function fmtPontosSinal(v: number): string {
  return `${v >= 0 ? "+" : "−"}${fmt1(Math.abs(v))}`;
}

/** Meta do ciclo atual: média base × (1 + percentual/100). */
export function alvoDaMeta(mediaBase: number | null, percentual: number): number | null {
  return mediaBase == null ? null : mediaBase * (1 + percentual / 100);
}

/** Eixo vertical do score: limites arredondados de 5 em 5 (0 a 100) e marcas a cada 5 ou 10. */
export function eixoScore(valores: number[]): { lo: number; hi: number; marcas: number[] } {
  if (valores.length === 0) return { lo: 0, hi: 100, marcas: [0, 25, 50, 75, 100] };
  const lo = Math.max(0, Math.floor((Math.min(...valores) - 4) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...valores) + 4) / 5) * 5);
  const passo = hi - lo > 30 ? 10 : 5;
  const marcas: number[] = [];
  for (let v = Math.ceil(lo / passo) * passo; v <= hi; v += passo) marcas.push(v);
  return { lo, hi, marcas };
}

/** Quebra uma série com buracos (`null`) em trechos contínuos de índices, para a linha não ligar o que falta. */
export function trechos(valores: (number | null)[]): number[][] {
  const saida: number[][] = [];
  let atual: number[] = [];
  valores.forEach((v, i) => {
    if (v == null) {
      if (atual.length) saida.push(atual);
      atual = [];
    } else atual.push(i);
  });
  if (atual.length) saida.push(atual);
  return saida;
}
