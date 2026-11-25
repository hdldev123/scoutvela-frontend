import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Sugestões do treinador ao gestor (D7), tipadas pelo contrato. */
export type Sugestao =
  paths["/sugestoes"]["get"]["responses"][200]["content"]["application/json"]["itens"][number];
export type StatusSugestao = Sugestao["status"];
export type TipoSugestao = Sugestao["tipo"];
export type CorpoSugestao =
  paths["/sugestoes"]["post"]["requestBody"]["content"]["application/json"];
export type CorpoResposta =
  paths["/sugestoes/{id}"]["put"]["requestBody"]["content"]["application/json"];

export const ROTULO_TIPO_SUGESTAO: Record<TipoSugestao, string> = {
  class_fit: "Class Fit",
  parametro: "Parâmetro",
  sistema: "Sistema",
};

export const ROTULO_STATUS_SUGESTAO: Record<StatusSugestao, string> = {
  aberta: "Aberta",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

/** Máximo de sugestões abertas por autor (a API responde 409 acima disso). */
export const LIMITE_SUGESTOES_ABERTAS = 10;
export const MAX_TEXTO_SUGESTAO = 1000;

export async function enviarSugestao(corpo: CorpoSugestao): Promise<Sugestao> {
  const { data, error, response } = await api.POST("/sugestoes", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function responderSugestao(id: string, corpo: CorpoResposta): Promise<Sugestao> {
  const { data, error, response } = await api.PUT("/sugestoes/{id}", {
    params: { path: { id } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** `GET /sugestoes` (chave `['sugestoes', status]`); `status` undefined = todas. */
export function useSugestoes(status: StatusSugestao | undefined) {
  return useQuery({
    queryKey: ["sugestoes", status ?? "todas"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/sugestoes", {
        params: { query: status ? { status } : {} },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data.itens;
    },
  });
}

export function useEnviarSugestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enviarSugestao,
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ["sugestoes"] }), invalidarNotificacoes(qc)]),
  });
}

export function useResponderSugestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string } & CorpoResposta) => {
      const { id, ...corpo } = v;
      return responderSugestao(id, corpo);
    },
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ["sugestoes"] }), invalidarNotificacoes(qc)]),
  });
}
