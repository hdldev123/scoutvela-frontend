import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { enviarEvidencia, removerEvidenciaOrfa } from "./evidencias";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Conquistas do atleta: pódios automáticos e conquistas manuais com comprovante (D14). */

export type ListaConquistas =
  paths["/atletas/{id}/conquistas"]["get"]["responses"][200]["content"]["application/json"];
export type ConquistaFicha = ListaConquistas["automaticas"][number];
export type ConquistaManual = ListaConquistas["manuais"][number];
export type StatusConquista = ConquistaManual["status"];
export type CorpoConquista =
  paths["/me/conquistas"]["post"]["requestBody"]["content"]["application/json"];
export type CorpoDecisaoConquista =
  paths["/conquistas/{id}/validacao"]["put"]["requestBody"]["content"]["application/json"];

export const MAX_BIO = 500;
export const MAX_MOTIVO_CONQUISTA = 300;
export const TITULO_CONQUISTA = { min: 2, max: 120 } as const;
export const ANO_MIN_CONQUISTA = 1950;

export const ROTULO_STATUS_CONQUISTA: Record<StatusConquista, { rotulo: string; classe: string }> =
  {
    pendente: { rotulo: "Aguardando validação", classe: "st-cond" },
    validada: { rotulo: "Validada", classe: "st-apto" },
    recusada: { rotulo: "Recusada", classe: "st-alerta" },
  };

/** `GET /atletas/{id}/conquistas` (chave `['atleta', id, 'conquistas']`). IBVAR recebe 403. */
export function useConquistas(atletaId: string, habilitado = true) {
  return useQuery({
    queryKey: ["atleta", atletaId, "conquistas"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/conquistas", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/**
 * Sobe o comprovante (categoria `evidencia`, D11) e envia `POST /me/conquistas`. Se a API
 * recusar, o anexo recém-enviado é apagado: ficaria órfão.
 */
export function useRegistrarConquista(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { titulo: string; ano: number; comprovante: File }) => {
      const anexo = await enviarEvidencia(atletaId, v.comprovante, undefined, "evidencia");
      const corpo: CorpoConquista = { titulo: v.titulo, ano: v.ano, anexoId: anexo.id };
      const { data, error, response } = await api.POST("/me/conquistas", { body: corpo });
      if (error || !data) {
        void removerEvidenciaOrfa(anexo.id);
        throw paraErroApi(response.status, error);
      }
      return data;
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}

/** `PUT /conquistas/{id}/validacao`: treinador do atleta ou gestor. A decisão é definitiva. */
export function useDecidirConquista(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string } & CorpoDecisaoConquista) => {
      const { id, ...corpo } = v;
      const { data, error, response } = await api.PUT("/conquistas/{id}/validacao", {
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
        invalidarNotificacoes(qc),
      ]);
    },
  });
}
