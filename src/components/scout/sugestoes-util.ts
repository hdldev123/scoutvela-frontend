import type { Sugestao } from "@/lib/api/sugestoes";

/** Search de `/parametros` que abre o Class Fit com a proposta preenchida. */
export function buscaDaProposta(
  s: Sugestao,
): { classe: string; min: number; med: number; max: number } | null {
  if (s.tipo !== "class_fit" || !s.classe || !s.proposta) return null;
  return {
    classe: s.classe.id,
    min: s.proposta.pesoMinKg,
    med: s.proposta.pesoMedioKg,
    max: s.proposta.pesoMaxKg,
  };
}
