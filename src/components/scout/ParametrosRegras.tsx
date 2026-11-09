import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros, type Parametros } from "@/lib/api/parametros";
import { formatarValor, lerNumero, MSG_SALVO } from "./parametros-util";

type Campo = {
  /** Caminho no valor da regra, ex.: "limites.0" ou "A.status". */
  chave: string;
  rotulo: string;
  ajuda: string;
  tipo: "dec" | "int" | "texto" | "status";
  min?: number;
  max?: number;
};
type Definicao = {
  titulo: string;
  resumo: string;
  campos: Campo[];
  /** Validação entre campos, sobre o valor já montado. Devolve a mensagem de erro. */
  cruzar?: (v: Record<string, unknown>) => string | null;
};

const STATUS = [
  ["apto", "Apto"],
  ["condicional", "Condicional"],
  ["alerta", "Sinal de alerta"],
] as const;

const perfisG4: Campo[] = (["A", "B", "C", "D"] as const).flatMap((p) => [
  {
    chave: `${p}.status`,
    rotulo: `Perfil ${p} · status`,
    ajuda: `Status do gate G4 para atletas com perfil de suporte ${p}.`,
    tipo: "status" as const,
  },
  {
    chave: `${p}.motivo`,
    rotulo: `Perfil ${p} · motivo`,
    ajuda: "Texto mostrado ao lado do gate (3 a 200 caracteres).",
    tipo: "texto" as const,
    min: 3,
    max: 200,
  },
]);

const DEFINICOES: Record<string, Definicao> = {
  P3: {
    titulo: "P3 · Nota do peso (Class Fit)",
    resumo:
      "A nota do peso cai conforme a distância relativa à média da classe. Cada limite é o teto de uma nota; acima do último, a nota é 0.",
    campos: [5, 4, 3, 2, 1].map((nota, i) => ({
      chave: `limites.${i}`,
      rotulo: `Teto da nota ${nota}`,
      ajuda: `Distância relativa máxima para o peso valer nota ${nota}. Precisa ser maior que o limite anterior.`,
      tipo: "dec" as const,
      min: 0.01,
      max: 100,
    })),
    cruzar: (v) => {
      const l = v["limites"] as number[];
      return l.every((n, i) => i === 0 || n > (l[i - 1] as number))
        ? null
        : "Os limites precisam ser crescentes (cada teto maior que o anterior).";
    },
  },
  G1: {
    titulo: "G1 · Class Fit",
    resumo:
      "Compara a distância relativa do peso à média da classe. Acima do limite condicional, é sinal de alerta.",
    campos: [
      {
        chave: "apto_ate",
        rotulo: "Apto até",
        ajuda: "Distância relativa até a qual o gate fica apto.",
        tipo: "dec",
        min: 0.01,
        max: 100,
      },
      {
        chave: "condicional_ate",
        rotulo: "Condicional até",
        ajuda:
          "Distância relativa até a qual o gate fica condicional. Precisa ser maior que o limite de apto.",
        tipo: "dec",
        min: 0.01,
        max: 100,
      },
    ],
    cruzar: (v) =>
      (v["apto_ate"] as number) < (v["condicional_ate"] as number)
        ? null
        : "O limite de apto precisa ser menor que o condicional.",
  },
  G2: {
    titulo: "G2 · Evidência competitiva",
    resumo: "Cortes de colocação em Mundial, Sul-Americano e Brasileiro.",
    campos: [
      {
        chave: "mundial_apto_ate_fracao",
        rotulo: "Mundial · apto até a fração",
        ajuda:
          "Fração da frota (0 a 1) até a qual o resultado no Mundial deixa o gate apto. Ex.: 0,3 = 30% melhores.",
        tipo: "dec",
        min: 0,
        max: 1,
      },
      {
        chave: "mundial_condicional_ate_fracao",
        rotulo: "Mundial · condicional até a fração",
        ajuda:
          "Fração da frota (0 a 1) até a qual o resultado no Mundial deixa o gate condicional.",
        tipo: "dec",
        min: 0,
        max: 1,
      },
      {
        chave: "sul_americano_condicional_ate_posicao",
        rotulo: "Sul-Americano · condicional até a posição",
        ajuda: "Melhor colocação, em posição, que deixa o gate condicional no Sul-Americano.",
        tipo: "int",
        min: 1,
        max: 500,
      },
      {
        chave: "brasileiro_condicional_ate_posicao",
        rotulo: "Brasileiro · condicional até a posição",
        ajuda: "Melhor colocação, em posição, que deixa o gate condicional no Brasileiro.",
        tipo: "int",
        min: 1,
        max: 500,
      },
    ],
  },
  G3: {
    titulo: "G3 · Alto rendimento",
    resumo: "Conta eventos internacionais disputados dentro de uma janela de meses.",
    campos: [
      {
        chave: "apto_min_eventos",
        rotulo: "Mínimo de eventos para apto",
        ajuda: "Eventos internacionais na janela para o gate ficar apto.",
        tipo: "int",
        min: 0,
        max: 100,
      },
      {
        chave: "condicional_min_eventos",
        rotulo: "Mínimo de eventos para condicional",
        ajuda: "Eventos na janela para ficar condicional. Não pode passar do mínimo de apto.",
        tipo: "int",
        min: 0,
        max: 100,
      },
      {
        chave: "janela_meses",
        rotulo: "Janela (meses)",
        ajuda: "Quantos meses para trás os eventos são contados (1 a 60).",
        tipo: "int",
        min: 1,
        max: 60,
      },
    ],
    cruzar: (v) =>
      (v["apto_min_eventos"] as number) >= (v["condicional_min_eventos"] as number)
        ? null
        : "O mínimo de apto não pode ser menor que o de condicional.",
  },
  G4: {
    titulo: "G4 · Campanha",
    resumo: "Status e motivo do gate conforme o perfil de suporte financeiro (A a D).",
    campos: perfisG4,
  },
  RANKING_CBVELA: {
    titulo: "Ranking CBVela",
    resumo: "Janela dos resultados de regata que somam pontos na dimensão Performance.",
    campos: [
      {
        chave: "janela_semanas",
        rotulo: "Janela (semanas)",
        ajuda: "Quantas semanas para trás entram no cálculo (1 a 104). O padrão da CBVela é 52.",
        tipo: "int",
        min: 1,
        max: 104,
      },
    ],
  },
};

export const CODIGOS_EDITAVEIS = Object.keys(DEFINICOES);

function ler(valor: unknown, chave: string): string {
  let atual: unknown = valor;
  for (const parte of chave.split(".")) {
    if (atual === null || typeof atual !== "object") return "";
    atual = (atual as Record<string, unknown>)[parte];
  }
  if (atual === null || atual === undefined) return "";
  return typeof atual === "number" ? String(atual).replace(".", ",") : String(atual);
}

function gravar(alvo: Record<string, unknown>, chave: string, v: unknown) {
  const partes = chave.split(".");
  let atual: Record<string, unknown> = alvo;
  partes.forEach((p, i) => {
    if (i === partes.length - 1) {
      atual[p] = v;
      return;
    }
    const proxima = partes[i + 1] as string;
    atual[p] ??= /^\d+$/.test(proxima) ? [] : {};
    atual = atual[p] as Record<string, unknown>;
  });
}

/** Monta o valor da regra a partir dos textos. Um campo inválido devolve o erro. */
export function montarRegra(
  codigo: string,
  textos: Record<string, string>,
): { valor: Record<string, unknown> } | { erro: string } {
  const def = DEFINICOES[codigo]!;
  const valor: Record<string, unknown> = {};
  for (const c of def.campos) {
    const t = textos[c.chave] ?? "";
    if (c.tipo === "texto") {
      const s = t.trim();
      if (s.length < (c.min ?? 0) || s.length > (c.max ?? 200))
        return { erro: `${c.rotulo}: use de ${c.min} a ${c.max} caracteres.` };
      gravar(valor, c.chave, s);
    } else if (c.tipo === "status") {
      if (!STATUS.some(([s]) => s === t)) return { erro: `${c.rotulo}: escolha um status.` };
      gravar(valor, c.chave, t);
    } else {
      const n = lerNumero(t);
      if (
        n === null ||
        (c.tipo === "int" && !Number.isInteger(n)) ||
        n < (c.min ?? 0) ||
        n > (c.max ?? 100)
      )
        return {
          erro: `${c.rotulo}: informe ${c.tipo === "int" ? "um inteiro" : "um número"} entre ${String(c.min).replace(".", ",")} e ${c.max}.`,
        };
      gravar(valor, c.chave, n);
    }
  }
  const cruzado = def.cruzar?.(valor);
  return cruzado ? { erro: cruzado } : { valor };
}

function dataBr(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function SecaoRegras({ dados }: { dados: Parametros }) {
  const editaveis = dados.regras.filter((r) => r.codigo in DEFINICOES);
  const outras = dados.regras.filter((r) => !(r.codigo in DEFINICOES));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Regras provisórias</h2>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          à espera da CBVela
        </span>
      </div>
      {editaveis.map((r) => (
        <FormRegra
          key={`${r.codigo}|${r.atualizadoEm}`}
          codigo={r.codigo}
          descricao={r.descricao}
          valor={r.valor}
          atualizadoEm={r.atualizadoEm}
        />
      ))}
      {outras.length > 0 && (
        <>
          <h3 style={{ fontSize: "0.95rem" }}>Somente leitura</h3>
          <ul className="par-lista">
            {outras.map((r) => (
              <li key={r.codigo}>
                <b>{r.codigo}</b> · {r.descricao}{" "}
                <span className="muted">({formatarValor(r.valor)})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function FormRegra(props: {
  codigo: string;
  descricao: string;
  valor: unknown;
  atualizadoEm: string;
}) {
  const { codigo } = props;
  const def = DEFINICOES[codigo]!;
  const salvar = useSalvarParametros();
  const inicial = Object.fromEntries(def.campos.map((c) => [c.chave, ler(props.valor, c.chave)]));
  const [textos, setTextos] = useState<Record<string, string>>(inicial);
  const montada = montarRegra(codigo, textos);
  const alterada = def.campos.some((c) => (textos[c.chave] ?? "") !== inicial[c.chave]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if ("erro" in montada || !alterada) return;
    salvar.mutate(
      { regras: { [codigo]: montada.valor } },
      { onSuccess: () => toast.success(MSG_SALVO) },
    );
  };

  return (
    <form onSubmit={enviar} noValidate className="par-regra" aria-label={def.titulo}>
      <h3 style={{ fontSize: "0.95rem", marginBottom: 2 }}>{def.titulo}</h3>
      <p className="muted" style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>
        {def.resumo}
      </p>
      <div className="par-regra-campos">
        {def.campos.map((c) => {
          const id = `regra-${codigo}-${c.chave}`;
          const comum = {
            id,
            "aria-describedby": `${id}-ajuda`,
            value: textos[c.chave] ?? "",
          };
          const mudar = (v: string) => setTextos((t) => ({ ...t, [c.chave]: v }));
          return (
            <div className="field" key={c.chave}>
              <label htmlFor={id}>{c.rotulo}</label>
              {c.tipo === "status" ? (
                <select {...comum} onChange={(e) => mudar(e.target.value)}>
                  <option value="">Escolha</option>
                  {STATUS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...comum}
                  type="text"
                  inputMode={c.tipo === "texto" ? "text" : "decimal"}
                  maxLength={c.tipo === "texto" ? c.max : undefined}
                  onChange={(e) => mudar(e.target.value)}
                />
              )}
              <small id={`${id}-ajuda`} className="muted">
                {c.ajuda}
              </small>
            </div>
          );
        })}
      </div>
      {"erro" in montada && alterada && (
        <p className="par-erro" role="alert">
          {montada.erro}
        </p>
      )}
      {salvar.error && (
        <p className="par-erro" role="alert">
          {mensagemDeErro(salvar.error)}
        </p>
      )}
      <div className="btn-row par-regra-rodape">
        <button
          className="btn primary"
          type="submit"
          disabled={"erro" in montada || !alterada || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : `Salvar ${codigo}`}
        </button>
        <span className="muted" style={{ fontSize: "0.82rem" }}>
          Atualizada em {dataBr(props.atualizadoEm)}
        </span>
      </div>
    </form>
  );
}
