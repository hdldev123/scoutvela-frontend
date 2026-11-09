import { useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Painel do atleta: GET /painel, GET /revisoes, POST /respostas e PUT /consentimento. */

export type PainelAtleta = paths["/painel"]["get"]["responses"][200]["content"]["application/json"];
export type ModuloPainel = PainelAtleta["modulos"][number];
export type PerguntaPainel = ModuloPainel["perguntas"][number];
export type ConsentimentoPainel = PainelAtleta["consentimento"];
export type CorpoResposta =
  paths["/respostas"]["post"]["requestBody"]["content"]["application/json"];
export type RespostaCriada =
  paths["/respostas"]["post"]["responses"][201]["content"]["application/json"];
export type PedidoRevisao =
  paths["/revisoes"]["get"]["responses"][200]["content"]["application/json"][number];

/** `GET /painel` (chave `['painel']`). */
export function usePainel() {
  return useQuery({
    queryKey: ["painel"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/painel");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `GET /revisoes` (chave `['revisoes']`); para o atleta, só os pedidos dele. */
export function useRevisoes() {
  return useQuery({
    queryKey: ["revisoes"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/revisoes");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** Atleta responde uma pergunta do questionário. */
export async function responderPergunta(corpo: CorpoResposta): Promise<RespostaCriada> {
  const { data, error, response } = await api.POST("/respostas", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Atleta concede ou retira o compartilhamento do score com o IBVAR. */
export async function alterarConsentimento(
  compartilharIbvar: boolean,
): Promise<ConsentimentoPainel> {
  const { data, error, response } = await api.PUT("/consentimento", {
    body: { compartilharIbvar },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}
