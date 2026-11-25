import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Avisos do sino e pedidos de ajuste (D8), tipados pelo contrato. */
type ListaAvisos = paths["/me/avisos"]["get"]["responses"][200]["content"]["application/json"];
export type Aviso = ListaAvisos["itens"][number];
export type TipoAviso = Aviso["tipo"];
export type CorpoPedidoAjuste =
  paths["/atletas/{id}/pedidos-ajuste"]["post"]["requestBody"]["content"]["application/json"];
export type RespostaPedidoAjuste =
  paths["/atletas/{id}/pedidos-ajuste"]["post"]["responses"][201]["content"]["application/json"];

/** Itens por página do sino. */
export const LIMITE_AVISOS = 20;
export const MAX_MENSAGEM_AJUSTE = 300;

const CHAVE_AVISOS = ["avisos"] as const;

async function buscarAvisos(query: {
  apenasNaoLidos?: "true" | "false";
  limite?: number;
  antesDe?: string;
}): Promise<ListaAvisos> {
  const { data, error, response } = await api.GET("/me/avisos", { params: { query } });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/**
 * Lista do sino, do mais novo ao mais antigo, paginada por `proximoAntesDe`. Só consulta com o
 * painel aberto (`habilitado`); a contagem do sino vem de `GET /me/notificacoes` (chave `avisos`).
 */
export function useAvisos(habilitado: boolean) {
  return useInfiniteQuery({
    queryKey: [...CHAVE_AVISOS, "lista"],
    enabled: habilitado,
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      buscarAvisos({ limite: LIMITE_AVISOS, ...(pageParam ? { antesDe: pageParam } : {}) }),
    getNextPageParam: (ultima) => ultima.proximoAntesDe ?? undefined,
  });
}

/** Pedidos de ajuste ainda não lidos, para o destaque no painel do atleta. */
export function usePedidosDeAjuste(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_AVISOS, "pedidos-ajuste"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const lista = await buscarAvisos({ apenasNaoLidos: "true", limite: 100 });
      return (lista.itens ?? []).filter((a) => a.tipo === "pedido_ajuste");
    },
  });
}

function useInvalidarAvisos() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: CHAVE_AVISOS }), invalidarNotificacoes(qc)]);
}

export function useMarcarAvisoLido() {
  const invalidar = useInvalidarAvisos();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.PUT("/me/avisos/{id}/lido", {
        params: { path: { id } },
      });
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: invalidar,
  });
}

export function useMarcarTodosLidos() {
  const invalidar = useInvalidarAvisos();
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.PUT("/me/avisos/lidos");
      if (error || !data) throw paraErroApi(response.status, error);
      return data.marcados;
    },
    onSuccess: invalidar,
  });
}

export async function criarPedidoAjuste(
  atletaId: string,
  corpo: CorpoPedidoAjuste,
): Promise<RespostaPedidoAjuste> {
  const { data, error, response } = await api.POST("/atletas/{id}/pedidos-ajuste", {
    params: { path: { id: atletaId } },
    body: corpo,
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export function useCriarPedidoAjuste(atletaId: string) {
  return useMutation({
    mutationFn: (corpo: CorpoPedidoAjuste) => criarPedidoAjuste(atletaId, corpo),
  });
}
