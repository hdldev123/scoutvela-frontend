import { fmtInstante } from "./formato";

export type EstadoPassaporte = "ok" | "vencendo" | "vencido";

/** "AAAA-MM" -> "MM/AAAA". */
export function fmtMesAno(aaaaMm: string): string {
  const [a, m] = aaaaMm.split("-");
  return a && m ? `${m}/${a}` : aaaaMm;
}

/**
 * Situação da validade do passaporte (mês de validade, sempre até o último dia do mês):
 * vencido se o mês já passou; vencendo se faltam menos de 6 meses. Só apresentação.
 */
export function estadoPassaporte(aaaaMm: string, hoje = new Date()): EstadoPassaporte {
  const [a, m] = aaaaMm.split("-").map(Number) as [number, number];
  const meses = a * 12 + m - (hoje.getFullYear() * 12 + hoje.getMonth() + 1);
  if (meses < 0) return "vencido";
  return meses < 6 ? "vencendo" : "ok";
}

export const AVISO_PASSAPORTE: Record<Exclude<EstadoPassaporte, "ok">, string> = {
  vencido: "Passaporte vencido",
  vencendo: "Passaporte vence em menos de 6 meses",
};

export interface Aptidao {
  apto: boolean;
  conferidoEm: string;
  conferidoPor: { nome: string };
}

/** "Apto, conferido em 10/11/2026 por Nome" ou "Sem registro". */
export function textoAptidao(a: Aptidao | null | undefined): string {
  if (!a) return "Sem registro";
  return `${a.apto ? "Apto" : "Não apto"}, conferido em ${fmtInstante(a.conferidoEm)} por ${a.conferidoPor.nome}`;
}
