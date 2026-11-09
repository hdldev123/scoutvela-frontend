import { fmt1 } from "./formato";

export interface PontoScore {
  /** Rótulo curto do eixo (ex.: "Set"). */
  rotulo: string;
  score: number;
}

/** Linha do score nos últimos ciclos; o último ponto (ciclo atual) é destacado. */
export function SparkScore({ pontos }: { pontos: PontoScore[] }) {
  if (pontos.length === 0) return null;
  const valores = pontos.map((p) => p.score);
  const lo = Math.min(...valores) - 3;
  const hi = Math.max(...valores) + 3;
  const passo = pontos.length > 1 ? 116 / (pontos.length - 1) : 0;
  const X = (i: number) => 12 + i * passo;
  const Y = (v: number) => 40 - ((v - lo) / (hi - lo)) * 30;
  const ultimo = pontos.length - 1;
  return (
    <svg
      viewBox="0 0 140 62"
      width="140"
      height="62"
      role="img"
      aria-label={`Score nos últimos ciclos: ${valores.map(fmt1).join(", ")}`}
    >
      <polyline
        fill="none"
        stroke="var(--sea)"
        strokeWidth="2"
        points={pontos.map((p, i) => `${X(i)},${Y(p.score)}`).join(" ")}
      />
      {pontos.map((p, i) => (
        <g key={`${p.rotulo}-${i}`}>
          <circle
            cx={X(i)}
            cy={Y(p.score)}
            r={i === ultimo ? 4 : 2.5}
            fill={i === ultimo ? "var(--sea)" : "var(--surface)"}
            stroke="var(--sea)"
            strokeWidth="1.5"
          />
          <text
            x={X(i)}
            y="58"
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-2)"
            fontFamily="JetBrains Mono, monospace"
          >
            {p.rotulo}
          </text>
        </g>
      ))}
    </svg>
  );
}
