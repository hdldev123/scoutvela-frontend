import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Versões do termo de consentimento (gestor), tipadas pelo contrato. */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type VersaoTermo = Json<paths["/termos"]["get"]["responses"][200]>[number];
export type CorpoNovoTermo = paths["/termos"]["post"]["requestBody"]["content"]["application/json"];

/** `GET /termos` (chave `['termos']`). */
export function useTermos(opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["termos"],
    enabled: opcoes.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/termos");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `POST /termos`: publica uma nova versão e invalida o que depende dela. */
export function usePublicarTermo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoNovoTermo) => {
      const { error, response } = await api.POST("/termos", { body: corpo });
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["termos"] }),
        qc.invalidateQueries({ queryKey: ["termo"] }),
        qc.invalidateQueries({ queryKey: ["atletas", "pendentes"] }),
      ]),
  });
}

/** `datetime-local` ("2026-12-01T09:00") para ISO com o offset do navegador. */
export function localParaIso(local: string): string {
  const d = new Date(local);
  const p = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? "+" : "-";
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sinal}${p(Math.trunc(off / 60))}:${p(off % 60)}`
  );
}
