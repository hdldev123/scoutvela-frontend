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

const ALTURA_MIN = 120;
const ALTURA_MAX = 230;

/** Aceita "175" ou "175,5"; vazio vira null (altura não definida) e inválido vira NaN. */
function lerAltura(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return Number.NaN;
  return Math.round(Number(t) * 10) / 10;
}

/** Os três valores juntos ou nenhum, entre 120 e 230 cm, com mín. <= média <= máx. */
export function analisarAltura(min: string, med: string, max: string) {
  const v = [lerAltura(min), lerAltura(med), lerAltura(max)] as const;
  const [a, b, c] = v;
  let erro: string | null = null;
  if (v.every((x) => x === null)) return { min: null, med: null, max: null, erro };
  if (v.some((x) => x === null)) {
    erro = "Informe os três valores de altura ou deixe os três vazios.";
  } else if (v.some((x) => Number.isNaN(x))) {
    erro = "Altura deve ser um número em cm.";
  } else if (v.some((x) => x! < ALTURA_MIN || x! > ALTURA_MAX)) {
    erro = `A altura deve ficar entre ${ALTURA_MIN} e ${ALTURA_MAX} cm.`;
  } else if (a! > b!) {
    erro = "A altura mínima não pode passar da média.";
  } else if (b! > c!) {
    erro = "A altura média não pode passar da máxima.";
  }
  return { min: a, med: b, max: c, erro };
}
