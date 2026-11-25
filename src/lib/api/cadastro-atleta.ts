import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Primeiro acesso do atleta: `PUT /me/cadastro` (nome, gênero e data de nascimento, uma vez). */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type CorpoCadastroAtleta =
  paths["/me/cadastro"]["put"]["requestBody"]["content"]["application/json"];
export type CadastroCompletado = Json<paths["/me/cadastro"]["put"]["responses"][200]>;

export async function completarCadastro(corpo: CorpoCadastroAtleta): Promise<CadastroCompletado> {
  const { data, error, response } = await api.PUT("/me/cadastro", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/**
 * Sucesso: `["me"]` muda (sem `cadastroPendente`) e o layout segue para o painel. O perfil, o
 * painel e a ficha do atleta passam a existir, então também são refeitos.
 */
export function useCompletarCadastro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completarCadastro,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["me"] }),
        qc.invalidateQueries({ queryKey: ["perfil"] }),
        qc.invalidateQueries({ queryKey: ["painel"] }),
        qc.invalidateQueries({ queryKey: ["atleta"] }),
      ]),
  });
}

/** O 400 de menor de 18 anos não traz campos: a mensagem fala em "18 anos ou mais". */
export function ehRecusaDeMenor(erro: unknown): boolean {
  return (
    !!erro &&
    typeof erro === "object" &&
    "status" in erro &&
    erro.status === 400 &&
    "campos" in erro &&
    Array.isArray(erro.campos) &&
    erro.campos.length === 0 &&
    "message" in erro &&
    typeof erro.message === "string" &&
    /18 anos ou mais/.test(erro.message)
  );
}
