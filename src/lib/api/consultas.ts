import { useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

export type FiltrosRanking = NonNullable<paths["/ranking"]["get"]["parameters"]["query"]>;
export type RespostaRanking =
  paths["/ranking"]["get"]["responses"][200]["content"]["application/json"];
export type ItemRanking = RespostaRanking["itens"][number];
export type FichaAtleta =
  paths["/atletas/{id}"]["get"]["responses"][200]["content"]["application/json"];

/** Remove filtros vazios para que `{}` e `{ classe: undefined }` compartilhem a mesma chave. */
export function filtrosLimpos(filtros: FiltrosRanking): FiltrosRanking {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ""),
  ) as FiltrosRanking;
}

/** `GET /ranking` (chave `['ranking', filtros]`). */
export function useRanking(filtros: FiltrosRanking = {}, opcoes: { enabled?: boolean } = {}) {
  const query = filtrosLimpos(filtros);
  return useQuery({
    queryKey: ["ranking", query],
    enabled: opcoes.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/ranking", { params: { query } });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `GET /atletas/{id}` (chave `['atleta', id]`). */
export function useFicha(id: string) {
  return useQuery({
    queryKey: ["atleta", id],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}", {
        params: { path: { id } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}
