import type { Revisao } from "@/lib/api/revisoes";

type Papel = "gestor" | "treinador";

/** Rótulo de quem respondeu, para o gestor e o treinador. */
export const rotuloPapel = (papel: Papel): string =>
  papel === "treinador" ? "Treinador" : "Gestor";

/** Mesmo papel, para o atleta ("Gestão da CBVela"). */
export const rotuloPapelAtleta = (papel: Papel): string =>
  papel === "treinador" ? "Treinador" : "Gestão da CBVela";

/** Andamento do pedido em texto, mostrado ao atleta e ao gestor. */
export function andamentoRevisao(
  r: Pick<Revisao, "status" | "instancia" | "primeiraResposta">,
): string {
  if (r.instancia === 2) {
    return r.status === "aberto"
      ? "Em análise pela gestão (2ª instância)"
      : "Resposta final da gestão";
  }
  if (r.status === "aberto") return "Aguardando resposta";
  return r.primeiraResposta?.papel === "gestor"
    ? "Respondido pela gestão"
    : "Respondido pelo treinador";
}
