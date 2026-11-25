import type { Conversa, Mensagem } from "@/lib/api/conversas";

export const AVISO_PRIVACIDADE =
  "Conversa privada. A gestão da CBVela só pode lê-la em caso de denúncia, com o motivo registrado.";

export const NOME_GESTAO = "Gestão CBVela";

/** Papel de quem escreve, em texto: "Atleta", "Treinador(a)", "Gestão". */
export function rotuloDoAutor(papel: string): string {
  if (papel === "atleta") return "Atleta";
  if (papel === "treinador") return "Treinador(a)";
  if (papel === "gestor") return "Gestão";
  return papel;
}

/** Nome do outro lado da conversa, do ponto de vista de quem a vê (`papel` = papel de quem vê). */
export function tituloDaConversa(c: Conversa, papel: string): string {
  if (papel === "gestor") {
    if (c.tipo === "treinador_atleta") {
      return `${c.treinador?.nome ?? "Treinador"} e ${c.atleta?.nome ?? "atleta"}`;
    }
    const alvo = c.tipo === "gestao_atleta" ? c.atleta : c.treinador;
    if (alvo) return alvo.nome;
  }
  return "nome" in c.com ? c.com.nome : NOME_GESTAO;
}

/** Linha de apoio sob o nome: quem é o outro lado (ou o par, na supervisão). */
export function subtituloDaConversa(c: Conversa, papel: string): string | null {
  if (papel === "gestor") {
    if (c.tipo === "gestao_atleta") return "Atleta · caixa da gestão";
    if (c.tipo === "gestao_treinador") return "Treinador(a) · caixa da gestão";
    return "Treinador(a) e atleta";
  }
  return "nome" in c.com ? rotuloDoAutor(c.com.papel) : null;
}

/** O gestor tem leitura por supervisão vigente nesta conversa? */
export function supervisaoVigente(c: Conversa, agora = Date.now()): boolean {
  return !!c.supervisaoAte && new Date(c.supervisaoAte).getTime() > agora;
}

/** Junta mensagens sem repetir ids, em ordem cronológica. */
export function juntarMensagens(atuais: Mensagem[], novas: Mensagem[]): Mensagem[] {
  const ids = new Set(atuais.map((m) => m.id));
  const extra = novas.filter((m) => !ids.has(m.id));
  if (extra.length === 0) return atuais;
  return [...atuais, ...extra].sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
}

/** Texto da contagem do campo de envio. */
export function textoContador(n: number, max: number): string {
  return `${n.toLocaleString("pt-BR")} de ${max.toLocaleString("pt-BR")} caracteres`;
}

/** Mensagem clara para os erros do envio: 409 (somente leitura), 429 (limite) e os demais. */
export function mensagemDeErroEnvio(status: number | null, padrao: string): string {
  if (status === 409) {
    return "Esta conversa está somente leitura: não é possível enviar novas mensagens.";
  }
  if (status === 429) {
    return "Você enviou mensagens demais em pouco tempo (limite de 30 por minuto). Aguarde um instante e envie de novo.";
  }
  if (status === 403) return "Você não tem permissão para enviar mensagens nesta conversa.";
  if (status === 404) return "Esta conversa não está mais disponível para você.";
  return padrao;
}
