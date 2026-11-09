import { useState } from "react";
import { fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  FILTROS_VAZIOS,
  useAuditoria,
  type EventoAuditoria,
  type FiltrosAuditoria,
} from "@/lib/api/auditoria";
import "@/styles/auditoria.css";

export const ROTULO_ACAO: Record<string, string> = {
  lancar_avaliacao: "Lançou avaliação",
  decidir_gate: "Decidiu gate",
  cadastrar_atleta: "Cadastrou atleta",
  registrar_aceite_termo: "Registrou aceite do termo",
  atualizar_parametros: "Atualizou parâmetros",
  abrir_ciclo: "Abriu ciclo",
  fechar_ciclo: "Fechou ciclo",
  ajustar_prazo_ciclo: "Ajustou prazo do ciclo",
  informar_financeiro: "Informou financeiro",
  lancar_resultado: "Lançou resultado",
  pedir_revisao: "Pediu revisão de nota",
  responder_revisao: "Respondeu revisão de nota",
  alterar_consentimento: "Alterou consentimento",
  responder_questionario: "Respondeu questionário",
  importar_csv: "Importou CSV",
  exportar_dados: "Exportou dados",
  pedir_titular: "Fez pedido do titular",
  responder_titular: "Respondeu pedido do titular",
  anexar_evidencia: "Anexou evidência",
  acessar_evidencia: "Acessou evidência",
  registrar_plano: "Registrou plano individual",
};

export const rotuloAcao = (acao: string): string => ROTULO_ACAO[acao] ?? acao;

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
  const itens = q.data?.pages.flatMap((p) => p.itens) ?? [];
  const campo = (k: keyof FiltrosAuditoria) => (valor: string) =>
    setRascunho((r) => ({ ...r, [k]: valor }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gestor CBVela</div>
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
                {Object.entries(ROTULO_ACAO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="aud-entidade">
              Entidade
              <input
                id="aud-entidade"
                value={rascunho.entidade}
                onChange={(e) => campo("entidade")(e.target.value)}
                placeholder="ex.: atleta"
              />
            </label>
            <label className="field" htmlFor="aud-atleta">
              Atleta (id)
              <input
                id="aud-atleta"
                value={rascunho.atletaId}
                onChange={(e) => campo("atletaId")(e.target.value)}
              />
            </label>
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
            <div className="btn-row">
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
            <p className="muted">Nenhum evento para estes filtros.</p>
          ) : (
            <div className="table-scroll">
              <table className="data">
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
      <td>{fmtQuando(e.em)}</td>
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
      <td>
        {e.entidade}
        {e.entidadeId && <span className="muted aud-id"> {e.entidadeId}</span>}
      </td>
      <td>
        {temDetalhes ? (
          <details className="aud-det">
            <summary>Ver detalhes</summary>
            <pre>{JSON.stringify(e.detalhes, null, 1)}</pre>
          </details>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}
