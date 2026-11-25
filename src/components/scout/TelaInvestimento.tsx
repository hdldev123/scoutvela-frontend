import { Link } from "@tanstack/react-router";
import { StatusPill } from "./StatusPill";
import { fmt0, fmt1, fmtData, fmtInstante } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useInvestimento } from "@/lib/api/investimento";
import "@/styles/investimento.css";

const OPACIDADE_FUNIL = [1, 0.75, 0.5, 0.3];

export interface TelaInvestimentoProps {
  papel: string;
  /** Ciclo escolhido na URL; sem ele a API abre no último ciclo fechado. */
  ciclo?: string | undefined;
  aoMudarCiclo?: (ciclo: string) => void;
}

const SEM_DADO = "Sem dado neste ciclo";

/** Painel de investimento: todos os números e recortes vêm da API. */
export function TelaInvestimento({ papel, ciclo, aoMudarCiclo }: TelaInvestimentoProps) {
  const consulta = useInvestimento(ciclo);
  const d = consulta.data;
  const exibido = d?.cicloExibido ?? null;
  const congelado = d?.congelamentoCompleto ?? true;
  const ibvar = papel === "ibvar";
  const ocultos = d?.ocultosSemConsentimento ?? 0;
  const maxFunil = Math.max(...(d?.funil ?? []).map((f) => f.n), 1);

  return (
    <>
      <div className="page-head">
        <div>
          {exibido && (
            <div className="eyebrow">
              Ciclo {exibido.nome}{" "}
              {exibido.fechadoEm
                ? `(fechado em ${fmtInstante(exibido.fechadoEm)})`
                : `(em andamento, prazo ${fmtData(exibido.prazo)})`}
              {d?.dadosAtualizadosEm && ` · dados até ${fmtInstante(d.dadosAtualizadosEm)}`}
            </div>
          )}
          <h1>Painel de investimento</h1>
          <p>
            Onde o recurso rende mais: talento, gates e dependência de apoio lado a lado. A visão
            individual só aparece com consentimento do atleta.
          </p>
        </div>
        {d && d.ciclosDisponiveis.length > 0 && (
          <label className="field inv-seletor" htmlFor="inv-ciclo">
            Ciclo
            <select
              id="inv-ciclo"
              value={exibido?.id ?? ""}
              onChange={(e) => aoMudarCiclo?.(e.target.value)}
            >
              {d.ciclosDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.status === "aberto" ? " (em andamento)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {d?.parcial && exibido && (
        <p className="note inv-aviso" role="status">
          <span className="pill st-parcial">Parcial</span>
          Este ciclo ainda está aberto: os números mudam a cada lançamento até o fechamento.
        </p>
      )}
      {d && !congelado && (
        <p className="note inv-aviso" role="status">
          Este ciclo foi fechado antes do congelamento completo: só score e faixa foram guardados.
        </p>
      )}
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
              <i className="ph ph-users kpi-icone" aria-hidden="true" />
              <div className="v">{fmt0(d.kpis.atletas)}</div>
              <div className="l">atletas no piloto</div>
            </div>
            <div className="kpi">
              <i className="ph ph-gauge kpi-icone" aria-hidden="true" />
              <div className="v">{fmt1(d.kpis.scoreMedio)}</div>
              <div className="l">score médio</div>
            </div>
            <div className="kpi">
              <i className="ph ph-seal-check kpi-icone" aria-hidden="true" />
              <div className="v">{d.kpis.aptos == null ? "—" : fmt0(d.kpis.aptos)}</div>
              <div className="l">aptos nos 4 gates</div>
            </div>
            <div className="kpi">
              <i className="ph ph-hand-coins kpi-icone" aria-hidden="true" />
              <div className="v">
                {d.kpis.dependentesApoio == null ? "—" : fmt0(d.kpis.dependentesApoio)}
              </div>
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
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela de onde investir, role para ver todas as colunas"
                >
                  <table className="data interativa inv-tabela">
                    <thead>
                      <tr>
                        <th>Atleta</th>
                        <th>Classe</th>
                        <th className="num">Score</th>
                        <th>Gates</th>
                        <th>Suporte</th>
                        {!ibvar && <th className="num">Assegurado</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {d.ondeInvestir.length === 0 ? (
                        <tr>
                          <td colSpan={ibvar ? 5 : 6} className="muted">
                            {congelado ? "Nenhum atleta nesse recorte." : SEM_DADO}
                          </td>
                        </tr>
                      ) : (
                        d.ondeInvestir.map((x) => (
                          <tr key={x.atleta.id}>
                            <td className="nw">
                              <Link to="/atletas/$id" params={{ id: x.atleta.id }}>
                                {x.atleta.nome}
                              </Link>
                            </td>
                            <td className="nw">{x.atleta.classe.nome}</td>
                            <td className="num">
                              <b>{fmt1(x.score)}</b>
                            </td>
                            <td className="nw">
                              <StatusPill status={x.statusGates} />
                            </td>
                            <td className="nw">
                              <span className="pill st-neutro">{x.perfilSuporte}</span>
                            </td>
                            {!ibvar && (
                              <td className="num nw">
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
                {ibvar && congelado && ocultos > 0 && (
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
                {!congelado ? (
                  <p className="muted inv-nota">{SEM_DADO}.</p>
                ) : (
                  <ul className="hbars inv-lista">
                    {d.gates.map((g) => {
                      const apto = g.apto ?? 0;
                      const cond = g.condicional ?? 0;
                      const alerta = g.alerta ?? 0;
                      const total = apto + cond + alerta || 1;
                      const pct = (n: number) => `${(n / total) * 100}%`;
                      return (
                        <li className="inv-gate" key={g.gate}>
                          <span>
                            G{g.gate} {g.nome}
                          </span>
                          <span className="bar" aria-hidden="true">
                            <span className="seg-good" style={{ width: pct(apto) }} />
                            <span className="seg-warn" style={{ width: pct(cond) }} />
                            <span className="seg-bad" style={{ width: pct(alerta) }} />
                          </span>
                          <span className="contagem">
                            {apto} aptos · {cond} condicionais · {alerta} em alerta
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
                {!congelado ? (
                  <p className="muted inv-nota">{SEM_DADO}.</p>
                ) : (
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
                )}
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
