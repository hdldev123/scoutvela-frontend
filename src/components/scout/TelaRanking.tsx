import { Link } from "@tanstack/react-router";
import { Avatar } from "./Avatar";
import { FaixaPill } from "./FaixaPill";
import { PilaresStrip } from "./PilaresStrip";
import { EstadoVazio } from "./EstadoVazio";
import { StatusPill } from "./StatusPill";
import { fmt0, fmt1, fmtData } from "./formato";
import { filtrosLimpos, useRanking, type FiltrosRanking } from "@/lib/api/consultas";
import { useJanelaRankingCbvela } from "@/lib/api/parametros";

type ParcialFiltros = { [K in keyof FiltrosRanking]?: FiltrosRanking[K] | undefined };
import { mensagemDeErro } from "@/lib/api/cliente";

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
  const janela = useJanelaRankingCbvela(papel === "gestor" || papel === "treinador");
  // Opções de classe: sempre as da lista sem filtro (mesma chave quando não há filtro, sem requisição extra).
  const base = useRanking({});
  const eventos = [...new Set((base.data?.itens ?? []).map((i) => i.atleta.classe.evento))];
  if (filtros.classe && !eventos.includes(filtros.classe)) eventos.push(filtros.classe);

  const temFiltros = Object.keys(filtrosLimpos(filtros)).length > 0;
  const titulo = papel === "treinador" ? "Meus atletas" : "Ranking de talento";
  const ciclo = lista.data?.ciclo;
  const mudar = (parcial: ParcialFiltros) =>
    aoMudarFiltros(filtrosLimpos({ ...filtros, ...parcial } as FiltrosRanking));

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
            Ordem de priorização pelo score de 100 pontos, recalculado a cada lançamento. O sistema
            sugere; gates e decisões ficam com o gestor.
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
            onChange={(e) =>
              mudar({ categoria: (e.target.value || undefined) as FiltrosRanking["categoria"] })
            }
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
            onChange={(e) =>
              mudar({ faixa: (e.target.value || undefined) as FiltrosRanking["faixa"] })
            }
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
        <i className="ph ph-info" aria-hidden="true" />
        <span>
          Barras: os 9 pilares, de Performance a Carreira; tracejado = sem nota. Pontos CBVela vêm
          do ranking oficial,{" "}
          {janela ? `últimas ${janela} semanas` : "na janela de semanas definida nos parâmetros"}.
        </span>
      </p>
      <div className="rank-headrow" aria-hidden="true">
        <span>#</span>
        <span>Atleta</span>
        <span>Pilares</span>
        <span>Gates</span>
        <span className="col-dir">Pontos CBVela</span>
        <span>Faixa</span>
        <span className="col-dir">Score</span>
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
              <EstadoVazio
                icone="funnel"
                titulo="Nenhum atleta com esses filtros."
                texto={
                  temFiltros
                    ? "Nenhum atleta atende a todos os filtros ao mesmo tempo."
                    : "Ainda não há atletas para mostrar."
                }
                acao={
                  temFiltros ? (
                    <button type="button" className="btn sm" onClick={() => aoMudarFiltros({})}>
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              />
            ) : (
              lista.data.itens.map((i) => (
                <Link
                  key={i.atleta.id}
                  to="/atletas/$id"
                  params={{ id: i.atleta.id }}
                  className="rank-row"
                >
                  <span className="pos">{i.posicao}</span>
                  <span className="who">
                    <Avatar nome={i.atleta.nome} fotoUrl={i.atleta.fotoUrl} />
                    <span className="who-txt">
                      <strong>{i.atleta.nome}</strong>
                      <span className="meta">
                        <span className="meta-txt">
                          <code>{i.atleta.velaid}</code> · {i.atleta.classe.nome} · {i.atleta.idade}{" "}
                          anos
                          {i.atleta.uf ? ` · ${i.atleta.uf}` : ""}
                        </span>
                        {!i.completo && <span className="pill st-parcial">Parcial</span>}
                      </span>
                    </span>
                  </span>
                  <span className="rank-extra">
                    <PilaresStrip pilares={i.pilares} />
                    <span className="gatecell">
                      <StatusPill status={i.statusGates} ponto />
                    </span>
                    <span className="pts num">{fmt0(i.pontosCbvela)}</span>
                  </span>
                  <span className="faixacell">
                    <FaixaPill faixa={i.faixa} curto />
                  </span>
                  <span className="scorecell">{fmt1(i.score)}</span>
                </Link>
              ))
            )}
          </div>
          {papel === "ibvar" && (lista.data.ocultosSemConsentimento ?? 0) > 0 && (
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: 10 }}>
              {lista.data.ocultosSemConsentimento}{" "}
              {lista.data.ocultosSemConsentimento === 1
                ? "atleta sem consentimento entra"
                : "atletas sem consentimento entram"}{" "}
              só nos números agregados.
            </p>
          )}
        </>
      )}
    </>
  );
}
