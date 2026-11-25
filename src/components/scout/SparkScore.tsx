import { fmt1 } from "./formato";
import { trechos } from "./evolucao-util";

export interface PontoScore {
  /** Rótulo curto do eixo (ex.: "Set"). */
  rotulo: string;
  score: number;
  /** Média da turma no ciclo; `null` ou ausente (ciclo atual, grupo pequeno) não desenha ponto. */
  mediaTurma?: number | null;
}

/**
 * Linha do score nos últimos ciclos; o último ponto (ciclo atual) é destacado. Se algum ponto traz
 * `mediaTurma`, a média da turma entra como segunda linha, tracejada, com legenda.
 */
export function SparkScore({ pontos }: { pontos: PontoScore[] }) {
  if (pontos.length === 0) return null;
  const valores = pontos.map((p) => p.score);
  const medias = pontos.map((p) => p.mediaTurma ?? null);
  const comMedia = medias.some((m) => m != null);
  const todos = [...valores, ...medias.filter((m): m is number => m != null)];
  const lo = Math.min(...todos) - 3;
  const hi = Math.max(...todos) + 3;
  const passo = pontos.length > 1 ? 116 / (pontos.length - 1) : 0;
  const X = (i: number) => 12 + i * passo;
  const Y = (v: number) => 40 - ((v - lo) / (hi - lo)) * 30;
  const ultimo = pontos.length - 1;
  const rotuloMedia = comMedia
    ? `. Média da turma: ${pontos.map((p, i) => `${p.rotulo} ${medias[i] == null ? "sem dado" : fmt1(medias[i]!)}`).join(", ")}`
    : "";
  const svg = (
    <svg
      viewBox="0 0 140 62"
      width="140"
      height="62"
      role="img"
      aria-label={`Score nos últimos ciclos: ${valores.map(fmt1).join(", ")}${rotuloMedia}`}
    >
      {comMedia &&
        trechos(medias).map((idx) => (
          <g key={idx[0]} data-testid="spark-media">
            {idx.length > 1 && (
              <polyline
                fill="none"
                stroke="var(--ink-2)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                points={idx.map((i) => `${X(i)},${Y(medias[i]!)}`).join(" ")}
              />
            )}
            {idx.map((i) => (
              <rect
                key={i}
                data-testid="spark-media-ponto"
                x={X(i) - 2.5}
                y={Y(medias[i]!) - 2.5}
                width="5"
                height="5"
                fill="var(--ink-2)"
              />
            ))}
          </g>
        ))}
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
  if (!comMedia) return svg;
  return (
    <figure className="spark">
      {svg}
      <figcaption className="legend spark-legenda">
        <span>
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" x2="18" y1="4" y2="4" stroke="var(--sea)" strokeWidth="2" />
          </svg>
          Atleta
        </span>
        <span>
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              x2="18"
              y1="4"
              y2="4"
              stroke="var(--ink-2)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </svg>
          Média da turma
        </span>
      </figcaption>
    </figure>
  );
}
