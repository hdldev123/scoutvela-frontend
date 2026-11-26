import { useMemo, useState } from "react";
import { AcoesResultadoWorldSailing } from "./ResultadoWorldSailing";
import { fmt0, fmtData, fmtInstante } from "./formato";
import { GRUPOS_NIVEL, grupoDoNivel, rotuloNivelHistorico, type GrupoNivel } from "./niveis";
import type { FichaAtleta } from "@/lib/api/consultas";
import { situacaoDoResultado } from "@/lib/api/resultados";

type Resultado = FichaAtleta["resultados"][number];

export const TAMANHO_PAGINA_HISTORICO = 10;

const FONTE_RESULTADO: Record<string, string> = {
  ranking_cbvela: "Ranking CBVela",
  manual: "Lançado",
  atleta: "Atleta",
  world_sailing: "World Sailing",
};
const FONTES_FILTRO = [
  { valor: "world_sailing", rotulo: "World Sailing" },
  { valor: "ranking_cbvela", rotulo: "Ranking CBVela" },
  { valor: "atleta", rotulo: "Atleta" },
  { valor: "manual", rotulo: "Lançado" },
];
const NIVEIS_FILTRO = [{ valor: "todos" as const, rotulo: "Todos" }, ...GRUPOS_NIVEL];

const rotuloFonte = (fonte: string, papel: string) =>
  papel === "ibvar" ? "Lançado" : (FONTE_RESULTADO[fonte] ?? "Lançado");

/** Aceita só links http(s) do resultado oficial. */
const linkSeguro = (url: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

/**
 * Histórico competitivo: os 10 mais recentes, com "Mostrar mais", filtro por nível e por fonte
 * (o IBVAR não vê a origem, então não tem o filtro de fonte).
 */
export function HistoricoCompetitivo({
  resultados,
  papel,
  atletaId,
  podeLancar,
}: {
  resultados: Resultado[];
  papel: string;
  atletaId: string;
  podeLancar: boolean;
}) {
  const [nivel, setNivel] = useState<GrupoNivel | "todos">("todos");
  const [fonte, setFonte] = useState("todas");
  const [visiveis, setVisiveis] = useState(TAMANHO_PAGINA_HISTORICO);

  // Mais recentes primeiro; a ordenação é estável, então empates mantêm a ordem da API.
  const ordenados = useMemo(
    () => [...resultados].sort((a, b) => b.data.localeCompare(a.data)),
    [resultados],
  );
  const filtrados = ordenados.filter(
    (r) =>
      (nivel === "todos" || grupoDoNivel(r.nivel) === nivel) &&
      (fonte === "todas" || r.fonte === fonte),
  );
  const lista = filtrados.slice(0, visiveis);
  const restantes = filtrados.length - lista.length;
  const ibvar = papel === "ibvar";
  const filtrando = nivel !== "todos" || fonte !== "todas";

  const mudar = (fn: () => void) => {
    fn();
    setVisiveis(TAMANHO_PAGINA_HISTORICO);
  };

  if (resultados.length === 0) {
    return <p className="panel-dica">Nenhum resultado registrado.</p>;
  }

  return (
    <>
      <div className="hist-filtros">
        <div className="hist-grupo" role="group" aria-label="Filtrar por nível">
          {NIVEIS_FILTRO.map((g) => (
            <button
              key={g.valor}
              type="button"
              className="hist-chip"
              aria-pressed={nivel === g.valor}
              onClick={() => mudar(() => setNivel(g.valor))}
            >
              {g.rotulo}
            </button>
          ))}
        </div>
        {!ibvar && (
          <label className="hist-fonte">
            Fonte
            <select value={fonte} onChange={(e) => mudar(() => setFonte(e.target.value))}>
              <option value="todas">Todas</option>
              {FONTES_FILTRO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="hist-contagem" role="status">
        Mostrando {lista.length} de {filtrados.length}
        {filtrando ? ` (${resultados.length} no total)` : ""}
      </p>
      {filtrados.length === 0 ? (
        <p className="hist-vazio">Nenhum resultado com esse filtro.</p>
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de histórico competitivo, role para ver todas as colunas"
        >
          <table className="data tabela-hist">
            <thead>
              <tr>
                <th>Data</th>
                <th>Evento</th>
                <th className="r">Edição</th>
                <th className="r">Posição</th>
                <th className="r">Pts</th>
                <th>Fonte</th>
                {!ibvar && <th>Situação</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const link = linkSeguro(r.linkOficial);
                return (
                  <tr key={r.id}>
                    <td className="nw">{fmtData(r.data)}</td>
                    <td>
                      {r.evento}
                      <small className="sub">{rotuloNivelHistorico(r.nivel)}</small>
                    </td>
                    <td className="r nw">{r.edicao}</td>
                    <td className="r nw">
                      {r.posicao}º{r.tamanhoFrota != null ? ` de ${r.tamanhoFrota}` : ""}
                    </td>
                    <td className="r num">{r.pontosCbvela == null ? "—" : fmt0(r.pontosCbvela)}</td>
                    <td className="nw">
                      {r.fonte === "ranking_cbvela" ? (
                        <span className="pill st-info">Ranking CBVela</span>
                      ) : link ? (
                        <a
                          className={`pill ${r.fonte === "world_sailing" ? "st-info" : "st-neutro"}`}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${rotuloFonte(r.fonte, papel)} + link oficial`}
                        >
                          {rotuloFonte(r.fonte, papel)}
                          <i className="ph ph-arrow-square-out" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="pill st-neutro">{rotuloFonte(r.fonte, papel)}</span>
                      )}
                    </td>
                    {!ibvar && (
                      <td>
                        <span className={`pill ${situacaoDoResultado(r).classe}`}>
                          {situacaoDoResultado(r).rotulo}
                        </span>
                        {r.validadoPor && r.validadoEm && (
                          <small className="sub">
                            por {r.validadoPor.nome} em {fmtInstante(r.validadoEm)}
                          </small>
                        )}
                        {r.status === "recusado" && r.motivo && (
                          <small className="sub">Motivo: {r.motivo}</small>
                        )}
                        {podeLancar && (
                          <AcoesResultadoWorldSailing atletaId={atletaId} resultado={r} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {restantes > 0 && (
        <div className="hist-mais">
          <button
            type="button"
            className="btn sm"
            onClick={() => setVisiveis((v) => v + TAMANHO_PAGINA_HISTORICO)}
          >
            Mostrar mais ({Math.min(TAMANHO_PAGINA_HISTORICO, restantes)} de {restantes})
          </button>
          <button type="button" className="btn sm" onClick={() => setVisiveis(filtrados.length)}>
            Mostrar todos
          </button>
        </div>
      )}
    </>
  );
}
