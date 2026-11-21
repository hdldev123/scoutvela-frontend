/**
 * Limites de validação espelhados do servidor, só para avisar cedo. A API confere de novo e
 * continua sendo quem decide; o 400 dela volta por campo (`errosPorCampo`).
 */
export const LIMITES = {
  pesoKg: { min: 30, max: 160 },
  alturaCm: { min: 120, max: 230 },
  evidenciaMedida: { min: 3, max: 200 },
  evidenciaNota: { min: 3, max: 500 },
  resposta: { min: 3, max: 2000 },
  termoTitulo: { min: 3, max: 120 },
  termoTextoMax: 50000,
  justificativaRecusa: 20,
} as const;

const paraNumero = (texto: string): number => Number(texto.trim().replace(",", "."));

/** Mensagem de peso inválido (ou null). Vazio é válido: o campo é opcional. */
export function mensagemPeso(texto: string): string | null {
  if (texto.trim() === "") return null;
  const n = paraNumero(texto);
  const { min, max } = LIMITES.pesoKg;
  if (!Number.isFinite(n) || n < min || n > max) return `Informe o peso em kg, de ${min} a ${max}.`;
  return null;
}

/** Mensagem de altura inválida (ou null). "1.82" é erro comum: a altura é em centímetros. */
export function mensagemAltura(texto: string): string | null {
  if (texto.trim() === "") return null;
  const n = paraNumero(texto);
  const { min, max } = LIMITES.alturaCm;
  if (Number.isFinite(n) && n > 0 && n < 3) {
    return `A altura é em centímetros, não em metros: digite ${Math.round(n * 100)} em vez de ${texto.trim()}.`;
  }
  if (!Number.isFinite(n) || n < min || n > max) {
    return `Informe a altura em centímetros, de ${min} a ${max}.`;
  }
  return null;
}

/** Evidência da medida: opcional, mas se vier tem de 3 a 200 caracteres. */
export function mensagemEvidenciaMedida(texto: string): string | null {
  const t = texto.trim();
  if (t === "") return null;
  const { min, max } = LIMITES.evidenciaMedida;
  return t.length < min || t.length > max
    ? `A evidência da medida deve ter de ${min} a ${max} caracteres.`
    : null;
}

export function mensagemEvidenciaNota(texto: string): string | null {
  const { min, max } = LIMITES.evidenciaNota;
  const n = texto.trim().length;
  return n < min || n > max ? `Informe a evidência, de ${min} a ${max} caracteres.` : null;
}

export function mensagemResposta(texto: string): string | null {
  const n = texto.trim().length;
  return n < LIMITES.resposta.min
    ? `A resposta precisa ter pelo menos ${LIMITES.resposta.min} caracteres.`
    : null;
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail vazio é válido (campo opcional); preenchido precisa de formato válido. */
export function mensagemEmail(texto: string): string | null {
  const t = texto.trim();
  if (t === "") return null;
  return FORMATO_EMAIL.test(t) ? null : "Informe um e-mail válido, como nome@exemplo.com.";
}
