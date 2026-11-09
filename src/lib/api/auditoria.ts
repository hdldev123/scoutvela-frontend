import { useInfiniteQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Trilha de auditoria (só gestor), com paginação por cursor. */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type PaginaAuditoria = Json<paths["/auditoria"]["get"]["responses"][200]>;
export type EventoAuditoria = PaginaAuditoria["itens"][number];

export interface FiltrosAuditoria {
  acao: string;
  entidade: string;
  atletaId: string;
  desde: string;
  ate: string;
}

export const FILTROS_VAZIOS: FiltrosAuditoria = {
  acao: "",
  entidade: "",
  atletaId: "",
  desde: "",
  ate: "",
};

/** Só os filtros preenchidos entram na query. */
export function filtrosParaQuery(f: FiltrosAuditoria) {
  return {
    ...(f.acao && { acao: f.acao }),
    ...(f.entidade.trim() && { entidade: f.entidade.trim() }),
    ...(f.atletaId.trim() && { atletaId: f.atletaId.trim() }),
    ...(f.desde && { desde: f.desde }),
    ...(f.ate && { ate: f.ate }),
  };
}

export function useAuditoria(filtros: FiltrosAuditoria) {
  return useInfiniteQuery({
    queryKey: ["auditoria", filtros],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/auditoria", {
        params: {
          query: { ...filtrosParaQuery(filtros), ...(pageParam && { antesDe: pageParam }) },
        },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    getNextPageParam: (ultima) => ultima.proximo ?? undefined,
  });
}
