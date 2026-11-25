import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { enviarEvidencia, removerEvidenciaOrfa } from "./evidencias";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Resultados por evento informados pelo atleta e validados pelo treinador ou gestor (D10). */

export type ListaResultados =
  paths["/atletas/{id}/resultados"]["get"]["responses"][200]["content"]["application/json"];
export type ResultadoAtleta = ListaResultados["itens"][number];
export type StatusResultado = ResultadoAtleta["status"];
export type CorpoResultadoAtleta =
  paths["/me/resultados"]["post"]["requestBody"]["content"]["application/json"];
export type NivelResultado = CorpoResultadoAtleta["nivel"];
export type CorpoDecisaoResultado =
  paths["/resultados/{id}/validacao"]["put"]["requestBody"]["content"]["application/json"];

export const MAX_MOTIVO_RESULTADO = 300;
export const ANO_MIN_RESULTADO = 2000;

/** Níveis aceitos na API e os eventos que cada um cobre (D10, decisão E). */
export const NIVEIS_RESULTADO: readonly {
  id: NivelResultado;
  rotulo: string;
  indicadorId: string;
}[] = [
  { id: "mundial", rotulo: "Mundial (inclui Youth World)", indicadorId: "perf_mundial" },
  {
    id: "continental",
    rotulo: "Continental (Sul-Americano e Pan-Americano)",
    indicadorId: "perf_continental",
  },
  { id: "nacional", rotulo: "Nacional (Brasileiro)", indicadorId: "perf_nacional" },
];

export const INDICADORES_DE_RESULTADO: readonly string[] = NIVEIS_RESULTADO.map(
  (n) => n.indicadorId,
);

/** `GET /atletas/{id}/resultados` (chave `['atleta', id, 'resultados', status]`). IBVAR recebe 403. */
export function useResultados(atletaId: string, status?: StatusResultado, habilitado = true) {
  return useQuery({
    queryKey: ["atleta", atletaId, "resultados", status ?? "todos"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/resultados", {
        params: { path: { id: atletaId }, ...(status ? { query: { status } } : {}) },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** Uma edição para enviar; a súmula (arquivo) sobe antes e vira `anexoId`. */
export interface EdicaoParaEnviar {
  evento: string;
  nivel: NivelResultado;
  ano: number;
  posicao: number;
  tamanhoFrota?: number | undefined;
  data?: string | undefined;
  linkOficial?: string | undefined;
  sumula?: File | null | undefined;
}

/**
 * Sobe a súmula (categoria `sumula`, D11) e envia `POST /me/resultados`. Se a API recusar (400
 * ou 409), o anexo recém-enviado é apagado: ficaria órfão.
 */
export function useEnviarResultado(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: EdicaoParaEnviar) => {
      const anexo = v.sumula
        ? await enviarEvidencia(atletaId, v.sumula, undefined, "sumula")
        : null;
      const corpo: CorpoResultadoAtleta = {
        evento: v.evento,
        nivel: v.nivel,
        ano: v.ano,
        posicao: v.posicao,
        ...(v.tamanhoFrota !== undefined ? { tamanhoFrota: v.tamanhoFrota } : {}),
        ...(v.data ? { data: v.data } : {}),
        ...(anexo ? { anexoId: anexo.id } : {}),
        ...(v.linkOficial ? { linkOficial: v.linkOficial } : {}),
      };
      const { data, error, response } = await api.POST("/me/resultados", { body: corpo });
      if (error || !data) {
        if (anexo) void removerEvidenciaOrfa(anexo.id);
        throw paraErroApi(response.status, error);
      }
      return data;
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        qc.invalidateQueries({ queryKey: ["painel"] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}

/** `PUT /resultados/{id}/validacao`: treinador do atleta ou gestor. Mexe na nota, nos gates e no score. */
export function useDecidirResultado(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string } & CorpoDecisaoResultado) => {
      const { id, ...corpo } = v;
      const { data, error, response } = await api.PUT("/resultados/{id}/validacao", {
        params: { path: { id } },
        body: corpo,
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["ranking"] }),
        qc.invalidateQueries({ queryKey: ["investimento"] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}

export const ROTULO_STATUS_RESULTADO: Record<StatusResultado, { rotulo: string; classe: string }> =
  {
    pendente: { rotulo: "Aguardando validação", classe: "st-cond" },
    validado: { rotulo: "Validado", classe: "st-apto" },
    recusado: { rotulo: "Recusado", classe: "st-alerta" },
  };

export const ROTULO_FONTE_RESULTADO: Record<ResultadoAtleta["fonte"], string> = {
  ranking_cbvela: "Ranking CBVela",
  manual: "Lançado pela equipe",
  atleta: "Informado pelo atleta",
};
