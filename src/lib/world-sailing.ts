/**
 * World Sailing ID: formato, normalização e link do perfil público.
 * O padrão do link foi visto em exemplos públicos, não em documentação oficial (ver
 * `vela-back/docs/world-sailing.md`). Se mudar, a troca é só aqui.
 */

/** Mesma regra da API: 3 letras do país, depois 2 a 12 letras ou números. */
export const FORMATO_WS_ID = /^[A-Z]{3}[A-Z0-9]{2,12}$/;

/** Maiúsculas e sem espaços, como a API grava. */
export function normalizarWsId(texto: string): string {
  return texto.replace(/\s+/g, "").toUpperCase();
}

/** Mensagem de WS ID inválido (ou null). Vazio também é inválido: o campo é obrigatório. */
export function mensagemWsId(texto: string): string | null {
  const id = normalizarWsId(texto);
  if (id === "") return "Informe o ID World Sailing do atleta.";
  return FORMATO_WS_ID.test(id)
    ? null
    : "ID World Sailing inválido. Use 3 letras do país e depois letras ou números, ex.: BRAJS12.";
}

/** Link do perfil público do velejador no World Sailing. */
export function urlPerfilWorldSailing(wsId: string): string {
  return `https://www.sailing.org/sailor/?ref=${encodeURIComponent(wsId)}`;
}
