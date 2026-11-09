import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Ciclos de avaliação (abrir, ajustar prazo, fechar), tipados pelo contrato. */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Ciclo = Json<paths["/ciclos"]["get"]["responses"][200]>["itens"][number];
export type CorpoAbrirCiclo =
  paths["/ciclos"]["post"]["requestBody"]["content"]["application/json"];
export type ResultadoFechamento = Json<paths["/ciclos/{id}/fechar"]["post"]["responses"][200]>;

export async function abrirCiclo(corpo: CorpoAbrirCiclo): Promise<Ciclo> {
  const { data, error, response } = await api.POST("/ciclos", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function ajustarPrazo(id: string, prazo: string): Promise<Ciclo> {
  const { data, error, response } = await api.PUT("/ciclos/{id}", {
    params: { path: { id } },
    body: { prazo },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function fecharCiclo(id: string): Promise<ResultadoFechamento> {
  const { data, error, response } = await api.POST("/ciclos/{id}/fechar", {
    params: { path: { id } },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Score, faixa, ranking, ficha, painel do atleta e investimento dependem do ciclo. */
async function invalidarDependentes(qc: QueryClient) {
  await Promise.all(
    ["ciclos", "ranking", "atleta", "painel", "investimento"].map((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    ),
  );
}

export function useCiclos() {
  return useQuery({
    queryKey: ["ciclos"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/ciclos");
      if (error || !data) throw paraErroApi(response.status, error);
      return data.itens;
    },
  });
}

export function useAbrirCiclo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: abrirCiclo, onSuccess: () => invalidarDependentes(qc) });
}

export function useAjustarPrazo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; prazo: string }) => ajustarPrazo(v.id, v.prazo),
    onSuccess: () => invalidarDependentes(qc),
  });
}

export function useFecharCiclo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fecharCiclo, onSuccess: () => invalidarDependentes(qc) });
}
