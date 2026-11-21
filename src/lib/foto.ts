export const FOTO_TIPOS = ["image/jpeg", "image/png"] as const;
/** Limite do arquivo original escolhido (a foto é recortada e reduzida antes do envio). */
export const FOTO_ORIGINAL_MAX_BYTES = 15 * 1024 * 1024;
/** Limite do recorte (até 512 px) que vai para a API. */
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const LADO = 512;

/** Valida tipo e tamanho do arquivo original; devolve a mensagem de erro ou `null`. */
export function validarFoto(arquivo: { type: string; size: number }): string | null {
  if (!(FOTO_TIPOS as readonly string[]).includes(arquivo.type)) {
    return "Use uma imagem JPG ou PNG.";
  }
  if (arquivo.size > FOTO_ORIGINAL_MAX_BYTES) return "A foto precisa ter até 15 MB.";
  return null;
}

/** Tamanho em bytes de um conteúdo base64 (sem prefixo). */
export function bytesDoBase64(base64: string): number {
  const preenchimento = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - preenchimento;
}

/** Valida o recorte já preparado (o que de fato vai para a API): até 2 MB. */
export function validarRecorte(conteudoBase64: string): string | null {
  return bytesDoBase64(conteudoBase64) > FOTO_MAX_BYTES
    ? "A foto, depois de reduzida, ainda passa de 2 MB. Escolha outra imagem."
    : null;
}

/** Recorte quadrado centralizado de uma imagem de `larg` × `alt`. */
export function recorteQuadrado(larg: number, alt: number) {
  const lado = Math.min(larg, alt);
  return { x: Math.round((larg - lado) / 2), y: Math.round((alt - lado) / 2), lado };
}

function carregar(arquivo: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

/** Recorta no centro (quadrado), reduz a até 512 px e devolve o conteúdo em base64 (sem prefixo). */
export async function prepararFoto(
  arquivo: File,
): Promise<{ tipoMime: "image/jpeg" | "image/png"; conteudoBase64: string; previa: string }> {
  const img = await carregar(arquivo);
  const { x, y, lado } = recorteQuadrado(img.naturalWidth, img.naturalHeight);
  const saida = Math.min(lado, LADO);
  const canvas = document.createElement("canvas");
  canvas.width = saida;
  canvas.height = saida;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.drawImage(img, x, y, lado, lado, 0, 0, saida, saida);
  const tipoMime = arquivo.type === "image/png" ? "image/png" : "image/jpeg";
  const previa = canvas.toDataURL(tipoMime, 0.9);
  return { tipoMime, conteudoBase64: previa.slice(previa.indexOf(",") + 1), previa };
}
