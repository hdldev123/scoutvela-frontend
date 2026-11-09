import { useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

export type RespostaInvestimento =
  paths["/investimento"]["get"]["responses"][200]["content"]["application/json"];

/** `GET /investimento` (chave `['investimento']`). */
export function useInvestimento() {
  return useQuery({
    queryKey: ["investimento"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/investimento");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}
