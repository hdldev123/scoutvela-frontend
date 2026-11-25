import { useState } from "react";
import { toast } from "sonner";
import { EstadoVazio } from "./EstadoVazio";
import { fmtData, fmtDataHora } from "./formato";
import { eixoPosicao, instante, rotuloMes, textoPontos } from "./ranking-ws-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  ROTULO_STATUS_BUSCA,
  resumoDaBusca,
  seriesDoRanking,
  useAtualizarWorldSailing,
  useSecaoWorldSailing,
  type SerieRanking,
} from "@/lib/api/world-sailing";
import "@/styles/investimento.css";
import "@/styles/world-sailing.css";

const L = 40;
const R = 16;
const T = 16;
const B = 30;
const W = 420;
const H = 220;

const linkSeguro = (url: string): string | null => (/^https:\/\//i.test(url) ? url : null);

/** Linha da série: posição no tempo, com o 1º lugar no topo. */
function Grafico({ serie }: { serie: SerieRanking }) {
  const pts = serie.pontos;
  const { topo, base, marcas } = eixoPosicao(pts.map((p) => p.posicao));
  const t0 = instante(pts[0]!.data);
  const t1 = instante(pts[pts.length - 1]!.data);
  const X = (data: string) =>
    t1 === t0 ? (L + W - R) / 2 : L + ((instante(data) - t0) / (t1 - t0)) * (W - L - R);
  const Y = (pos: number) => T + ((pos - topo) / (base - topo)) * (H - T - B);
  const resumo = pts
    .map((p) => `${rotuloMes(p.data)}: ${p.posicao}º lugar, ${textoPontos(p)}`)
    .join("; ");
  const rotulosX = pts.length <= 2 ? pts : [pts[0]!, pts[pts.length - 1]!];
  return (
    <svg
      className="evo-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Posição no ranking da World Sailing, ${serie.rotulo}, do mais antigo ao mais novo. Quanto menor o número, melhor a posição. ${resumo}.`}
      data-testid="ws-grafico"
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
            {m}º
          </text>
        </g>
      ))}
      {pts.length > 1 && (
        <polyline
          fill="none"
          stroke="var(--sea)"
          strokeWidth="2"
          points={pts.map((p) => `${X(p.data)},${Y(p.posicao)}`).join(" ")}
        />
      )}
      {pts.map((p) => (
        <g key={p.data} data-testid="ws-ponto">
          <circle
            cx={X(p.data)}
            cy={Y(p.posicao)}
            r="4"
            fill="var(--sea)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
          <circle cx={X(p.data)} cy={Y(p.posicao)} r="12" fill="transparent">
            <title>{`${fmtData(p.data)}: ${p.posicao}º lugar, ${textoPontos(p)}`}</title>
          </circle>
        </g>
      ))}
      {rotulosX.map((p, i) => (
        <text
          key={p.data}
          x={X(p.data)}
          y={H - 10}
          textAnchor={pts.length === 1 ? "middle" : i === 0 ? "start" : "end"}
          fontSize="11"
          fill="var(--ink-2)"
          fontFamily="JetBrains Mono, monospace"
        >
          {rotuloMes(p.data)}
        </text>
      ))}
    </svg>
  );
}

function TabelaRanking({ serie }: { serie: SerieRanking }) {
  // Do mais recente ao mais antigo, como a API devolve.
  const linhas = [...serie.pontos].reverse();
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Tabela do histórico de ranking, role para ver todas as colunas"
    >
      <table className="data">
        <caption className="sr-only">Histórico de ranking na World Sailing, {serie.rotulo}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col" className="num">
              Posição
            </th>
            <th scope="col" className="num">
              Pontos
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => (
            <tr key={p.data}>
              <th scope="row" className="nw">
                {fmtData(p.data)}
              </th>
              <td className="num">{p.posicao}º</td>
              <td className="num">{p.pontos == null ? "—" : p.pontos.toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Seção "World Sailing" da ficha (gestor, treinador do atleta e o próprio atleta): link do perfil
 * público, última busca, botão de atualizar (gestor e treinador) e o histórico de ranking. O
 * ranking é só informação e não entra na nota. O IBVAR não monta esta seção (a API devolve 403).
 */
export function SecaoWorldSailing({ atletaId, papel }: { atletaId: string; papel: string }) {
  const secao = useSecaoWorldSailing(atletaId);
  const atualizar = useAtualizarWorldSailing(atletaId);
  const [escolhida, setEscolhida] = useState("");
  const dados = secao.data;
  if (!dados) return null;

  const series = seriesDoRanking(dados.ranking);
  const serie = series.find((s) => s.chave === escolhida) ?? series[0];
  const link = linkSeguro(dados.perfilUrl);
  const podeAtualizar = (papel === "gestor" || papel === "treinador") && dados.importacaoAtiva;
  const ultima = dados.ultimaImportacao;

  function buscar() {
    atualizar.mutate(undefined, {
      onSuccess: (r) => {
        const texto = resumoDaBusca(r);
        if (r.status === "ok") toast.success(texto);
        else if (r.status === "desligado") toast(texto);
        else toast.error(texto);
      },
      onError: (e) =>
        toast.error(mensagemDeErro(e, "Não foi possível atualizar da World Sailing.")),
    });
  }

  return (
    <section className="panel ordem-worldsailing" aria-labelledby="ws-titulo">
      <div className="panel-head">
        <h2 id="ws-titulo">World Sailing</h2>
        {podeAtualizar && (
          <button type="button" className="btn sm" disabled={atualizar.isPending} onClick={buscar}>
            <i className="ph ph-arrows-clockwise" aria-hidden="true" />{" "}
            {atualizar.isPending ? "Atualizando…" : "Atualizar da World Sailing"}
          </button>
        )}
      </div>
      <p className="ws-status">
        {ultima ? (
          <>
            Última atualização: <b>{fmtDataHora(ultima.em)}</b> ·{" "}
            {ROTULO_STATUS_BUSCA[ultima.status]}
          </>
        ) : dados.importacaoAtiva ? (
          "Ainda não houve busca na World Sailing para este atleta."
        ) : (
          "A importação da World Sailing está desligada neste ambiente."
        )}
      </p>
      {link && (
        <p className="ws-perfil">
          <a href={link} target="_blank" rel="noopener noreferrer">
            Ver perfil público na World Sailing
            <i className="ph ph-arrow-square-out" aria-hidden="true" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </p>
      )}
      <h3 className="ws-sub">Histórico de ranking</h3>
      {!serie ? (
        <EstadoVazio
          icone="chart-line"
          titulo="Sem histórico de ranking importado"
          texto={
            papel === "atleta"
              ? "O histórico aparece aqui quando a World Sailing tiver posições para o seu ID."
              : "O histórico aparece depois de uma busca que encontre posições para este ID."
          }
        />
      ) : (
        <>
          {series.length > 1 && (
            <div className="field ws-filtro">
              <label htmlFor="ws-serie">Classe e tipo de ranking</label>
              <select
                id="ws-serie"
                value={serie.chave}
                onChange={(e) => setEscolhida(e.target.value)}
              >
                {series.map((s) => (
                  <option key={s.chave} value={s.chave}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
            </div>
          )}
          <figure className="evo-figura">
            <figcaption>{serie.rotulo}: posição ao longo do tempo (1º lugar no topo)</figcaption>
            <Grafico serie={serie} />
          </figure>
          <details className="evo-tabela" open>
            <summary>Números em tabela</summary>
            <TabelaRanking serie={serie} />
          </details>
        </>
      )}
      <p className="panel-dica">
        O ranking da World Sailing é só informação e não entra na nota. Os resultados de regata
        importados aparecem no histórico competitivo, com o selo World Sailing.
      </p>
    </section>
  );
}
