/** Regra `WS_NIVEIS` (P13, D19): nome do nível na World Sailing -> nível no Scout Vela. */

export const NIVEIS_DESTINO = [
  { id: "mundial", rotulo: "Mundial" },
  { id: "sul_americano", rotulo: "Sul-Americano" },
  { id: "continental", rotulo: "Continental" },
  { id: "internacional_aberto", rotulo: "Internacional aberto" },
  { id: "brasileiro", rotulo: "Brasileiro" },
  { id: "estadual", rotulo: "Estadual" },
  { id: "regional", rotulo: "Regional" },
] as const;
export type NivelDestino = (typeof NIVEIS_DESTINO)[number]["id"];

export const WS_NIVEIS_MAX = 100;
export const WS_NOME_MAX = 120;

export interface LinhaWsNivel {
  /** Chave estável da linha (não vai para a API). */
  chave: number;
  nome: string;
  nivel: NivelDestino | "";
}

const ehDestino = (v: unknown): v is NivelDestino => NIVEIS_DESTINO.some((n) => n.id === v);

/** Lê o valor da regra, como vem da API, para linhas editáveis. */
export function lerRegraWsNiveis(valor: unknown): LinhaWsNivel[] {
  const niveis = ((valor ?? {}) as { niveis?: unknown }).niveis;
  if (!niveis || typeof niveis !== "object") return [];
  return Object.entries(niveis as Record<string, unknown>).map(([nome, nivel], i) => ({
    chave: i + 1,
    nome,
    nivel: ehDestino(nivel) ? nivel : "",
  }));
}

/** Mesmas regras do back: até 100 entradas, nome de 1 a 120 caracteres, destino no enum, sem nome repetido. */
export function montarRegraWsNiveis(
  linhas: LinhaWsNivel[],
): { valor: { niveis: Record<string, NivelDestino> } } | { erro: string } {
  if (linhas.length > WS_NIVEIS_MAX) {
    return { erro: `No máximo ${WS_NIVEIS_MAX} níveis na tabela.` };
  }
  const niveis = new Map<string, NivelDestino>();
  for (const [i, l] of linhas.entries()) {
    const nome = l.nome.trim();
    const n = i + 1;
    if (nome.length < 1 || nome.length > WS_NOME_MAX) {
      return {
        erro: `Linha ${n}: o nome do nível na World Sailing tem de 1 a ${WS_NOME_MAX} caracteres.`,
      };
    }
    if (!l.nivel) return { erro: `Linha ${n}: escolha o nível no Scout Vela.` };
    if (niveis.has(nome)) {
      return { erro: `Linha ${n}: o nível "${nome}" já está na tabela.` };
    }
    niveis.set(nome, l.nivel);
  }
  return { valor: { niveis: Object.fromEntries(niveis) as Record<string, NivelDestino> } };
}

/** Forma comparável do que está na tela, para saber se algo mudou. */
export const assinaturaWsNiveis = (linhas: LinhaWsNivel[]): string =>
  JSON.stringify(linhas.map((l) => [l.nome.trim(), l.nivel]));
