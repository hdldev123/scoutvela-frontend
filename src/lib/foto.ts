export const FOTO_TIPOS = ["image/jpeg", "image/png"] as const;
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const LADO = 512;

/** Valida tipo e tamanho; devolve a mensagem de erro ou `null`. */
export function validarFoto(arquivo: { type: string; size: number }): string | null {
  if (!(FOTO_TIPOS as readonly string[]).includes(arquivo.type)) {
    return "Use uma imagem JPG ou PNG.";
  }
  if (arquivo.size > FOTO_MAX_BYTES) return "A foto precisa ter até 2 MB.";
  return null;
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
