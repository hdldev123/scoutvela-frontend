/** Formatação pt-BR compartilhada pelas telas. Só apresentação: nenhum cálculo de negócio. */

export const fmt1 = (v: number): string =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt0 = (v: number): string => Math.round(v).toLocaleString("pt-BR");

/** Data pura ("2026-11-06") -> "06/11/2026". Não serve para instantes: use `fmtInstante`. */
export function fmtData(iso: string): string {
  const dia = iso.slice(0, 10);
  const partes = dia.split("-");
  return partes.length === 3 ? partes.reverse().join("/") : iso;
}

/**
 * Instante ISO com fuso ("2026-11-07T02:30:00Z") -> "06/11/2026", no horário de Brasília.
 * Cortar a string erraria o dia entre 21h e 23h59 (UTC-3).
 */
export function fmtInstante(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** Diferença em kg com sinal: "+1,2 kg" / "−0,8 kg". */
export const fmtDelta = (d: number): string => (d >= 0 ? "+" : "−") + fmt1(Math.abs(d)) + " kg";

/** Primeiro nome, para mensagens ("score de Helena"). */
export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? nome;

/** Abrevia o nome do ciclo para o eixo do gráfico: "Setembro de 2026" -> "Set". */
export const rotuloCiclo = (nome: string): string => nome.trim().slice(0, 3);
