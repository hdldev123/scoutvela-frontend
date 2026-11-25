import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

export type RespostaInvestimento =
  paths["/investimento"]["get"]["responses"][200]["content"]["application/json"];

/**
 * `GET /investimento` (chave `['investimento', ciclo]`). Sem `ciclo`, a API abre no último ciclo
 * fechado. Ao trocar de ciclo, a tela anterior fica até a nova chegar (o seletor não some).
 */
export function useInvestimento(ciclo?: string) {
  return useQuery({
    queryKey: ["investimento", ciclo ?? null],
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, response } = await (ciclo
        ? api.GET("/investimento", { params: { query: { ciclo } } })
        : api.GET("/investimento"));
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}
