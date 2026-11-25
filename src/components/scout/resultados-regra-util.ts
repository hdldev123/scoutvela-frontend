/** Níveis da regra `PERF_RESULTADOS`, na ordem em que aparecem. */
export const NIVEIS_REGRA = [
  { id: "mundial", rotulo: "Mundial (inclui Youth World)" },
  { id: "continental", rotulo: "Continental (Sul-Americano e Pan-Americano)" },
  { id: "nacional", rotulo: "Nacional (Brasileiro)" },
] as const;
export type NivelRegra = (typeof NIVEIS_REGRA)[number]["id"];

export interface FaixaTexto {
  ate: string;
  nota: string;
}
export interface RegraResultadosTexto {
  edicoesMax: string;
  semResultado: string;
  niveis: Record<NivelRegra, FaixaTexto[]>;
}

const FAIXA_MAX = 500;

function texto(v: unknown): string {
  return typeof v === "number" ? String(v) : "";
}

/** Lê o valor da regra (snake_case, como vem da API) para os campos de texto. */
export function lerRegraResultados(valor: unknown): RegraResultadosTexto {
  const v = (valor ?? {}) as Record<string, unknown>;
  const niveis = (v["niveis"] ?? {}) as Record<string, unknown>;
  const faixas = (id: NivelRegra): FaixaTexto[] => {
    const lista = Array.isArray(niveis[id]) ? (niveis[id] as Record<string, unknown>[]) : [];
    return lista.length > 0
      ? lista.map((f) => ({ ate: texto(f["ate"]), nota: texto(f["nota"]) }))
      : [{ ate: "", nota: "0" }];
  };
  return {
    edicoesMax: texto(v["edicoes_max"]),
    semResultado: texto(v["sem_resultado"]),
    niveis: {
      mundial: faixas("mundial"),
      continental: faixas("continental"),
      nacional: faixas("nacional"),
    },
  };
}

const inteiro = (t: string): number | null => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null);

/** Mesmas regras do back: faixas crescentes, só a última sem limite, nota de 0 a 5 que não sobe. */
export function montarRegraResultados(
  r: RegraResultadosTexto,
): { valor: Record<string, unknown> } | { erro: string } {
  const edicoes = inteiro(r.edicoesMax);
  if (edicoes === null || edicoes < 1 || edicoes > 20) {
    return { erro: "Edições máximas: informe um inteiro de 1 a 20." };
  }
  const sem = inteiro(r.semResultado);
  if (sem === null || sem > 5) {
    return { erro: "Nota sem resultado validado: informe um inteiro de 0 a 5." };
  }
  const niveis: Record<string, { ate: number | null; nota: number }[]> = {};
  for (const n of NIVEIS_REGRA) {
    const faixas = r.niveis[n.id];
    const saida: { ate: number | null; nota: number }[] = [];
    let ateAnterior = 0;
    let notaAnterior = 5;
    for (const [i, f] of faixas.entries()) {
      const ultima = i === faixas.length - 1;
      const nome = `${n.rotulo.split(" (")[0]}, faixa ${i + 1}`;
      const nota = inteiro(f.nota);
      if (nota === null || nota > 5) return { erro: `${nome}: a nota é um inteiro de 0 a 5.` };
      if (nota > notaAnterior) {
        return { erro: `${nome}: a nota não pode ser maior que a da faixa anterior.` };
      }
      let ate: number | null = null;
      if (!ultima) {
        ate = inteiro(f.ate);
        if (ate === null || ate < 1 || ate > FAIXA_MAX) {
          return { erro: `${nome}: informe a colocação limite, de 1 a ${FAIXA_MAX}.` };
        }
        if (ate <= ateAnterior) {
          return { erro: `${nome}: a colocação limite precisa ser maior que a da faixa anterior.` };
        }
        ateAnterior = ate;
      }
      notaAnterior = nota;
      saida.push({ ate, nota });
    }
    niveis[n.id] = saida;
  }
  return { valor: { edicoes_max: edicoes, sem_resultado: sem, niveis } };
}
