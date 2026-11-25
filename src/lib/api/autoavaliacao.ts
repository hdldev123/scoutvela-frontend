import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import { enviarEvidencia, removerEvidenciaOrfa } from "./evidencias";
import { invalidarNotificacoes } from "./notificacoes";
import type { paths } from "./schema";

/** Autoavaliação do atleta (D9): envio, comparação com a nota do treinador e justificativa. */

export type Autoavaliacao =
  paths["/atletas/{id}/autoavaliacao"]["get"]["responses"][200]["content"]["application/json"];
export type IndicadorAutoavaliacao = Autoavaliacao["indicadores"][number];
export type CorpoAutoavaliacao =
  paths["/autoavaliacoes"]["post"]["requestBody"]["content"]["application/json"];
export type NotaAutoavaliacao = CorpoAutoavaliacao["notas"][number];

export const MAX_JUSTIFICATIVA = 500;

/**
 * `GET /atletas/{id}/autoavaliacao` (chave `['atleta', id, 'autoavaliacao', ciclo]`). Sem `ciclo`,
 * a API devolve o aberto ou, não havendo, o último fechado. Fica sob `['atleta', id]`: gravar uma
 * avaliação a invalida junto com a ficha.
 */
export function useAutoavaliacao(atletaId: string, opcoes: { habilitado?: boolean } = {}) {
  return useQuery({
    queryKey: ["atleta", atletaId, "autoavaliacao", "atual"],
    enabled: opcoes.habilitado ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/autoavaliacao", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** `POST /autoavaliacoes`: só o atleta, com ciclo aberto (sem ciclo aberto, 409). */
export async function enviarAutoavaliacao(corpo: CorpoAutoavaliacao) {
  const { data, error, response } = await api.POST("/autoavaliacoes", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Uma nota do envio; o `arquivo` sobe antes (anexo `evidencia`, D11) e vira `anexoId`. */
export interface ItemAutoavaliacao {
  indicadorId: string;
  valor: number;
  evidencia?: string | undefined;
  link?: string | undefined;
  arquivo?: File | null | undefined;
}

/**
 * Sobe os anexos e envia as notas. Se a API recusar, os anexos recém-enviados são apagados (não
 * foram ligados a nenhuma nota). O erro 400 por campo chega com `notas.N` na ordem de `itens`.
 */
export async function enviarComAnexos(atletaId: string, itens: ItemAutoavaliacao[]) {
  const subidos: string[] = [];
  try {
    const notas: NotaAutoavaliacao[] = [];
    for (const it of itens) {
      let anexoId: string | undefined;
      if (it.arquivo) {
        const anexo = await enviarEvidencia(atletaId, it.arquivo, it.indicadorId, "evidencia");
        subidos.push(anexo.id);
        anexoId = anexo.id;
      }
      const evidencia = it.evidencia?.trim();
      const link = it.link?.trim();
      notas.push({
        indicadorId: it.indicadorId,
        valor: it.valor,
        ...(evidencia ? { evidencia } : {}),
        ...(link ? { link } : {}),
        ...(anexoId ? { anexoId } : {}),
      });
    }
    return await enviarAutoavaliacao({ notas });
  } catch (e) {
    for (const id of subidos) void removerEvidenciaOrfa(id);
    throw e;
  }
}

export function useEnviarAutoavaliacao(atletaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itens: ItemAutoavaliacao[]) => enviarComAnexos(atletaId, itens),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        qc.invalidateQueries({ queryKey: ["painel"] }),
        invalidarNotificacoes(qc),
      ]);
    },
  });
}

/** Diferença com sinal ("+1", "−2", "0"), com o sinal de menos tipográfico. */
export function textoDiferenca(d: number | null | undefined, casas = 0): string {
  if (d == null) return "—";
  const n = Number(d.toFixed(casas));
  const abs = Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs;
}

/** Leitura da diferença para leitor de tela e para a cor (sem depender só dela). */
export function leituraDiferenca(d: number | null | undefined): {
  classe: "dif-igual" | "dif-mais" | "dif-menos" | "dif-na";
  texto: string;
} {
  if (d == null) return { classe: "dif-na", texto: "sem comparação" };
  if (d === 0) return { classe: "dif-igual", texto: "notas iguais" };
  return d > 0
    ? { classe: "dif-mais", texto: "treinador deu nota maior" }
    : { classe: "dif-menos", texto: "treinador deu nota menor" };
}
