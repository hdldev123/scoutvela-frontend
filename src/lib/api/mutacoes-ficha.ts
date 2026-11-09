import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Mutações da ficha (PUT /atletas/{id}/gates e POST /revisoes), tipadas pelo contrato. */

/** Bloco `gates` da ficha (mesmo formato que o PUT devolve). */
export type GatesFicha =
  paths["/atletas/{id}/gates"]["put"]["responses"][200]["content"]["application/json"];
export type CorpoGate =
  paths["/atletas/{id}/gates"]["put"]["requestBody"]["content"]["application/json"];
export type CorpoRevisao = paths["/revisoes"]["post"]["requestBody"]["content"]["application/json"];
export type RespostaRevisao =
  paths["/revisoes"]["post"]["responses"][201]["content"]["application/json"];

/** Gestor ajusta o status de um gate (igual à sugestão automática volta ao automático). */
export async function atualizarGate(atletaId: string, corpo: CorpoGate): Promise<GatesFicha> {
  const { data, error, response } = await api.PUT("/atletas/{id}/gates", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Atleta pede revisão de uma nota (LGPD, art. 20). */
export async function criarRevisao(corpo: CorpoRevisao): Promise<RespostaRevisao> {
  const { data, error, response } = await api.POST("/revisoes", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}
