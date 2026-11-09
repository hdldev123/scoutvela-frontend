/** Utilitários compartilhados pelos blocos da tela de Parâmetros. */

export const MSG_SALVO = "Parâmetros salvos. O ranking já usa os novos valores.";

/** Aceita "82,8" ou "82.8"; devolve null quando não for número finito >= 0. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Valor de regra em texto legível (números, booleanos, listas e objetos simples). */
export function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(formatarValor).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${formatarValor(val)}`)
      .join("; ");
  }
  return String(v);
}
