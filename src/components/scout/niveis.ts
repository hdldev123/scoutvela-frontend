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
