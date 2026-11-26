import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Importação do perfil World Sailing pelo WS ID (D19). */

export type SecaoWorldSailing =
  paths["/atletas/{id}/world-sailing"]["get"]["responses"][200]["content"]["application/json"];
export type PontoRanking = SecaoWorldSailing["ranking"][number];
export type ResumoWorldSailing =
  paths["/atletas/{id}/world-sailing"]["post"]["responses"][200]["content"]["application/json"];
export type StatusWorldSailing = ResumoWorldSailing["status"];

/** `GET /atletas/{id}/world-sailing`: gestor, treinador do atleta e o próprio atleta (IBVAR: 403). */
export function useSecaoWorldSailing(atletaId: string, habilitado = true) {
  return useQuery({
    queryKey: ["atleta", atletaId, "world-sailing"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/world-sailing", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `POST /atletas/{id}/world-sailing`: busca de novo. A ficha, os resultados e a seção são refeitos. */
export function useAtualizarWorldSailing(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST("/atletas/{id}/world-sailing", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["ranking"] }),
        qc.invalidateQueries({ queryKey: ["investimento"] }),
      ]);
    },
  });
}

export type MedidaSugerida = NonNullable<SecaoWorldSailing["medidaSugerida"]>;
export type DecisaoMedida =
  paths["/atletas/{id}/world-sailing/medida"]["post"]["requestBody"]["content"]["application/json"]["decisao"];

/** `POST /atletas/{id}/world-sailing/medida` (D20): gestor e treinador usam ou dispensam a sugestão. */
export function useDecidirMedidaWorldSailing(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (decisao: DecisaoMedida) => {
      const { data, error, response } = await api.POST("/atletas/{id}/world-sailing/medida", {
        params: { path: { id: atletaId } },
        body: { decisao },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    // Refaz a ficha (Class Fit, G1, score) e a seção World Sailing, que é filha da mesma chave.
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["ranking"] }),
        qc.invalidateQueries({ queryKey: ["investimento"] }),
      ]);
    },
  });
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Frase do resultado de uma busca (cadastro e botão "Atualizar"). */
export function resumoDaBusca(r: ResumoWorldSailing): string {
  switch (r.status) {
    case "ok":
      return r.resultadosNovos === 0 && r.rankingNovos === 0
        ? "World Sailing: nada novo desde a última busca."
        : `Importados da World Sailing: ${plural(r.resultadosNovos, "resultado", "resultados")} e ${plural(r.rankingNovos, "posição de ranking", "posições de ranking")}.`;
    case "nao_encontrado":
      return "World Sailing: o ID não foi encontrado no site da World Sailing. Confira o ID e tente atualizar depois.";
    case "falhou":
      return "World Sailing: a busca falhou agora e nada foi importado. Tente atualizar mais tarde.";
    case "desligado":
      return "World Sailing: a importação está desligada neste ambiente.";
  }
}

export const ROTULO_STATUS_BUSCA: Record<"ok" | "nao_encontrado" | "falhou", string> = {
  ok: "Importado",
  nao_encontrado: "ID não encontrado na World Sailing",
  falhou: "Falhou na última tentativa",
};

/** Rótulo "Classe · Tipo" da série de ranking. */
export const rotuloSerie = (classe: string, tipo: string | null): string =>
  tipo ? `${classe} · ${tipo}` : classe;

export interface SerieRanking {
  chave: string;
  rotulo: string;
  /** Do mais antigo ao mais novo. */
  pontos: PontoRanking[];
}

/** Agrupa o ranking (vem do mais recente ao mais antigo) por classe e tipo, em ordem cronológica. */
export function seriesDoRanking(ranking: PontoRanking[]): SerieRanking[] {
  const mapa = new Map<string, SerieRanking>();
  for (const p of ranking) {
    const chave = `${p.classe}\u0000${p.tipo ?? ""}`;
    const serie = mapa.get(chave) ?? { chave, rotulo: rotuloSerie(p.classe, p.tipo), pontos: [] };
    serie.pontos.push(p);
    mapa.set(chave, serie);
  }
  return [...mapa.values()]
    .map((s) => ({ ...s, pontos: [...s.pontos].sort((a, b) => a.data.localeCompare(b.data)) }))
    .sort((a, b) => b.pontos.length - a.pontos.length || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
