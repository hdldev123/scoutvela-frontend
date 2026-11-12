import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import { NotaRevisao } from "./NotaRevisao";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  useLancamentosRevisao,
  usePedidosTitular,
  useResponderPedidoTitular,
  useResponderRevisao,
  useRevisoes,
  type PedidoTitular,
  type Revisao,
  type StatusRevisao,
  type TipoPedido,
} from "@/lib/api/revisoes";
import "@/styles/revisoes.css";

const ROTULO_TIPO: Record<TipoPedido, string> = {
  acesso: "Acesso",
  correcao: "Correção",
  exclusao: "Exclusão",
  revogacao: "Revogação",
};

type Aba = "notas" | "titular";
type FiltroStatus = StatusRevisao | "todos";

function Status({ status }: { status: StatusRevisao }) {
  return (
    <span className={`pill ${status === "aberto" ? "st-cond" : "st-apto"}`}>
      {status === "aberto" ? "Aberto" : "Respondido"}
    </span>
  );
}

/** Pedidos de revisão de nota (gestor e treinador) e pedidos do titular (só gestor). */
export function TelaRevisoes({ papel }: { papel: string }) {
  const gestor = papel === "gestor";
  const [aba, setAba] = useState<Aba>("notas");

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{gestor ? "Gestor CBVela" : "Treinador"}</div>
          <h1>Pedidos de revisão</h1>
          <p>
            O atleta pode pedir revisão de uma nota (LGPD, art. 20). Cada resposta fica registrada
            na trilha de auditoria.
          </p>
        </div>
      </div>
      <div className="stack">
        {gestor && (
          <div className="rev-abas" role="tablist" aria-label="Tipo de pedido">
            <button
              type="button"
              role="tab"
              id="rev-aba-notas"
              aria-selected={aba === "notas"}
              aria-controls="rev-painel"
              className={`btn${aba === "notas" ? " primary" : ""}`}
              onClick={() => setAba("notas")}
            >
              Revisões de nota
            </button>
            <button
              type="button"
              role="tab"
              id="rev-aba-titular"
              aria-selected={aba === "titular"}
              aria-controls="rev-painel"
              className={`btn${aba === "titular" ? " primary" : ""}`}
              onClick={() => setAba("titular")}
            >
              Pedidos do titular (LGPD)
            </button>
          </div>
        )}
        <div
          id="rev-painel"
          role={gestor ? "tabpanel" : undefined}
          aria-labelledby={
            gestor ? (aba === "notas" ? "rev-aba-notas" : "rev-aba-titular") : undefined
          }
        >
          {aba === "notas" || !gestor ? <RevisoesNota gestor={gestor} /> : <PedidosTitular />}
        </div>
      </div>
    </>
  );
}

function FormResposta({
  rotuloBotao,
  pendente,
  erro,
  aoEnviar,
  aoCancelar,
  extra,
}: {
  rotuloBotao: string;
  pendente: boolean;
  erro: string;
  aoEnviar: (resposta: string) => void;
  aoCancelar: () => void;
  extra?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    aoEnviar(texto.trim());
  };
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
      <label className="field" htmlFor="rev-resposta">
        Resposta
        <textarea
          id="rev-resposta"
          rows={5}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          maxLength={2000}
        />
      </label>
      {extra}
      {erro && (
        <div className="note" role="alert">
          {erro}
        </div>
      )}
      <div className="btn-row">
        <button type="submit" className="btn primary" disabled={pendente || !texto.trim()}>
          {pendente ? "Enviando…" : rotuloBotao}
        </button>
        <button type="button" className="btn" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function RevisoesNota({ gestor }: { gestor: boolean }) {
  const [filtro, setFiltro] = useState<FiltroStatus>("aberto");
  const q = useRevisoes(filtro === "todos" ? undefined : filtro);
  const responder = useResponderRevisao();
  const [alvo, setAlvo] = useState<Revisao | null>(null);
  const [erro, setErro] = useState("");
  const [avaliacaoId, setAvaliacaoId] = useState("");
  const lancamentos = useLancamentosRevisao(alvo?.id);

  const enviar = (resposta: string) => {
    if (!alvo) return;
    setErro("");
    responder.mutate(
      { id: alvo.id, resposta, ...(avaliacaoId ? { avaliacaoId } : {}) },
      {
        onSuccess: () => {
          setAlvo(null);
          toast.success("Resposta registrada.");
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="rev-notas-t">
      <div className="panel-head">
        <h2 id="rev-notas-t">Revisões de nota</h2>
        <label className="rev-filtro" htmlFor="rev-status">
          Status{" "}
          <select
            id="rev-status"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroStatus)}
          >
            <option value="aberto">Abertos</option>
            <option value="respondido">Respondidos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
      </div>
      {!gestor && (
        <p className="muted">
          Você acompanha os pedidos dos seus atletas. Quem responde é o gestor da CBVela.
        </p>
      )}
      {q.isPending ? (
        <p className="muted" role="status">
          Carregando revisões…
        </p>
      ) : q.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(q.error)}
        </div>
      ) : q.data.length === 0 ? (
        <p className="muted">Nenhum pedido de revisão neste filtro.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Nota</th>
                <th>Motivo</th>
                <th>Pedido em</th>
                <th>Status</th>
                <th>Resposta</th>
                {gestor && (
                  <th>
                    <span className="rev-sr">Ação</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to="/atletas/$id" params={{ id: r.atleta.id }}>
                      {r.atleta.nome}
                    </Link>
                  </td>
                  <td>
                    {r.pilar?.nomeCurto ?? "—"}
                    {r.indicador && <span className="muted"> / {r.indicador.nome}</span>}
                  </td>
                  <td className="rev-texto">
                    {r.motivo}
                    {typeof r.notaNova === "number" && (
                      <div>
                        <span className="muted">Nota: </span>
                        <NotaRevisao notaAnterior={r.notaAnterior} notaNova={r.notaNova} />
                      </div>
                    )}
                  </td>
                  <td>{fmtData(r.criadoEm)}</td>
                  <td>
                    <Status status={r.status} />
                  </td>
                  <td className="rev-texto">
                    {r.resposta ? (
                      <>
                        {r.resposta}
                        {r.respondidoEm && (
                          <span className="muted"> ({fmtData(r.respondidoEm)})</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  {gestor && (
                    <td className="r">
                      {r.status === "aberto" && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setErro("");
                            setAvaliacaoId("");
                            setAlvo(r);
                          }}
                        >
                          Responder
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {alvo && (
        <Dialogo titulo="Responder revisão de nota" aoFechar={() => setAlvo(null)}>
          <p className="rev-contexto">
            <strong>{alvo.atleta.nome}</strong>: {alvo.motivo}
          </p>
          <FormResposta
            rotuloBotao="Enviar resposta"
            pendente={responder.isPending}
            erro={erro}
            aoEnviar={enviar}
            aoCancelar={() => setAlvo(null)}
            extra={
              <LancamentoCorrigiu
                consulta={lancamentos}
                valor={avaliacaoId}
                aoMudar={setAvaliacaoId}
              />
            }
          />
        </Dialogo>
      )}
    </section>
  );
}

function LancamentoCorrigiu({
  consulta,
  valor,
  aoMudar,
}: {
  consulta: ReturnType<typeof useLancamentosRevisao>;
  valor: string;
  aoMudar: (id: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="rev-lancamento">Lançamento que corrigiu a nota (opcional)</label>
      {consulta.isPending ? (
        <p className="muted" role="status">
          Carregando lançamentos…
        </p>
      ) : consulta.isError ? (
        <p className="muted" role="alert">
          {mensagemDeErro(consulta.error)}
        </p>
      ) : (
        <>
          <select id="rev-lancamento" value={valor} onChange={(e) => aoMudar(e.target.value)}>
            <option value="">Nenhum (resposta sem nova nota)</option>
            {consulta.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.indicadorNome} · nota {l.valor} · {fmtData(l.lancadoEm)} ·{" "}
                {l.avaliador?.nome ?? l.origem}
              </option>
            ))}
          </select>
          {consulta.data.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              Nenhum lançamento posterior ao pedido. Lance a nota corrigida em Lançar avaliação
              antes, se for o caso.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PedidosTitular() {
  const q = usePedidosTitular(true);
  const responder = useResponderPedidoTitular();
  const [alvo, setAlvo] = useState<PedidoTitular | null>(null);
  const [erro, setErro] = useState("");

  const enviar = (resposta: string) => {
    if (!alvo) return;
    setErro("");
    responder.mutate(
      { id: alvo.id, resposta },
      {
        onSuccess: () => {
          setAlvo(null);
          toast.success("Resposta registrada.");
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="rev-tit-t">
      <div className="panel-head">
        <h2 id="rev-tit-t">Pedidos do titular (LGPD)</h2>
      </div>
      <div className="note" role="note">
        A exclusão é procedimento manual, registrado na resposta: o histórico (notas, respostas,
        medidas, gates e financeiro) só aceita inserção, então responder aqui não apaga dados.
      </div>
      {q.isPending ? (
        <p className="muted" role="status">
          Carregando pedidos…
        </p>
      ) : q.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(q.error)}
        </div>
      ) : q.data.length === 0 ? (
        <p className="muted">Nenhum pedido do titular.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Pedido em</th>
                <th>Status</th>
                <th>Resposta</th>
                <th>
                  <span className="rev-sr">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to="/atletas/$id" params={{ id: p.atleta.id }}>
                      {p.atleta.nome}
                    </Link>
                  </td>
                  <td>{ROTULO_TIPO[p.tipo]}</td>
                  <td className="rev-texto">{p.descricao}</td>
                  <td>{fmtData(p.criadoEm)}</td>
                  <td>
                    <Status status={p.status} />
                  </td>
                  <td className="rev-texto">{p.resposta ?? "—"}</td>
                  <td className="r">
                    {p.status === "aberto" && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setErro("");
                          setAlvo(p);
                        }}
                      >
                        Responder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {alvo && (
        <Dialogo titulo="Responder pedido do titular" aoFechar={() => setAlvo(null)}>
          <p className="rev-contexto">
            <strong>
              {alvo.atleta.nome} ({ROTULO_TIPO[alvo.tipo]})
            </strong>
            : {alvo.descricao}
          </p>
          {alvo.tipo === "exclusao" && (
            <div className="note">
              Registre na resposta o procedimento manual feito. Esta ação não apaga dados.
            </div>
          )}
          <FormResposta
            rotuloBotao="Enviar resposta"
            pendente={responder.isPending}
            erro={erro}
            aoEnviar={enviar}
            aoCancelar={() => setAlvo(null)}
          />
        </Dialogo>
      )}
    </section>
  );
}
