/** Formatação pt-BR compartilhada pelas telas. Só apresentação: nenhum cálculo de negócio. */

export const fmt1 = (v: number): string =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt0 = (v: number): string => Math.round(v).toLocaleString("pt-BR");

/** "2026-11-06" ou instante ISO ("2026-11-06T10:00:00Z") -> "06/11/2026". */
export function fmtData(iso: string): string {
  const dia = iso.slice(0, 10);
  const partes = dia.split("-");
  return partes.length === 3 ? partes.reverse().join("/") : iso;
}

/** Diferença em kg com sinal: "+1,2 kg" / "−0,8 kg". */
export const fmtDelta = (d: number): string => (d >= 0 ? "+" : "−") + fmt1(Math.abs(d)) + " kg";

/** Primeiro nome, para mensagens ("score de Helena"). */
export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? nome;

/** Abrevia o nome do ciclo para o eixo do gráfico: "Setembro de 2026" -> "Set". */
export const rotuloCiclo = (nome: string): string => nome.trim().slice(0, 3);
