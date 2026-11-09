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

export type CorpoPlano =
  paths["/atletas/{id}/plano"]["put"]["requestBody"]["content"]["application/json"];
export type CorpoFinanceiro =
  paths["/atletas/{id}/financeiro"]["put"]["requestBody"]["content"]["application/json"];
export type CorpoResultado =
  paths["/atletas/{id}/resultados"]["post"]["requestBody"]["content"]["application/json"];

/** Gestor ou treinador registra uma nova versão do plano individual (`PUT /atletas/{id}/plano`). */
export async function registrarPlano(atletaId: string, corpo: CorpoPlano) {
  const { data, error, response } = await api.PUT("/atletas/{id}/plano", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Gestor informa o financeiro e o perfil de suporte (`PUT /atletas/{id}/financeiro`). */
export async function atualizarFinanceiro(atletaId: string, corpo: CorpoFinanceiro) {
  const { data, error, response } = await api.PUT("/atletas/{id}/financeiro", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Lança à mão um resultado internacional com link oficial (`POST /atletas/{id}/resultados`). */
export async function lancarResultado(atletaId: string, corpo: CorpoResultado) {
  const { data, error, response } = await api.POST("/atletas/{id}/resultados", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}
