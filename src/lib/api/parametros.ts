import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Parâmetros da metodologia (GET e PUT /parametros), tipados pelo contrato. */
export type Parametros =
  paths["/parametros"]["get"]["responses"][200]["content"]["application/json"];
export type CorpoParametros =
  paths["/parametros"]["put"]["requestBody"]["content"]["application/json"];

export async function buscarParametros(): Promise<Parametros> {
  const { data, error, response } = await api.GET("/parametros");
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function salvarParametros(corpo: CorpoParametros): Promise<Parametros> {
  const { data, error, response } = await api.PUT("/parametros", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export function useParametros() {
  return useQuery({ queryKey: ["parametros"], queryFn: buscarParametros });
}

/** Salva e invalida o que depende dos parâmetros (o ranking recalcula na API). */
export function useSalvarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarParametros,
    onSuccess: (novos) => {
      qc.setQueryData(["parametros"], novos);
      void qc.invalidateQueries({ queryKey: ["parametros"] });
      void qc.invalidateQueries({ queryKey: ["ranking"] });
      void qc.invalidateQueries({ queryKey: ["atleta"] });
      void qc.invalidateQueries({ queryKey: ["investimento"] });
    },
  });
}
