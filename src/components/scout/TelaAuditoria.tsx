import { useState } from "react";
import { ROTULO_ACAO, ROTULO_ENTIDADE, rotuloAcao, rotuloEntidade } from "./auditoria-rotulos";
import { EstadoVazio } from "./EstadoVazio";
import { fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useAtletasGestao } from "@/lib/api/usuarios";
import {
  FILTROS_VAZIOS,
  useAuditoria,
  type EventoAuditoria,
  type FiltrosAuditoria,
} from "@/lib/api/auditoria";
import "@/styles/auditoria.css";

const ROTULO_PAPEL: Record<string, string> = {
  gestor: "gestor",
  treinador: "treinador",
  atleta: "atleta",
  ibvar: "IBVAR",
};

/** "06/11/2026 14:32" no fuso de Brasília. */
function fmtQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const dia = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return `${fmtData(dia)} ${hora}`;
}

/** Trilha de auditoria (gestor): filtros, tabela e paginação por cursor. */
export function TelaAuditoria() {
  const [rascunho, setRascunho] = useState<FiltrosAuditoria>(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_VAZIOS);
  const q = useAuditoria(filtros);
  const atletas = useAtletasGestao();
  const itens = q.data?.pages.flatMap((p) => p.itens) ?? [];
  const campo = (k: keyof FiltrosAuditoria) => (valor: string) =>
    setRascunho((r) => ({ ...r, [k]: valor }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Governança</div>
          <h1>Trilha de auditoria</h1>
          <p>Quem fez o quê e quando, do mais recente para o mais antigo. Só leitura.</p>
        </div>
      </div>
      <div className="stack">
        <section className="panel" aria-labelledby="aud-filtros-t">
          <div className="panel-head">
            <h2 id="aud-filtros-t">Filtros</h2>
          </div>
          <form
            className="aud-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFiltros(rascunho);
            }}
          >
            <label className="field" htmlFor="aud-acao">
              Ação
              <select
                id="aud-acao"
                value={rascunho.acao}
                onChange={(e) => campo("acao")(e.target.value)}
              >
                <option value="">Todas</option>
                {Object.entries(ROTULO_ACAO)
                  .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field" htmlFor="aud-entidade">
              Entidade
              <select
                id="aud-entidade"
                value={rascunho.entidade}
                onChange={(e) => campo("entidade")(e.target.value)}
              >
                <option value="">Todas</option>
                {Object.entries(ROTULO_ENTIDADE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                    {k === "atletas" ? " (cadastro)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="aud-atleta">
              Atleta
              <select
                id="aud-atleta"
                value={rascunho.atletaId}
                onChange={(e) => campo("atletaId")(e.target.value)}
              >
                <option value="">Todos</option>
                {(atletas.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="aud-datas">
              <label className="field" htmlFor="aud-desde">
                Desde
                <input
                  id="aud-desde"
                  type="date"
                  value={rascunho.desde}
                  onChange={(e) => campo("desde")(e.target.value)}
                />
              </label>
              <label className="field" htmlFor="aud-ate">
                Até
                <input
                  id="aud-ate"
                  type="date"
                  value={rascunho.ate}
                  onChange={(e) => campo("ate")(e.target.value)}
                />
              </label>
            </div>
            <div className="aud-botoes">
              <button type="submit" className="btn primary">
                Filtrar
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRascunho(FILTROS_VAZIOS);
                  setFiltros(FILTROS_VAZIOS);
                }}
              >
                Limpar
              </button>
            </div>
          </form>
        </section>
        <section className="panel" aria-labelledby="aud-lista-t">
          <div className="panel-head">
            <h2 id="aud-lista-t">Eventos</h2>
          </div>
          {q.isPending ? (
            <p className="muted" role="status">
              Carregando eventos…
            </p>
          ) : q.isError ? (
            <div className="note" role="alert">
              {mensagemDeErro(q.error)}
            </div>
          ) : itens.length === 0 ? (
            <EstadoVazio
              icone="list-magnifying-glass"
              titulo="Nenhum evento para estes filtros."
              texto="Amplie o período ou limpe os filtros para ver mais eventos."
            />
          ) : (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Tabela de trilha de auditoria, role para ver todas as colunas"
            >
              <table className="data interativa aud-tabela">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((e) => (
                    <Linha key={e.id} e={e} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {q.hasNextPage && (
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => void q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
              >
                {q.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Linha({ e }: { e: EventoAuditoria }) {
  const temDetalhes = e.detalhes !== null && e.detalhes !== undefined;
  return (
    <tr>
      <td className="nw">{fmtQuando(e.em)}</td>
      <td>
        {e.usuario ? (
          <>
            {e.usuario.nome}{" "}
            <span className="muted">({ROTULO_PAPEL[e.usuario.papel] ?? e.usuario.papel})</span>
          </>
        ) : (
          <span className="muted">Sistema</span>
        )}
      </td>
      <td>{rotuloAcao(e.acao)}</td>
      <td className="nw">
        {rotuloEntidade(e.entidade)}
        {e.entidadeId && (
          <span className="muted aud-id" title={e.entidadeId}>
            {e.entidadeId.slice(0, 8)}
          </span>
        )}
      </td>
      <td>
        {temDetalhes ? (
          <details className="aud-det">
            <summary>Ver detalhes</summary>
            <pre className="aud-json">{JSON.stringify(e.detalhes, null, 1)}</pre>
          </details>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}
