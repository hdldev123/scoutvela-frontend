import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Pedidos de revisão de nota e pedidos do titular (LGPD), tipados pelo contrato. */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Revisao = Json<paths["/revisoes"]["get"]["responses"][200]>[number];
export type PedidoTitular = Json<paths["/pedidos-titular"]["get"]["responses"][200]>[number];
export type TipoPedido = PedidoTitular["tipo"];
export type StatusRevisao = "aberto" | "respondido";

export type LancamentoRevisao = Json<
  paths["/revisoes/{id}/lancamentos"]["get"]["responses"][200]
>["lancamentos"][number];

/** `avaliacaoId` (opcional) liga a resposta ao lançamento que corrigiu a nota. */
export async function responderRevisao(
  id: string,
  resposta: string,
  avaliacaoId?: string,
): Promise<Revisao> {
  const { data, error, response } = await api.PUT("/revisoes/{id}", {
    params: { path: { id } },
    body: avaliacaoId ? { resposta, avaliacaoId } : { resposta },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function responderPedidoTitular(id: string, resposta: string): Promise<PedidoTitular> {
  const { data, error, response } = await api.PUT("/pedidos-titular/{id}", {
    params: { path: { id } },
    body: { resposta },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** `status` undefined = todos. */
export function useRevisoes(status: StatusRevisao | undefined) {
  return useQuery({
    queryKey: ["revisoes", status ?? "todos"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/revisoes", {
        params: { query: status ? { status } : {} },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

export function usePedidosTitular(habilitado: boolean) {
  return useQuery({
    queryKey: ["pedidos-titular"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/pedidos-titular");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `GET /revisoes/{id}/lancamentos` (chave `['revisao-lancamentos', id]`); só com o diálogo aberto. */
export function useLancamentosRevisao(id: string | undefined) {
  return useQuery({
    queryKey: ["revisao-lancamentos", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/revisoes/{id}/lancamentos", {
        params: { path: { id: id! } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data.lancamentos;
    },
  });
}

export function useResponderRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; resposta: string; avaliacaoId?: string }) =>
      responderRevisao(v.id, v.resposta, v.avaliacaoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revisoes"] }),
  });
}

export function useResponderPedidoTitular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; resposta: string }) => responderPedidoTitular(v.id, v.resposta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos-titular"] }),
  });
}
