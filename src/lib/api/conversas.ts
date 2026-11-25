import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Chat (D16), tipado pelo contrato. O texto das mensagens é sempre texto puro. */
type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Conversa = Json<paths["/conversas"]["get"]["responses"][200]>["itens"][number];
export type TipoConversa = Conversa["tipo"];
export type ListaMensagens = Json<paths["/conversas/{id}/mensagens"]["get"]["responses"][200]>;
export type Mensagem = ListaMensagens["itens"][number];
export type CorpoConversa =
  paths["/conversas"]["post"]["requestBody"]["content"]["application/json"];
export type ResultadoConversa = { conversa: Conversa; criada: boolean };

export const MAX_MENSAGEM = 2000;
/** Consulta de mensagens novas, com a conversa aberta e a aba visível. */
export const INTERVALO_POLLING_MS = 15_000;
export const LIMITE_MENSAGENS = 50;

const CHAVE = ["conversas"] as const;
const chaveLista = (supervisao: boolean) => [...CHAVE, "lista", supervisao] as const;

/** `GET /conversas`; com `supervisao`, as `treinador_atleta` só com metadados (só gestor). */
export function useConversas(supervisao = false, habilitado = true) {
  return useQuery({
    queryKey: chaveLista(supervisao),
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/conversas", {
        params: { query: supervisao ? { supervisao: "true" } : {} },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data.itens;
    },
  });
}

export async function buscarMensagens(
  id: string,
  query: { depoisDe?: string; antesDe?: string; limite?: number },
): Promise<ListaMensagens> {
  const { data, error, response } = await api.GET("/conversas/{id}/mensagens", {
    params: { path: { id }, query },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export function useAbrirConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoConversa): Promise<ResultadoConversa> => {
      const { data, error, response } = await api.POST("/conversas", { body: corpo });
      if (error || !data) throw paraErroApi(response.status, error);
      return { conversa: data, criada: response.status === 201 };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export async function enviarMensagem(id: string, texto: string): Promise<Mensagem> {
  const { data, error, response } = await api.POST("/conversas/{id}/mensagens", {
    params: { path: { id } },
    body: { texto },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** `PUT /conversas/{id}/lidas`: atualiza a lista e o balão do menu. Falha em silêncio. */
export async function marcarConversaLida(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
): Promise<void> {
  try {
    const { error } = await api.PUT("/conversas/{id}/lidas", { params: { path: { id } } });
    if (error) return;
  } catch {
    return;
  }
  await Promise.all([
    qc.invalidateQueries({ queryKey: [...CHAVE, "lista"] }),
    qc.invalidateQueries({ queryKey: ["avisos"] }),
    invalidarNotificacoes(qc),
  ]);
}

export function useAcessoSupervisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error, response } = await api.POST("/conversas/{id}/acesso-supervisao", {
        params: { path: { id } },
        body: { motivo },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CHAVE, "lista"] }),
  });
}

/** Atualiza a lista depois de enviar (ordem e última atividade). */
export function useInvalidarListaConversas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [...CHAVE, "lista"] });
}
