import { Link } from "@tanstack/react-router";
import { StatusPill } from "./StatusPill";
import { fmt0, fmt1, fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useInvestimento } from "@/lib/api/investimento";
import "@/styles/investimento.css";

const OPACIDADE_FUNIL = [1, 0.75, 0.5, 0.3];

export interface TelaInvestimentoProps {
  papel: string;
}

/** Painel de investimento: todos os números e recortes vêm da API. */
export function TelaInvestimento({ papel }: TelaInvestimentoProps) {
  const consulta = useInvestimento();
  const d = consulta.data;
  const ibvar = papel === "ibvar";
  const ocultos = d?.ocultosSemConsentimento ?? 0;
  const maxFunil = Math.max(...(d?.funil ?? []).map((f) => f.n), 1);

  return (
    <>
      <div className="page-head">
        <div>
          {d?.ciclo && (
            <div className="eyebrow">
              Piloto 18+ · ciclo de {d.ciclo.nome} · prazo {fmtData(d.ciclo.prazo)}
            </div>
          )}
          <h1>Painel de investimento</h1>
          <p>
            Onde o recurso rende mais: talento, gates e dependência de apoio lado a lado. A visão
            individual só aparece com consentimento do atleta.
          </p>
        </div>
      </div>
      {consulta.isPending ? (
        <p role="status" className="muted">
          Carregando painel…
        </p>
      ) : consulta.error || !d ? (
        <div className="panel empty-state" role="alert">
          {mensagemDeErro(consulta.error)}
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="v">{fmt0(d.kpis.atletas)}</div>
              <div className="l">atletas no piloto</div>
            </div>
            <div className="kpi">
              <div className="v">{fmt1(d.kpis.scoreMedio)}</div>
              <div className="l">score médio</div>
            </div>
            <div className="kpi">
              <div className="v">{fmt0(d.kpis.aptos)}</div>
              <div className="l">aptos nos 4 gates</div>
            </div>
            <div className="kpi">
              <div className="v">{fmt0(d.kpis.dependentesApoio)}</div>
              <div className="l">dependem de apoio (perfil C ou D)</div>
            </div>
          </div>
          <div className="grid-2">
            <div className="stack">
              <section className="panel" aria-labelledby="inv-onde">
                <div className="panel-head">
                  <h2 id="inv-onde">Onde investir</h2>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    Score 75+, gates não bloqueados e perfil C ou D
                  </span>
                </div>
                <div className="table-scroll">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Atleta</th>
                        <th>Classe</th>
                        <th className="r">Score</th>
                        <th>Gates</th>
                        <th>Suporte</th>
                        {!ibvar && <th className="r">Assegurado</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {d.ondeInvestir.length === 0 ? (
                        <tr>
                          <td colSpan={ibvar ? 5 : 6} className="muted">
                            Nenhum atleta nesse recorte.
                          </td>
                        </tr>
                      ) : (
                        d.ondeInvestir.map((x) => (
                          <tr key={x.atleta.id}>
                            <td>
                              <Link to="/atletas/$id" params={{ id: x.atleta.id }}>
                                {x.atleta.nome}
                              </Link>
                            </td>
                            <td>{x.atleta.classe.nome}</td>
                            <td className="r">
                              <b>{fmt1(x.score)}</b>
                            </td>
                            <td>
                              <StatusPill status={x.statusGates} />
                            </td>
                            <td>{x.perfilSuporte}</td>
                            {!ibvar && (
                              <td className="r">
                                {x.mesesAssegurados == null ? "—" : `${x.mesesAssegurados} meses`}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="muted inv-nota">
                  Alto potencial com campanha dependente de apoio: é aqui que o investimento muda a
                  trajetória.
                </p>
                {ibvar && ocultos > 0 && (
                  <p className="muted inv-oculto">
                    {ocultos}{" "}
                    {ocultos === 1
                      ? "atleta sem consentimento entra"
                      : "atletas sem consentimento entram"}{" "}
                    só nos números agregados.
                  </p>
                )}
              </section>
              <section className="panel" aria-labelledby="inv-gates">
                <div className="panel-head">
                  <h2 id="inv-gates">Gates aos 18</h2>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {d.kpis.atletas} atletas
                  </span>
                </div>
                <ul className="hbars inv-lista">
                  {d.gates.map((g) => {
                    const total = g.apto + g.condicional + g.alerta || 1;
                    const pct = (n: number) => `${(n / total) * 100}%`;
                    return (
                      <li className="inv-gate" key={g.gate}>
                        <span>
                          G{g.gate} {g.nome}
                        </span>
                        <span className="bar" aria-hidden="true">
                          <span className="seg-good" style={{ width: pct(g.apto) }} />
                          <span className="seg-warn" style={{ width: pct(g.condicional) }} />
                          <span className="seg-bad" style={{ width: pct(g.alerta) }} />
                        </span>
                        <span className="contagem">
                          {g.apto} aptos · {g.condicional} condicionais · {g.alerta} em alerta
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="legend" aria-hidden="true">
                  <span>
                    <i className="seg-good" />
                    Apto
                  </span>
                  <span>
                    <i className="seg-warn" />
                    Condicional
                  </span>
                  <span>
                    <i className="seg-bad" />
                    Sinal de alerta
                  </span>
                </div>
              </section>
            </div>
            <div className="stack">
              <section className="panel" aria-labelledby="inv-funil">
                <div className="panel-head">
                  <h2 id="inv-funil">Funil por faixa de score</h2>
                </div>
                <ul className="hbars inv-lista">
                  {d.funil.map((f, i) => (
                    <li className="hbar" key={f.faixa.id}>
                      <span>{f.faixa.nome}</span>
                      <span className="bar" aria-hidden="true">
                        <span
                          className="seg-sea"
                          style={{
                            width: `${(f.n / maxFunil) * 100}%`,
                            opacity: OPACIDADE_FUNIL[i] ?? 0.3,
                          }}
                        />
                      </span>
                      <span className="n">{f.n}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="panel" aria-labelledby="inv-pilares">
                <div className="panel-head">
                  <h2 id="inv-pilares">Média por pilar</h2>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    nota de 0 a 5
                  </span>
                </div>
                <ul className="hbars inv-lista">
                  {[...d.mediaPilares]
                    .sort((a, b) => (a.media ?? -1) - (b.media ?? -1))
                    .map((p) => (
                      <li className="hbar" key={p.pilarId}>
                        <span>{p.nomeCurto}</span>
                        <span className="bar" aria-hidden="true">
                          <span
                            className={p.media != null && p.media < 3.5 ? "seg-warn" : "seg-sea"}
                            style={{ width: `${((p.media ?? 0) / 5) * 100}%` }}
                          />
                        </span>
                        <span className="n">{p.media == null ? "—" : fmt1(p.media)}</span>
                      </li>
                    ))}
                </ul>
                <p className="muted inv-nota">
                  Pilares abaixo de 3,5 em laranja: apontam onde o programa como um todo precisa de
                  investimento.
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
