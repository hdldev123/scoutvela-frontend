type Me = {
  usuario: { papel: string };
  atleta: { id: string; nome: string } | null;
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
  investimento: { rotulo: "Investimento", icone: "chart-line-up", to: "/investimento" },
  parametros: { rotulo: "Parâmetros", icone: "sliders-horizontal", to: "/parametros" },
  painel: { rotulo: "Meu painel", icone: "gauge", to: "/painel" },
  ficha: { rotulo: "Minha ficha", icone: "identification-card", to: "/atletas/$id" },
};

/** Itens de navegação a partir das telas liberadas pela API (`/me`). */
export function itensDeNavegacao(me: Me): ItemNav[] {
  const itens: ItemNav[] = [];
  for (const tela of me.telas) {
    const base = ITENS[tela];
    if (!base) continue;
    if (tela === "ficha") {
      if (!me.atleta) continue;
      itens.push({ tela, ...base, params: { id: me.atleta.id } });
      continue;
    }
    const rotulo = tela === "ranking" && me.usuario.papel === "treinador" ? "Meus atletas" : base.rotulo;
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

