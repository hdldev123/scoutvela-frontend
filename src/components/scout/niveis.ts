import type { CorpoResultado } from "@/lib/api/mutacoes-ficha";

export const NIVEIS: { valor: CorpoResultado["nivel"]; rotulo: string }[] = [
  { valor: "mundial", rotulo: "Mundial" },
  { valor: "sul_americano", rotulo: "Sul-Americano" },
  { valor: "continental", rotulo: "Continental" },
  { valor: "internacional_aberto", rotulo: "Internacional aberto" },
];

/** Rótulo legível do nível (a API pode devolver o código ou o texto já pronto). */
export const rotuloNivel = (nivel: string): string =>
  NIVEIS.find((n) => n.valor === nivel)?.rotulo ?? nivel;

/** Todos os níveis aceitos no histórico (o formulário só lança os internacionais). */
const ROTULOS_HISTORICO: Record<string, string> = {
  mundial: "Mundial",
  sul_americano: "Sul-Americano",
  continental: "Continental",
  internacional_aberto: "Internacional aberto",
  brasileiro: "Brasileiro",
  estadual: "Estadual",
  regional: "Regional",
};

export const rotuloNivelHistorico = (nivel: string): string => ROTULOS_HISTORICO[nivel] ?? nivel;

export type GrupoNivel = "mundial" | "continental" | "nacional" | "outros";

export const GRUPOS_NIVEL: { valor: GrupoNivel; rotulo: string }[] = [
  { valor: "mundial", rotulo: "Mundial" },
  { valor: "continental", rotulo: "Continental" },
  { valor: "nacional", rotulo: "Nacional" },
  { valor: "outros", rotulo: "Outros" },
];

/**
 * Grupo do filtro do histórico. A API pode devolver o código (`sul_americano`) ou o texto pronto
 * ("Sul-Americano"), por isso o valor é normalizado. Outros: internacional aberto, estadual,
 * regional e o que não for reconhecido.
 */
export function grupoDoNivel(nivel: string): GrupoNivel {
  const n = nivel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "_");
  if (n === "mundial") return "mundial";
  if (n === "continental" || n === "sul_americano") return "continental";
  if (n === "brasileiro" || n === "nacional") return "nacional";
  return "outros";
}
