import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";

/** Balões do menu lateral (`GET /me/notificacoes`), chave `['notificacoes']`. */
export const CHAVE_NOTIFICACOES = ["notificacoes"] as const;

/**
 * Atualiza a cada 60 s e ao voltar o foco. `habilitado` fica falso para o IBVAR e sem sessão.
 * Erro de rede não aparece: sem dados, os balões só somem.
 */
export function useNotificacoes(habilitado: boolean) {
  return useQuery({
    queryKey: CHAVE_NOTIFICACOES,
    enabled: habilitado,
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/me/notificacoes");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** Helper único: chamar no `onSuccess` das ações que mudam as contagens. */
export function invalidarNotificacoes(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ queryKey: CHAVE_NOTIFICACOES });
}

/** Marca a tela como vista (zera as respostas novas). Falha em silêncio. */
export async function marcarPainelVisto(qc: QueryClient): Promise<void> {
  try {
    await api.PUT("/me/notificacoes/vistas", { body: { chave: "painel" } });
  } catch {
    return;
  }
  await invalidarNotificacoes(qc);
}
