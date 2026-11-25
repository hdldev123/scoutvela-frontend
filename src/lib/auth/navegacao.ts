type Me = {
  usuario: { papel: string };
  atleta: { id: string; nome: string | null } | null;
  telas: string[];
};

export interface ItemNav {
  tela: string;
  rotulo: string;
  icone: string;
  to: string;
  params?: { id: string };
}

export const ROTULO_PAPEL: Record<string, string> = {
  gestor: "Gestão técnica",
  treinador: "Treinador(a)",
  atleta: "Atleta",
  ibvar: "Investidor",
  responsavel: "Responsável",
};

const ITENS: Record<string, { rotulo: string; icone: string; to: string }> = {
  ranking: { rotulo: "Ranking", icone: "trophy", to: "/ranking" },
  avaliar: { rotulo: "Lançar avaliação", icone: "clipboard-text", to: "/avaliar" },
  cadastro: { rotulo: "Cadastrar atleta", icone: "user-plus", to: "/cadastro" },
  ciclos: { rotulo: "Ciclos", icone: "calendar-check", to: "/ciclos" },
  revisoes: { rotulo: "Revisões", icone: "chat-circle-text", to: "/revisoes" },
  investimento: { rotulo: "Investimento", icone: "chart-line-up", to: "/investimento" },
  usuarios: { rotulo: "Contas", icone: "users-three", to: "/usuarios" },
  parametros: { rotulo: "Parâmetros", icone: "sliders-horizontal", to: "/parametros" },
  sugestoes: { rotulo: "Sugestões", icone: "lightbulb", to: "/sugestoes" },
  auditoria: { rotulo: "Auditoria", icone: "list-magnifying-glass", to: "/auditoria" },
  painel: { rotulo: "Meu painel", icone: "gauge", to: "/painel" },
  ficha: { rotulo: "Minha ficha", icone: "identification-card", to: "/atletas/$id" },
};

/** O menu só espelha as telas liberadas pela API em `/me` (a API decide o acesso). */
function telasDoMenu(me: Me): string[] {
  return me.telas;
}

/** O papel tem esta tela (liberada pela API em `/me`)? */
export function temTela(me: Me, tela: string): boolean {
  return telasDoMenu(me).includes(tela);
}

/** Itens de navegação a partir das telas liberadas pela API (`/me`). */
export function itensDeNavegacao(me: Me): ItemNav[] {
  const itens: ItemNav[] = [];
  for (const tela of telasDoMenu(me)) {
    const base = ITENS[tela];
    if (!base) continue;
    if (tela === "ficha") {
      if (!me.atleta) continue;
      itens.push({ tela, ...base, params: { id: me.atleta.id } });
      continue;
    }
    const rotulo =
      tela === "ranking" && me.usuario.papel === "treinador" ? "Meus atletas" : base.rotulo;
    itens.push({ tela, ...base, rotulo });
  }
  return itens;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const a = partes[0]![0]!;
  const b = partes.length > 1 ? partes[partes.length - 1]![0]! : "";
  return (a + b).toUpperCase();
}

/** Rota da tela inicial devolvida por `/me` (ex.: "painel" -> "/painel"). */
export function rotaDaTelaInicial(telaInicial: string): string {
  return ITENS[telaInicial] && telaInicial !== "ficha" ? ITENS[telaInicial]!.to : "/ranking";
}

/** Telas do menu que têm balão; a chave de `/me/notificacoes` tem o mesmo nome da tela. */
const TELAS_COM_BALAO = new Set([
  "revisoes",
  "cadastro",
  "avaliar",
  "painel",
  "investimento",
  "sugestoes",
]);

/** Contagem do balão de uma tela (0 quando a tela não tem balão ou nada pede atenção). */
export function contagemDaTela(
  tela: string,
  contagens: Record<string, number> | undefined,
): number {
  if (!TELAS_COM_BALAO.has(tela)) return 0;
  const n = contagens?.[tela] ?? 0;
  return n > 0 ? n : 0;
}

/** Texto do selo: "9+" acima de 9. */
export function textoDoBalao(n: number): string {
  return n > 9 ? "9+" : String(n);
}

/** Texto para leitor de tela, ex.: "3 pendentes". */
export function textoPendentes(n: number): string {
  return `${n} ${n === 1 ? "pendente" : "pendentes"}`;
}

/**
 * Nome acessível do item do menu com balão. Contém o texto visível (rótulo + número do balão),
 * como pede a WCAG 2.5.3: "Revisões 3 pendentes"; acima de 9, "Revisões 9+ (12 pendentes)".
 */
export function nomeComPendencias(rotulo: string, n: number): string {
  return n > 9
    ? `${rotulo} ${textoDoBalao(n)} (${textoPendentes(n)})`
    : `${rotulo} ${textoPendentes(n)}`;
}
