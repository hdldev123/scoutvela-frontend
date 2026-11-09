import { useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Consultas e mutações da tela Lançar avaliação, tipadas pelo contrato. */

export type Parametros =
  paths["/parametros"]["get"]["responses"][200]["content"]["application/json"];
export type CorpoAvaliacao =
  paths["/atletas/{id}/avaliacoes"]["post"]["requestBody"]["content"]["application/json"];
export type RespostaPrevia =
  paths["/atletas/{id}/avaliacoes/previa"]["post"]["responses"][200]["content"]["application/json"];
export type RespostaLancamento =
  paths["/atletas/{id}/avaliacoes"]["post"]["responses"][201]["content"]["application/json"];

/** `GET /parametros` (chave `['parametros']`): escala, rubricas e evidência padrão. */
export function useParametros() {
  return useQuery({
    queryKey: ["parametros"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parametros");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `POST /atletas/{id}/avaliacoes/previa`: score antes e depois, sem gravar. */
export async function preverAvaliacao(
  atletaId: string,
  corpo: CorpoAvaliacao,
): Promise<RespostaPrevia> {
  const { data, error, response } = await api.POST("/atletas/{id}/avaliacoes/previa", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** `POST /atletas/{id}/avaliacoes`: grava as notas (série histórica, só insere). */
export async function lancarAvaliacao(
  atletaId: string,
  corpo: CorpoAvaliacao,
): Promise<RespostaLancamento> {
  const { data, error, response } = await api.POST("/atletas/{id}/avaliacoes", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}
