import { useQuery } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Evidências anexadas (Storage privado, links assinados), tipadas pelo contrato. */

export type CorpoEvidencia =
  paths["/atletas/{id}/evidencias"]["post"]["requestBody"]["content"]["application/json"];
export type Evidencia =
  paths["/atletas/{id}/evidencias"]["post"]["responses"][201]["content"]["application/json"];
export type ListaEvidencias =
  paths["/atletas/{id}/evidencias"]["get"]["responses"][200]["content"]["application/json"];

export const TAMANHO_MAX_BYTES = 5 * 1024 * 1024;
export const TIPOS_ACEITOS: readonly CorpoEvidencia["tipoMime"][] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const ACEITA_ARQUIVO = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Mensagem de recusa (ou null se o arquivo serve). A API confere de novo no servidor. */
export function validarArquivo(arquivo: File): string | null {
  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    return "Formato não aceito. Envie PDF, JPG ou PNG.";
  }
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return "O arquivo passa de 5 MB. Envie um arquivo menor.";
  }
  if (arquivo.size === 0) return "O arquivo está vazio.";
  return null;
}

/** Lê o arquivo como base64 puro (sem o prefixo `data:`). */
export function lerBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const texto = String(leitor.result ?? "");
      resolve(texto.slice(texto.indexOf(",") + 1));
    };
    leitor.readAsDataURL(arquivo);
  });
}

/** `GET /atletas/{id}/evidencias` (chave `['evidencias', id]`). */
export function useEvidencias(atletaId: string, habilitado = true) {
  return useQuery({
    queryKey: ["evidencias", atletaId],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/{id}/evidencias", {
        params: { path: { id: atletaId } },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

/** Valida, lê em base64 e envia (`POST /atletas/{id}/evidencias`). Lança `Error` se o cliente recusar. */
export async function enviarEvidencia(
  atletaId: string,
  arquivo: File,
  indicadorId?: string,
): Promise<Evidencia> {
  const recusa = validarArquivo(arquivo);
  if (recusa) throw new Error(recusa);
  const conteudoBase64 = await lerBase64(arquivo);
  const { data, error, response } = await api.POST("/atletas/{id}/evidencias", {
    params: { path: { id: atletaId } },
    body: {
      nomeArquivo: arquivo.name,
      tipoMime: arquivo.type as CorpoEvidencia["tipoMime"],
      conteudoBase64,
      ...(indicadorId ? { indicadorId } : {}),
    },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** `GET /evidencias/{id}/link`: URL temporária (5 min). */
export async function obterLinkEvidencia(id: string): Promise<string> {
  const { data, error, response } = await api.GET("/evidencias/{id}/link", {
    params: { path: { id } },
  });
  if (error || !data) throw paraErroApi(response.status, error);
  return data.url;
}

/**
 * Abre a evidência. A aba é aberta de forma síncrona no clique (evita o bloqueador de pop-up)
 * e só depois recebe o link: http(s) navega na própria aba; `data:` (modo local) vira download
 * e a aba é fechada. Se a API falhar ou o esquema não for aceito, a aba é fechada.
 */
export async function abrirEvidencia(id: string, nomeArquivo: string): Promise<void> {
  const aba = window.open("", "_blank");
  try {
    const url = await obterLinkEvidencia(id);
    if (/^https?:\/\//i.test(url)) {
      if (aba) {
        aba.opener = null;
        aba.location.href = url;
        return;
      }
      baixarOuAbrir(url, nomeArquivo, true);
      return;
    }
    if (/^data:/i.test(url)) {
      aba?.close();
      baixarOuAbrir(url, nomeArquivo, false);
      return;
    }
    throw new Error("Link da evidência em formato não aceito.");
  } catch (e) {
    aba?.close();
    throw e;
  }
}

function baixarOuAbrir(url: string, nomeArquivo: string, novaAba: boolean): void {
  const a = document.createElement("a");
  if (novaAba) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  } else {
    a.download = nomeArquivo;
  }
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * `DELETE /evidencias/{id}`: remove um anexo que não foi vinculado a nenhuma nota (enviado e
 * depois descartado). Falha em silêncio: 404 e 410 (já sumiu) e 409 (já vinculado) não pedem
 * nada, e o resto o job do back limpa em 24 h. No desenvolvimento, a falha vai ao console.
 */
export async function removerEvidenciaOrfa(id: string): Promise<void> {
  try {
    const { response } = await api.DELETE("/evidencias/{id}", { params: { path: { id } } });
    if (import.meta.env.DEV && response && ![204, 404, 409, 410].includes(response.status)) {
      console.warn(`Anexo órfão ${id} não removido (HTTP ${response.status}).`);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`Anexo órfão ${id} não removido.`, e);
  }
}
