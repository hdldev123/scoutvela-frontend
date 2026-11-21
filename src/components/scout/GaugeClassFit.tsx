export interface GaugeClassFitProps {
  /** Grandeza medida, no singular: "Peso" ou "Altura". */
  grandeza: string;
  /** Unidade exibida: "kg" ou "cm". */
  unidade: string;
  /** Casas decimais dos números (1 para kg, 0 para cm). */
  casas: number;
  valor: number;
  min: number;
  media: number;
  max: number;
  /** Nome da classe, para o texto alternativo. */
  classe: string;
  /** Cor do marcador: apto (dentro), condicional (fora, informativo) ou alerta. */
  status: "apto" | "condicional" | "alerta";
  /** Folga do eixo além da faixa e do atleta, na unidade (4 para kg, 10 para cm). */
  margem?: number;
  /** Complemento do texto alternativo quando a situação é conhecida, ex.: "abaixo da faixa". */
  situacao?: string;
}

const COR = { apto: "var(--good)", condicional: "var(--warn)", alerta: "var(--bad)" } as const;
const W = 320;
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const FONTE = { fontSize: 11, fontFamily: "JetBrains Mono, monospace" } as const;

/** Valor do atleta contra a faixa de referência da classe (peso ou altura). */
export function GaugeClassFit({
  grandeza,
  unidade,
  casas,
  valor,
  min,
  media,
  max,
  classe,
  status,
  margem = 4,
  situacao,
}: GaugeClassFitProps) {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const lo = Math.min(min, valor) - margem;
  const hi = Math.max(max, valor) + margem;
  const X = (v: number) => 16 + ((v - lo) / (hi - lo)) * (W - 32);
  const cor = COR[status];
  // Faixa estreita no eixo (atleta longe da faixa): o rótulo da média desce para uma 2ª linha,
  // senão ele se sobrepõe aos de mínimo e máximo.
  const empilha = X(max) - X(min) < 150;
  const altura = empilha ? 100 : 86;
  const rotulo =
    `${grandeza} de ${fmt(valor)} ${unidade}` +
    `${situacao ? `, ${situacao}` : ""}, faixa da classe ${classe} de ${fmt(min)} a ${fmt(max)} ${unidade}, média ${fmt(media)}`;
  return (
    <svg viewBox={`0 0 ${W} ${altura}`} width="100%" role="img" aria-label={rotulo}>
      <line x1="16" x2={W - 16} y1="44" y2="44" stroke="var(--line)" strokeWidth="2" />
      <rect
        x={X(min)}
        y="34"
        width={X(max) - X(min)}
        height="20"
        rx="4"
        fill="var(--sea-soft)"
        stroke="var(--sea)"
        strokeWidth="1"
      />
      <line x1={X(media)} x2={X(media)} y1="30" y2="58" stroke="var(--sea)" strokeWidth="2" />
      <text x={X(min) - 4} y="76" textAnchor="end" fill="var(--ink-2)" {...FONTE}>
        {fmt(min)}
      </text>
      <text x={X(max) + 4} y="76" textAnchor="start" fill="var(--ink-2)" {...FONTE}>
        {fmt(max)}
      </text>
      <text x={X(media)} y={empilha ? 92 : 76} textAnchor="middle" fill="var(--sea)" {...FONTE}>
        média {fmt(media)}
      </text>
      <path d={`M${X(valor) - 7} 20 L${X(valor) + 7} 20 L${X(valor)} 32 Z`} fill={cor} />
      <line x1={X(valor)} x2={X(valor)} y1="32" y2="56" stroke={cor} strokeWidth="2.5" />
      <text
        x={limitar(X(valor), 40, W - 40)}
        y="13"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="var(--ink)"
        fontFamily="JetBrains Mono, monospace"
      >
        {fmt(valor)} {unidade}
      </text>
    </svg>
  );
}
