import { useState } from "react";
import { EstadoVazio } from "./EstadoVazio";
import { fmt0, fmt1 } from "./formato";
import {
  alvoDaMeta,
  eixoScore,
  fmtPercentualSinal,
  fmtPontosSinal,
  rotuloEixo,
  trechos,
} from "./evolucao-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useRanking } from "@/lib/api/consultas";
import { useEvolucao, type CicloEvolucao, type RespostaEvolucao } from "@/lib/api/investimento";

const SEM_DADO = "Sem dado neste ciclo";
const AVISO_SUPRIMIDO = "Grupo pequeno: números ocultos para proteger quem não consentiu.";

const L = 36;
const R = 14;
const T = 18;
const B = 30;
const W = 360;
const H = 230;

const HALO = { paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 } as const;

function Linha({ ciclos, meta }: { ciclos: CicloEvolucao[]; meta: RespostaEvolucao["meta"] }) {
  const valores = ciclos.map((c) => (c.suprimido ? null : c.scoreMedio));
  const alvo = alvoDaMeta(meta.mediaBase, meta.percentual);
  const usados = [
    ...valores.filter((v): v is number => v != null),
    ...(alvo == null ? [] : [alvo]),
  ];
  const { lo, hi, marcas } = eixoScore(usados);
  const n = ciclos.length;
  const X = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const Y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ultimo = n - 1;
  const alvoY = alvo == null ? null : Y(alvo);
  const resumo = [
    ...ciclos.map(
      (c, i) => `${rotuloEixo(c.ciclo.nome)} ${valores[i] == null ? "oculto" : fmt1(valores[i]!)}`,
    ),
    ...(alvo == null ? [] : [`meta do ciclo atual ${fmt1(alvo)}`]),
  ].join("; ");
  const valorUltimo = valores[ultimo];
  const abaixoDaMeta = valorUltimo != null && alvo != null && valorUltimo < alvo;

  return (
    <svg
      className="evo-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Média do score da turma por ciclo fechado: ${resumo}.`}
    >
      {marcas.map((m) => (
        <g key={m}>
          <line x1={L} x2={W - R} y1={Y(m)} y2={Y(m)} stroke="var(--line)" strokeWidth="1" />
          <text
            x={L - 6}
            y={Y(m) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--ink-2)"
            fontFamily="JetBrains Mono, monospace"
          >
            {m}
          </text>
        </g>
      ))}
      {alvoY != null && alvo != null && (
        <g data-testid="evo-meta">
          <line
            x1={L}
            x2={W - R}
            y1={alvoY}
            y2={alvoY}
            stroke="var(--warn)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text x={L + 4} y={alvoY - 6} fontSize="11" fill="var(--ink)" {...HALO}>
            Meta {fmt1(alvo)}
          </text>
          <rect
            x={X(ultimo) - 5}
            y={alvoY - 5}
            width="10"
            height="10"
            transform={`rotate(45 ${X(ultimo)} ${alvoY})`}
            fill="var(--surface)"
            stroke="var(--warn)"
            strokeWidth="2"
          />
        </g>
      )}
      {trechos(valores).map((idx) => (
        <polyline
          key={idx[0]}
          fill="none"
          stroke="var(--sea)"
          strokeWidth="2"
          points={idx.map((i) => `${X(i)},${Y(valores[i]!)}`).join(" ")}
        />
      ))}
      {ciclos.map((c, i) => {
        const v = valores[i];
        return (
          <g key={c.ciclo.id}>
            <text
              x={X(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="11"
              fill="var(--ink-2)"
              fontFamily="JetBrains Mono, monospace"
            >
              {rotuloEixo(c.ciclo.nome)}
            </text>
            {v != null && (
              <g data-testid="evo-ponto">
                <circle
                  cx={X(i)}
                  cy={Y(v)}
                  r={i === ultimo ? 5 : 4}
                  fill="var(--sea)"
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
                <circle cx={X(i)} cy={Y(v)} r="14" fill="transparent">
                  <title>{`${c.ciclo.nome}: ${fmt1(v)} (${c.atletas} atletas)`}</title>
                </circle>
                {i === ultimo && (
                  <text
                    x={X(i)}
                    y={Y(v) + (abaixoDaMeta ? 20 : -10)}
                    textAnchor="end"
                    fontSize="12"
                    fontWeight="600"
                    fill="var(--ink)"
                    {...HALO}
                  >
                    {fmt1(v)}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ResumoMeta({ evolucao }: { evolucao: RespostaEvolucao }) {
  const { meta, ciclos } = evolucao;
  const pct = meta.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const base = meta.cicloBase;
  if (!base) return null;
  const algumOculto = ciclos.some((c) => c.suprimido);
  return (
    <p className="evo-meta" data-testid="evo-resumo-meta">
      <i className="ph ph-target" aria-hidden="true" />
      <span>
        Meta: +{pct}% sobre {base.nome}. Realizado:{" "}
        {meta.variacaoPercentual == null ? (
          algumOculto ? (
            "oculto (grupo pequeno)."
          ) : (
            "indisponível."
          )
        ) : (
          <>
            <b>{fmtPercentualSinal(meta.variacaoPercentual)}</b>{" "}
            {meta.atingida != null && (
              <b>
                <i
                  className={`ph ${meta.atingida ? "ph-check-circle" : "ph-x-circle"}`}
                  aria-hidden="true"
                />{" "}
                ({meta.atingida ? "atingida" : "não atingida"})
              </b>
            )}
          </>
        )}
      </span>
    </p>
  );
}

function PorPilar({ anterior, atual }: { anterior: CicloEvolucao; atual: CicloEvolucao }) {
  const rAnt = rotuloEixo(anterior.ciclo.nome);
  const rAtu = rotuloEixo(atual.ciclo.nome);
  if (anterior.suprimido || atual.suprimido) {
    return <p className="muted inv-nota">Média por pilar oculta. {AVISO_SUPRIMIDO}</p>;
  }
  const semDado = [anterior, atual].filter((c) => c.mediaPorPilar == null);
  if (semDado.length > 0) {
    return (
      <p className="muted inv-nota">
        {SEM_DADO} ({semDado.map((c) => c.ciclo.nome).join(" e ")}): fechado antes do congelamento
        completo, só tem score e faixa.
      </p>
    );
  }
  const antes = new Map(anterior.mediaPorPilar!.map((p) => [p.pilarId, p]));
  return (
    <>
      <div className="legend" aria-hidden="true">
        <span>
          <i className="evo-cor-ant" />
          Anterior ({rAnt})
        </span>
        <span>
          <i className="seg-sea" />
          Atual ({rAtu})
        </span>
      </div>
      <ul className="inv-lista evo-pilares">
        {atual.mediaPorPilar!.map((p) => {
          const a = antes.get(p.pilarId)?.media ?? null;
          const dif = a != null && p.media != null ? p.media - a : null;
          const estado =
            dif == null ? null : Math.abs(dif) < 0.05 ? "igual" : dif > 0 ? "subiu" : "caiu";
          return (
            <li className="evo-pilar" key={p.pilarId}>
              <span className="evo-pilar-nome">{p.nomeCurto}</span>
              <span className="evo-barras">
                {[
                  { rot: rAnt, v: a, cls: "evo-cor-ant" },
                  { rot: rAtu, v: p.media, cls: "seg-sea" },
                ].map((b) => (
                  <span className="evo-linha" key={b.rot}>
                    <span className="evo-rot">{b.rot}</span>
                    <span className="evo-trilho" aria-hidden="true">
                      <span className={b.cls} style={{ width: `${((b.v ?? 0) / 5) * 100}%` }} />
                    </span>
                    <span className="n">{b.v == null ? "—" : fmt1(b.v)}</span>
                  </span>
                ))}
              </span>
              <span className="evo-delta">
                {dif == null ? (
                  "—"
                ) : (
                  <>
                    <i
                      className={`ph ${estado === "subiu" ? "ph-arrow-up" : estado === "caiu" ? "ph-arrow-down" : "ph-equals"}`}
                      aria-hidden="true"
                    />{" "}
                    {fmtPontosSinal(dif)} ({estado})
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Tabela({ ciclos }: { ciclos: CicloEvolucao[] }) {
  return (
    <details className="evo-tabela">
      <summary>Ver os números em tabela</summary>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabela da evolução da turma, role para ver todas as colunas"
      >
        <table className="data">
          <caption className="sr-only">Evolução da turma por ciclo fechado</caption>
          <thead>
            <tr>
              <th scope="col">Ciclo</th>
              <th scope="col" className="num">
                Atletas
              </th>
              <th scope="col" className="num">
                Score médio
              </th>
              <th scope="col" className="num">
                Aptos nos 4 gates
              </th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => (
              <tr key={c.ciclo.id}>
                <th scope="row" className="nw">
                  {c.ciclo.nome}
                </th>
                <td className="num">{fmt0(c.atletas)}</td>
                <td className="num">
                  {c.suprimido ? "Oculto" : c.scoreMedio == null ? "—" : fmt1(c.scoreMedio)}
                </td>
                <td className="num">
                  {c.suprimido
                    ? "Oculto"
                    : c.aptosNosGates == null
                      ? SEM_DADO
                      : fmt0(c.aptosNosGates)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Evolução da turma entre ciclos fechados e meta. Só agregados; o sigilo (grupo pequeno) vem da API. */
export function EvolucaoTurma() {
  const [classeId, setClasseId] = useState("");
  const ranking = useRanking({});
  const classes = [
    ...new Map(
      (ranking.data?.itens ?? []).map((i) => [i.atleta.classe.id, i.atleta.classe.nome]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const consulta = useEvolucao(classeId || undefined);
  const d = consulta.data;
  const ciclos = d?.ciclos ?? [];
  const anterior = ciclos.length >= 2 ? ciclos[ciclos.length - 2]! : null;
  const atual = ciclos.length >= 2 ? ciclos[ciclos.length - 1]! : null;
  const algumOculto = ciclos.some((c) => c.suprimido);

  return (
    <section className="panel evo" aria-labelledby="inv-evolucao">
      <div className="panel-head">
        <h2 id="inv-evolucao">Evolução da turma</h2>
        <label className="field inv-seletor" htmlFor="inv-evo-classe">
          Classe
          <select
            id="inv-evo-classe"
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
          >
            <option value="">Todas as classes</option>
            {classes.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {consulta.isPending ? (
        <p role="status" className="muted">
          Carregando evolução…
        </p>
      ) : consulta.error || !d ? (
        <p role="alert" className="muted">
          {mensagemDeErro(consulta.error)}
        </p>
      ) : !anterior || !atual ? (
        <EstadoVazio
          icone="chart-line-up"
          titulo="Ainda não há dois ciclos fechados"
          texto="A evolução e a meta da turma aparecem depois do fechamento do segundo ciclo, quando há média anterior para comparar."
        />
      ) : (
        <>
          {algumOculto && (
            <p className="note inv-aviso" role="status">
              {AVISO_SUPRIMIDO}
            </p>
          )}
          <ResumoMeta evolucao={d} />
          <figure className="evo-figura">
            <figcaption>
              Média do score da turma por ciclo fechado, com a meta do ciclo atual (0 a 100)
            </figcaption>
            <Linha ciclos={ciclos} meta={d.meta} />
            <div className="legend" aria-hidden="true">
              <span>
                <svg width="22" height="10" aria-hidden="true">
                  <line x1="0" x2="22" y1="5" y2="5" stroke="var(--sea)" strokeWidth="2" />
                  <circle cx="11" cy="5" r="3.5" fill="var(--sea)" />
                </svg>
                Média da turma
              </span>
              <span>
                <svg width="22" height="10" aria-hidden="true">
                  <line
                    x1="0"
                    x2="22"
                    y1="5"
                    y2="5"
                    stroke="var(--warn)"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  />
                </svg>
                Meta do ciclo atual
              </span>
            </div>
          </figure>
          <Tabela ciclos={ciclos} />
          <h3 className="par-sub">
            Média por pilar: {atual.ciclo.nome} contra {anterior.ciclo.nome}
          </h3>
          <PorPilar anterior={anterior} atual={atual} />
        </>
      )}
    </section>
  );
}
