import { fmt1 } from "./formato";

export interface GaugeClassFitProps {
  pesoKg: number;
  pesoMinKg: number;
  pesoMedioKg: number;
  pesoMaxKg: number;
  /** Nome da classe, para o texto alternativo. */
  classe: string;
  /** Status do G1 (Class Fit): define a cor do marcador. */
  status: "apto" | "condicional" | "alerta";
}

const COR = { apto: "var(--good)", condicional: "var(--warn)", alerta: "var(--bad)" } as const;
const W = 320;
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const FONTE = { fontSize: 11, fontFamily: "JetBrains Mono, monospace" } as const;

/** Peso do atleta contra a faixa de peso da classe. */
export function GaugeClassFit({
  pesoKg,
  pesoMinKg,
  pesoMedioKg,
  pesoMaxKg,
  classe,
  status,
}: GaugeClassFitProps) {
  const lo = Math.min(pesoMinKg, pesoKg) - 4;
  const hi = Math.max(pesoMaxKg, pesoKg) + 4;
  const X = (v: number) => 16 + ((v - lo) / (hi - lo)) * (W - 32);
  const cor = COR[status];
  return (
    <svg
      viewBox={`0 0 ${W} 86`}
      width="100%"
      role="img"
      aria-label={`Peso de ${fmt1(pesoKg)} kg contra a faixa de ${fmt1(pesoMinKg)} a ${fmt1(pesoMaxKg)} kg da classe ${classe}`}
    >
      <line x1="16" x2={W - 16} y1="44" y2="44" stroke="var(--line)" strokeWidth="2" />
      <rect
        x={X(pesoMinKg)}
        y="34"
        width={X(pesoMaxKg) - X(pesoMinKg)}
        height="20"
        rx="4"
        fill="var(--sea-soft)"
        stroke="var(--sea)"
        strokeWidth="1"
      />
      <line
        x1={X(pesoMedioKg)}
        x2={X(pesoMedioKg)}
        y1="30"
        y2="58"
        stroke="var(--sea)"
        strokeWidth="2"
      />
      <text x={X(pesoMinKg) - 4} y="76" textAnchor="end" fill="var(--ink-2)" {...FONTE}>
        {fmt1(pesoMinKg)}
      </text>
      <text x={X(pesoMaxKg) + 4} y="76" textAnchor="start" fill="var(--ink-2)" {...FONTE}>
        {fmt1(pesoMaxKg)}
      </text>
      <text x={X(pesoMedioKg)} y="76" textAnchor="middle" fill="var(--sea)" {...FONTE}>
        média {fmt1(pesoMedioKg)}
      </text>
      <path d={`M${X(pesoKg) - 7} 20 L${X(pesoKg) + 7} 20 L${X(pesoKg)} 32 Z`} fill={cor} />
      <line x1={X(pesoKg)} x2={X(pesoKg)} y1="32" y2="56" stroke={cor} strokeWidth="2.5" />
      <text
        x={limitar(X(pesoKg), 40, W - 40)}
        y="13"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="var(--ink)"
        fontFamily="JetBrains Mono, monospace"
      >
        {fmt1(pesoKg)} kg
      </text>
    </svg>
  );
}
