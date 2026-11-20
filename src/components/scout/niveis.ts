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
