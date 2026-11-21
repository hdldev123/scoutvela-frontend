import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Termo vigente, aceite, exportação de dados e pedidos do titular (LGPD). */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Termo = Json<paths["/termo"]["get"]["responses"][200]>;
export type TermoProxima = Json<paths["/termo/proxima"]["get"]["responses"][200]>;
export type PedidoTitular = Json<paths["/pedidos-titular"]["get"]["responses"][200]>[number];
export type CorpoPedidoTitular =
  paths["/pedidos-titular"]["post"]["requestBody"]["content"]["application/json"];
export type TipoPedidoTitular = CorpoPedidoTitular["tipo"];
export type ResultadoAnonimizacao = Json<
  paths["/atletas/{id}/anonimizar"]["post"]["responses"][200]
>;

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

/**
 * `GET /termo/proxima` (chave `['termo', 'proxima']`): próxima versão publicada, ainda sem
 * vigência. A API responde 404 quando não há; aqui isso vira `null`.
 */
export function useTermoProxima(opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["termo", "proxima"],
    enabled: opcoes.enabled ?? true,
    retry: false,
    queryFn: async (): Promise<TermoProxima | null> => {
      const { data, error, response } = await api.GET("/termo/proxima");
      if (response.status === 404) return null;
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** O atleta aceita a versão vigente do termo, ou a próxima publicada (aceite antecipado). */
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
        qc.invalidateQueries({ queryKey: ["termo"] }),
        invalidarNotificacoes(qc),
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
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["pedidos-titular"] }),
        invalidarNotificacoes(qc),
      ]),
  });
}

/**
 * `POST /atletas/{id}/anonimizar`: anonimiza o atleta a pedido de exclusão. Repetir com o mesmo
 * pedido só tenta de novo as pendências (arquivos e conta).
 */
export function useAnonimizarAtleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { atletaId: string; pedidoTitularId: string }) => {
      const { data, error, response } = await api.POST("/atletas/{id}/anonimizar", {
        params: { path: { id: v.atletaId } },
        body: { pedidoTitularId: v.pedidoTitularId, confirmacao: "ANONIMIZAR" },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["pedidos-titular"] }),
        qc.invalidateQueries({ queryKey: ["revisoes"] }),
        qc.invalidateQueries({ queryKey: ["usuarios"] }),
        qc.invalidateQueries({ queryKey: ["atletas-gestao"] }),
        qc.invalidateQueries({ queryKey: ["atletas"] }),
        qc.invalidateQueries({ queryKey: ["atleta"] }),
        qc.invalidateQueries({ queryKey: ["ranking"] }),
        qc.invalidateQueries({ queryKey: ["investimento"] }),
        invalidarNotificacoes(qc),
      ]),
  });
}
