import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Termo vigente, aceite, exportação de dados e pedidos do titular (LGPD). */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Termo = Json<paths["/termo"]["get"]["responses"][200]>;
export type PedidoTitular = Json<paths["/pedidos-titular"]["get"]["responses"][200]>[number];
export type CorpoPedidoTitular =
  paths["/pedidos-titular"]["post"]["requestBody"]["content"]["application/json"];
export type TipoPedidoTitular = CorpoPedidoTitular["tipo"];

/** `GET /termo` (chave `['termo']`): texto e versão vigentes. */
export function useTermo(opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["termo"],
    enabled: opcoes.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/termo");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** O atleta aceita a versão vigente do termo. */
export function useAceitarTermo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versao: string) => {
      const { error, response } = await api.POST("/termo/aceite", { body: { versao } });
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["painel"] }),
        qc.invalidateQueries({ queryKey: ["me"] }),
      ]);
    },
  });
}

/** `GET /meus-dados`: exportação dos dados do próprio titular. */
export async function buscarMeusDados() {
  const { data, error, response } = await api.GET("/meus-dados");
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Baixa o objeto como arquivo JSON no navegador. */
export function baixarJson(nome: string, dados: unknown) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function usePedidosTitular() {
  return useQuery({
    queryKey: ["pedidos-titular"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/pedidos-titular");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

export function useCriarPedidoTitular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoPedidoTitular) => {
      const { data, error, response } = await api.POST("/pedidos-titular", { body: corpo });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos-titular"] }),
  });
}
