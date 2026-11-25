import type { Aviso } from "@/lib/api/avisos";

/** Nomes dos campos do perfil que a API cita em `referencia.campos`. */
const ROTULO_CAMPO: Record<string, string> = {
  nome: "nome",
  emailContato: "e-mail de contato",
  telefone: "telefone",
  passaporteValidoAte: "validade do passaporte",
};

const ARTIGO_CATEGORIA: Record<string, string> = {
  evidencia: "uma evidência",
  sumula: "uma súmula",
  balanca: "uma foto da balança",
};

function texto(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** Aviso do atleta ao treinador ou gestor: "Helena Vasques respondeu…". */
function quem(a: Aviso): string {
  return a.atleta?.nome ?? "Um atleta";
}

/**
 * Frase do aviso, montada aqui a partir do tipo e da referência (o back não manda texto livre do
 * atleta). A mensagem do pedido de ajuste vem à parte, em `detalheDoAviso`, e é sempre texto puro.
 */
export function fraseDoAviso(a: Aviso): string {
  const ref = a.referencia as Record<string, unknown>;
  switch (a.tipo) {
    case "atleta_respondeu":
      return a.indicador
        ? `${quem(a)} respondeu a pergunta: ${a.indicador.nome}`
        : `${quem(a)} respondeu uma pergunta`;
    case "atleta_anexou": {
      const cat = texto(ref["categoria"]);
      const artigo = (cat && ARTIGO_CATEGORIA[cat]) || "um arquivo";
      return `${quem(a)} anexou ${artigo}`;
    }
    case "atleta_atualizou_perfil": {
      const campos = Array.isArray(ref["campos"])
        ? (ref["campos"] as unknown[]).map((c) => ROTULO_CAMPO[String(c)]).filter(Boolean)
        : [];
      return campos.length > 0
        ? `${quem(a)} atualizou o perfil (${campos.join(", ")})`
        : `${quem(a)} atualizou o perfil`;
    }
    case "atleta_completou_cadastro":
      return `${quem(a)} completou o cadastro`;
    case "pedido_ajuste": {
      const de = a.criadoPor?.nome ?? "seu treinador";
      return a.indicador
        ? `Pedido de ajuste de ${de} em ${a.indicador.nome}`
        : `Pedido de ajuste de ${de}`;
    }
    case "sugestao_respondida": {
      const status = texto(ref["status"]);
      const por = a.criadoPor ? ` por ${a.criadoPor.nome}` : "";
      if (status === "aprovada") return `Sua sugestão foi aprovada${por}`;
      if (status === "recusada") return `Sua sugestão foi recusada${por}`;
      return `Sua sugestão foi respondida${por}`;
    }
  }
}

/** Texto puro que acompanha a frase: só o pedido de ajuste tem (mensagem de até 300 caracteres). */
export function detalheDoAviso(a: Aviso): string | null {
  return a.tipo === "pedido_ajuste" ? a.mensagem : null;
}

export type DestinoAviso =
  { to: "/atletas/$id"; params: { id: string } } | { to: "/painel" } | { to: "/sugestoes" };

/** Tela para onde o aviso leva; `null` quando não há tela certa (o item só marca como lido). */
export function destinoDoAviso(a: Aviso): DestinoAviso | null {
  switch (a.tipo) {
    case "pedido_ajuste":
      return { to: "/painel" };
    case "sugestao_respondida":
      return { to: "/sugestoes" };
    default:
      return a.atleta ? { to: "/atletas/$id", params: { id: a.atleta.id } } : null;
  }
}

/** Nome acessível do sino: "Avisos" ou "Avisos, 3 não lidos". */
export function nomeDoSino(naoLidos: number): string {
  if (naoLidos <= 0) return "Avisos";
  return `Avisos, ${naoLidos} ${naoLidos === 1 ? "não lido" : "não lidos"}`;
}

/** Texto da contagem anunciada dentro do painel de avisos. */
export function textoNaoLidos(n: number): string {
  if (n <= 0) return "Nenhum aviso não lido.";
  return `${n} ${n === 1 ? "aviso não lido" : "avisos não lidos"}.`;
}
