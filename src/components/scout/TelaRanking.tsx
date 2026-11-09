import { Link } from "@tanstack/react-router";
import { FaixaPill } from "./FaixaPill";
import { PilaresStrip } from "./PilaresStrip";
import { StatusPill } from "./StatusPill";
import { fmt0, fmt1, fmtData } from "./formato";
import { filtrosLimpos, useRanking, type FiltrosRanking } from "@/lib/api/consultas";

type ParcialFiltros = { [K in keyof FiltrosRanking]?: FiltrosRanking[K] | undefined };
import { mensagemDeErro } from "@/lib/api/cliente";
import { iniciais } from "@/lib/auth/navegacao";

const FAIXAS = [
  { id: "f1", nome: "Prioridade de programa" },
  { id: "f2", nome: "Alto potencial" },
  { id: "f3", nome: "Em desenvolvimento" },
  { id: "f4", nome: "No radar" },
] as const;

export interface TelaRankingProps {
  papel: string;
  filtros: FiltrosRanking;
  aoMudarFiltros: (novos: FiltrosRanking) => void;
}

/** Ranking de talento: filtros vêm dos search params da rota; ordem e acesso vêm da API. */
export function TelaRanking({ papel, filtros, aoMudarFiltros }: TelaRankingProps) {
  const lista = useRanking(filtros);
  // Opções de classe: sempre as da lista sem filtro (mesma chave quando não há filtro, sem requisição extra).
  const base = useRanking({});
  const eventos = [...new Set((base.data?.itens ?? []).map((i) => i.atleta.classe.evento))];
  if (filtros.classe && !eventos.includes(filtros.classe)) eventos.push(filtros.classe);

  const titulo = papel === "treinador" ? "Meus atletas" : "Ranking de talento";
  const ciclo = lista.data?.ciclo;
  const mudar = (parcial: ParcialFiltros) => aoMudarFiltros(filtrosLimpos({ ...filtros, ...parcial } as FiltrosRanking));

  return (
    <>
      <div className="page-head">
        <div>
          {ciclo && (
            <div className="eyebrow">
              Ciclo de {ciclo.nome} · prazo {fmtData(ciclo.prazo)}
            </div>
          )}
          <h1>{titulo}</h1>
          <p>
            Ordem de priorização pelo score de 100 pontos, recalculado a cada lançamento. O sistema sugere; gates e
            decisões ficam com o gestor.
          </p>
        </div>
      </div>
      <div className="filters">
        <label className="field" htmlFor="f-classe">
          Classe
          <select
            id="f-classe"
            value={filtros.classe ?? ""}
            onChange={(e) => mudar({ classe: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {eventos.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="f-categoria">
          Categoria
          <select
            id="f-categoria"
            value={filtros.categoria ?? ""}
            onChange={(e) => mudar({ categoria: (e.target.value || undefined) as FiltrosRanking["categoria"] })}
          >
            <option value="">Todas</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
        </label>
        <label className="field" htmlFor="f-faixa">
          Faixa
          <select
            id="f-faixa"
            value={filtros.faixa ?? ""}
            onChange={(e) => mudar({ faixa: (e.target.value || undefined) as FiltrosRanking["faixa"] })}
          >
            <option value="">Todas</option>
            {FAIXAS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="f-ordem">
          Ordenar por
          <select
            id="f-ordem"
            value={filtros.ordem ?? "score"}
            onChange={(e) =>
              mudar({ ordem: e.target.value === "pontos_cbvela" ? "pontos_cbvela" : undefined })
            }
          >
            <option value="score">Score de talento</option>
            <option value="pontos_cbvela">Pontos no Ranking CBVela</option>
          </select>
        </label>
      </div>
      <p className="rank-legend">
        Barras: os 9 pilares, de Performance a Carreira. Tracejado = pilar ainda sem nota. Pontos CBVela vêm do
        ranking oficial (simulado), últimas 52 semanas.
      </p>
      <div className="rank-headrow" aria-hidden="true">
        <span>#</span>
        <span>Atleta</span>
        <span>Pilares</span>
        <span>Gates</span>
        <span style={{ textAlign: "right" }}>Ranking CBVela</span>
        <span style={{ textAlign: "right" }}>Score</span>
      </div>
      {lista.isPending ? (
        <p role="status" className="muted">
          Carregando ranking…
        </p>
      ) : lista.error ? (
        <div className="panel empty-state" role="alert">
          {mensagemDeErro(lista.error)}
        </div>
      ) : (
        <>
          <div className="rank">
            {lista.data.itens.length === 0 ? (
              <div className="panel empty-state">Nenhum atleta com esses filtros.</div>
            ) : (
              lista.data.itens.map((i) => (
                <Link key={i.atleta.id} to="/atletas/$id" params={{ id: i.atleta.id }} className="rank-row">
                  <span className="pos">{i.posicao}</span>
                  <span className="who">
                    <span className="avatar" aria-hidden="true">
                      {iniciais(i.atleta.nome)}
                    </span>
                    <span className="who-txt">
                      <strong>
                        {i.atleta.nome}
                        {!i.completo && <span className="pill st-parcial">Parcial</span>}
                      </strong>
                      <span className="meta">
                        <code>{i.atleta.velaid}</code> · {i.atleta.classe.nome} · {i.atleta.idade} anos
                        {i.atleta.uf ? ` · ${i.atleta.uf}` : ""}
                      </span>
                    </span>
                  </span>
                  <PilaresStrip pilares={i.pilares} />
                  <span className="gatecell">
                    <StatusPill status={i.statusGates} ponto />
                  </span>
                  <span className="pts num">
                    {fmt0(i.pontosCbvela)}
                    <small>pts CBVela</small>
                  </span>
                  <span className="scorebox">
                    <b>{fmt1(i.score)}</b>
                    <FaixaPill faixa={i.faixa} curto />
                  </span>
                </Link>
              ))
            )}
          </div>
          {papel === "ibvar" && (lista.data.ocultosSemConsentimento ?? 0) > 0 && (
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: 10 }}>
              {lista.data.ocultosSemConsentimento}{" "}
              {lista.data.ocultosSemConsentimento === 1 ? "atleta sem consentimento entra" : "atletas sem consentimento entram"}{" "}
              só nos números agregados.
            </p>
          )}
        </>
      )}
    </>
  );
}
