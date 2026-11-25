import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { enviarEvidencia, removerEvidenciaOrfa } from "./evidencias";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Peso informado pelo atleta com a foto do visor da balança (D9). */

export type ListaPesagens =
  paths["/atletas/{id}/pesagens"]["get"]["responses"][200]["content"]["application/json"];
export type Pesagem = ListaPesagens["itens"][number];
export type CorpoDecisaoPesagem =
  paths["/pesagens/{id}/validacao"]["put"]["requestBody"]["content"]["application/json"];

export const MAX_MOTIVO_PESAGEM = 300;

/** `GET /atletas/{id}/pesagens` (chave `['atleta', id, 'pesagens']`). IBVAR recebe 403. */
export function usePesagens(atletaId: string, habilitado = true) {
  return useQuery({
    queryKey: ["atleta", atletaId, "pesagens"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/pesagens", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/**
 * Envia a foto do visor (anexo `balanca`, D11) e depois `POST /me/pesagens`. Se a pesagem for
 * recusada pela API (400 ou 409), o anexo recém-enviado é apagado: ficaria órfão.
 */
export function useEnviarPesagem(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { pesoKg: number; foto: File }) => {
      const anexo = await enviarEvidencia(atletaId, v.foto, undefined, "balanca");
      const { data, error, response } = await api.POST("/me/pesagens", {
        body: { pesoKg: v.pesoKg, anexoId: anexo.id },
      });
      if (error || !data) {
        void removerEvidenciaOrfa(anexo.id);
        throw paraErroApi(response.status, error);
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId, "pesagens"] }),
        qc.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}

/** `PUT /pesagens/{id}/validacao`: treinador do atleta ou gestor. Validar muda o Class Fit. */
export function useDecidirPesagem(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string } & CorpoDecisaoPesagem) => {
      const { id, ...corpo } = v;
      const { data, error, response } = await api.PUT("/pesagens/{id}/validacao", {
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
        qc.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}
