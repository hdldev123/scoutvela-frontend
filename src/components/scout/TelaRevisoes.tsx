import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Abas, PainelAba } from "./Abas";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtInstante } from "./formato";
import { atributosDoCampo } from "./campo-util";
import { MensagemCampo } from "./MensagemCampo";
import { NotaRevisao } from "./NotaRevisao";
import { andamentoRevisao, rotuloPapel } from "./revisao-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { LIMITES, mensagemResposta } from "@/lib/validacao";
import { useAnonimizarAtleta, type ResultadoAnonimizacao } from "@/lib/api/titular";
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

function Status({ status, instancia = 1 }: { status: StatusRevisao; instancia?: 1 | 2 }) {
  return (
    <>
      <span className={`pill ${status === "aberto" ? "st-cond" : "st-apto"}`}>
        {status === "aberto" ? "Aberto" : "Respondido"}
      </span>
      {instancia === 2 && <span className="pill st-alerta">2ª instância</span>}
    </>
  );
}

/** Primeira resposta e recurso do atleta, para quem vai dar a resposta final. */
function FluxoRecurso({ r }: { r: Revisao }) {
  if (!r.recurso) return null;
  return (
    <div className="rev-fluxo">
      {r.primeiraResposta && (
        <p>
          <strong>
            1ª resposta ({rotuloPapel(r.primeiraResposta.papel).toLowerCase()},{" "}
            {fmtInstante(r.primeiraResposta.respondidoEm)}):
          </strong>{" "}
          {r.primeiraResposta.texto}
        </p>
      )}
      <p>
        <strong>Recurso do atleta ({fmtInstante(r.recurso.em)}):</strong> {r.recurso.texto}
      </p>
    </div>
  );
}

/** Resposta vigente com o papel de quem respondeu (a final, quando há). */
function RespostaVigente({ r }: { r: Revisao }) {
  const v = r.respostaFinal ?? r.primeiraResposta;
  if (!v || (r.instancia === 2 && r.status === "aberto")) return <>—</>;
  return (
    <>
      <strong>{r.respostaFinal ? "Final (gestor)" : rotuloPapel(v.papel)}:</strong> {v.texto}
      <span className="muted"> ({fmtInstante(v.respondidoEm)})</span>
    </>
  );
}

/** Pedidos de revisão de nota (gestor e treinador) e pedidos do titular (só gestor). */
/**
 * Pedido em e resposta, em texto real dentro da célula do motivo. Só aparece na faixa estreita
 * (881 a 1180 px), em que as colunas "Pedido em" e "Resposta" somem (mesma media query).
 */
function Extra({
  criadoEm,
  resposta,
  respondidoEm,
}: {
  criadoEm: string;
  resposta: string | null | undefined;
  respondidoEm: string | null | undefined;
}) {
  return (
    <span className="rev-extra">
      <span>Pedido em {fmtInstante(criadoEm)}</span>
      {resposta && (
        <span>
          Resposta: {resposta}
          {respondidoEm ? ` (${fmtInstante(respondidoEm)})` : ""}
        </span>
      )}
    </span>
  );
}

export function TelaRevisoes({ papel }: { papel: string }) {
  const gestor = papel === "gestor";
  const [aba, setAba] = useState<Aba>("notas");

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Governança</div>
          <h1>Pedidos de revisão</h1>
          <p>
            O atleta pode pedir revisão de uma nota (LGPD, art. 20). Cada resposta fica registrada
            na trilha de auditoria.
          </p>
        </div>
      </div>
      <div className="stack">
        {gestor ? (
          <>
            <Abas
              rotulo="Tipo de pedido"
              itens={[
                { id: "notas", rotulo: "Revisões de nota" },
                { id: "titular", rotulo: "Pedidos do titular (LGPD)" },
              ]}
              ativa={aba}
              aoMudar={(id) => setAba(id === "titular" ? "titular" : "notas")}
            />
            <PainelAba id="notas" ativa={aba === "notas"}>
              <RevisoesNota gestor />
            </PainelAba>
            <PainelAba id="titular" ativa={aba === "titular"}>
              <PedidosTitular />
            </PainelAba>
          </>
        ) : (
          <RevisoesNota gestor={false} />
        )}
      </div>
    </>
  );
}

function FormResposta({
  rotuloBotao,
  rotuloCampo = "Resposta",
  minimo = LIMITES.resposta.min,
  pendente,
  erro,
  erroCampo,
  aoEnviar,
  aoCancelar,
  extra,
}: {
  rotuloBotao: string;
  rotuloCampo?: string;
  /** Mínimo de caracteres (3 na resposta comum, 20 na justificativa de recusa). */
  minimo?: number;
  pendente: boolean;
  erro: string;
  /** Mensagem do 400 da API para o campo `resposta`. */
  erroCampo?: string | undefined;
  aoEnviar: (resposta: string) => void;
  aoCancelar: () => void;
  extra?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const tamanho = texto.trim().length;
  const falha =
    tamanho > 0 && tamanho < minimo
      ? minimo === LIMITES.resposta.min
        ? mensagemResposta(texto)
        : `A justificativa precisa ter pelo menos ${minimo} caracteres (faltam ${minimo - tamanho}).`
      : null;
  const msg = falha ?? erroCampo;
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (tamanho >= minimo) aoEnviar(texto.trim());
  };
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
      <div>
        <label className="field" htmlFor="rev-resposta">
          {rotuloCampo}
          <textarea
            id="rev-resposta"
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            maxLength={2000}
            {...atributosDoCampo("rev-resposta-erro", msg)}
          />
        </label>
        <MensagemCampo id="rev-resposta-erro" texto={msg} />
      </div>
      {extra}
      {erro && (
        <div className="note" role="alert">
          {erro}
        </div>
      )}
      <div className="btn-row">
        <button type="submit" className="btn primary" disabled={pendente || tamanho < minimo}>
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
        <div className="filters rev-filtro">
          <label className="field" htmlFor="rev-status">
            Status
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
      </div>
      {!gestor && (
        <p className="muted">
          Você responde os pedidos de revisão dos seus atletas. Se o atleta discordar, o pedido vai
          para a gestão da CBVela (2ª instância) e deixa de ser seu.
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
        <EstadoVazio
          icone="chat-circle-text"
          titulo="Nenhum pedido de revisão neste filtro."
          texto={
            filtro === "aberto"
              ? "Quando um atleta pedir revisão de uma nota, o pedido aparece aqui para resposta."
              : "Troque o filtro de status para ver outros pedidos."
          }
        />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de pedidos de revisão, role para ver todas as colunas"
        >
          <table className="data interativa rev-tabela">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Pilar</th>
                <th>Motivo</th>
                <th className="rev-col-data">Pedido em</th>
                <th>Status</th>
                <th className="rev-col-resp">Resposta</th>
                <th className="acoes">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td className="nw">
                    <Link to="/atletas/$id" params={{ id: r.atleta.id }}>
                      {r.atleta.nome}
                    </Link>
                  </td>
                  <td className="rev-pilar">
                    <strong>{r.pilar?.nomeCurto ?? "—"}</strong>
                    {r.indicador && <span className="muted">{r.indicador.nome}</span>}
                  </td>
                  <td className="rev-texto">
                    {r.motivo}
                    {typeof r.notaNova === "number" && (
                      <div>
                        <span className="muted">Nota: </span>
                        <NotaRevisao notaAnterior={r.notaAnterior} notaNova={r.notaNova} />
                      </div>
                    )}
                    <FluxoRecurso r={r} />
                    <Extra
                      criadoEm={r.criadoEm}
                      resposta={r.resposta}
                      respondidoEm={r.respondidoEm}
                    />
                  </td>
                  <td className="nw rev-col-data">{fmtInstante(r.criadoEm)}</td>
                  <td className="nw">
                    <Status status={r.status} instancia={r.instancia} />
                  </td>
                  <td className="rev-texto rev-col-resp">
                    <RespostaVigente r={r} />
                  </td>
                  <td className="acoes">
                    {r.status === "aberto" && (gestor || r.instancia === 1) && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => {
                          responder.reset();
                          setErro("");
                          setAvaliacaoId("");
                          setAlvo(r);
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
        <Dialogo
          titulo={alvo.instancia === 2 ? "Resposta final do recurso" : "Responder revisão de nota"}
          aoFechar={() => setAlvo(null)}
        >
          <p className="rev-contexto">
            <strong>{alvo.atleta.nome}</strong>: {alvo.motivo}
          </p>
          {alvo.instancia === 2 && (
            <div className="rev-contexto">
              <FluxoRecurso r={alvo} />
              <p className="muted" style={{ margin: "8px 0 0" }}>
                {andamentoRevisao(alvo)}. A sua resposta encerra o pedido.
              </p>
            </div>
          )}
          <FormResposta
            rotuloBotao={alvo.instancia === 2 ? "Enviar resposta final" : "Enviar resposta"}
            pendente={responder.isPending}
            erro={erro}
            erroCampo={errosPorCampo(responder.error)["resposta"]}
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
                {l.indicadorNome} · nota {l.valor} · {fmtInstante(l.lancadoEm)} ·{" "}
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
  const [anonimizando, setAnonimizando] = useState<PedidoTitular | null>(null);
  const [erro, setErro] = useState("");

  const enviar = (resposta: string) => {
    if (!alvo) return;
    setErro("");
    responder.mutate(
      { id: alvo.id, resposta, ...(alvo.tipo === "exclusao" ? { recusar: true } : {}) },
      {
        onSuccess: () => {
          setAlvo(null);
          toast.success(
            alvo.tipo === "exclusao" ? "Pedido recusado e registrado." : "Resposta registrada.",
          );
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
        A exclusão é atendida pela ação “Anonimizar atleta”, que tira a identificação direta e
        mantém o histórico (notas, respostas, medidas, gates e financeiro), que só aceita inserção.
        Os demais tipos seguem procedimento manual, registrado na resposta.
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
        <EstadoVazio
          icone="shield-check"
          titulo="Nenhum pedido do titular."
          texto="Pedidos de acesso, correção, exclusão ou revogação feitos pelos atletas aparecem aqui."
        />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de pedidos do titular, role para ver todas as colunas"
        >
          <table className="data interativa rev-tabela">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th className="rev-col-data">Pedido em</th>
                <th>Status</th>
                <th className="rev-col-resp">Resposta</th>
                <th className="acoes">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id}>
                  <td className="nw">
                    <Link to="/atletas/$id" params={{ id: p.atleta.id }}>
                      {p.atleta.nome}
                    </Link>
                  </td>
                  <td className="nw">{ROTULO_TIPO[p.tipo]}</td>
                  <td className="rev-texto">
                    {p.descricao}
                    <Extra
                      criadoEm={p.criadoEm}
                      resposta={p.resposta}
                      respondidoEm={p.respondidoEm}
                    />
                  </td>
                  <td className="nw rev-col-data">{fmtInstante(p.criadoEm)}</td>
                  <td className="nw">
                    <Status status={p.status} />
                  </td>
                  <td className="rev-texto rev-col-resp">{p.resposta ?? "—"}</td>
                  <td className="acoes">
                    <div className="acoes-grupo">
                      {p.tipo === "exclusao" && acaoAnonimizar(p) && (
                        <button
                          type="button"
                          className="btn sm"
                          aria-label={`${acaoAnonimizar(p)}: ${p.atleta.nome}`}
                          onClick={() => setAnonimizando(p)}
                        >
                          {acaoAnonimizar(p)}
                        </button>
                      )}
                      {p.status === "aberto" && (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            responder.reset();
                            setErro("");
                            setAlvo(p);
                          }}
                        >
                          {p.tipo === "exclusao" ? "Recusar pedido" : "Responder"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {alvo && (
        <Dialogo
          titulo={
            alvo.tipo === "exclusao" ? "Recusar pedido de exclusão" : "Responder pedido do titular"
          }
          aoFechar={() => setAlvo(null)}
        >
          <p className="rev-contexto">
            <strong>
              {alvo.atleta.nome} ({ROTULO_TIPO[alvo.tipo]})
            </strong>
            : {alvo.descricao}
          </p>
          {alvo.tipo === "exclusao" && (
            <div className="note">
              A exclusão se faz por “{ROTULO_ANONIMIZAR}”, que atende o pedido e o fecha. Use
              “Recusar pedido” só quando a exclusão não puder ser feita, com a justificativa abaixo.
              A recusa fica registrada na auditoria e não apaga dados.
            </div>
          )}
          <FormResposta
            rotuloBotao={alvo.tipo === "exclusao" ? "Recusar pedido" : "Enviar resposta"}
            rotuloCampo={alvo.tipo === "exclusao" ? "Justificativa da recusa" : "Resposta"}
            minimo={alvo.tipo === "exclusao" ? LIMITES.justificativaRecusa : LIMITES.resposta.min}
            pendente={responder.isPending}
            erro={erro}
            erroCampo={errosPorCampo(responder.error)["resposta"]}
            aoEnviar={enviar}
            aoCancelar={() => setAlvo(null)}
          />
        </Dialogo>
      )}
      {anonimizando && (
        <DialogoAnonimizar pedido={anonimizando} aoFechar={() => setAnonimizando(null)} />
      )}
    </section>
  );
}

const ROTULO_ANONIMIZAR = "Anonimizar atleta";
const ROTULO_RETOMAR = "Concluir pendências da anonimização";

/** A anonimização que a API registrou neste pedido (nula se ainda não houve). */
const anonimizado = (p: PedidoTitular) => !!p.anonimizacao;

/** "Concluir pendências" só existe quando a API ainda aponta arquivos ou conta a limpar. */
const temPendencia = (p: PedidoTitular) =>
  !!p.anonimizacao && (p.anonimizacao.pendencias.arquivos > 0 || p.anonimizacao.pendencias.conta);

/** Rótulo da ação de anonimizar para o pedido, ou null quando não há o que fazer. */
function acaoAnonimizar(p: PedidoTitular): string | null {
  if (p.tipo !== "exclusao") return null;
  if (temPendencia(p)) return ROTULO_RETOMAR;
  if (!anonimizado(p) && p.status === "aberto") return ROTULO_ANONIMIZAR;
  return null;
}

function ResultadoAnon({ r }: { r: ResultadoAnonimizacao }) {
  const pendente = r.pendencias.arquivos > 0 || r.pendencias.conta;
  return (
    <div className="stack" style={{ gap: 8 }} role="status">
      <p>
        <strong>Atleta anonimizado.</strong> Evidências removidas: {r.evidenciasRemovidas}.
      </p>
      {pendente ? (
        <div className="note">
          Restam pendências:
          <ul>
            {r.pendencias.arquivos > 0 && (
              <li>{r.pendencias.arquivos} arquivo(s) ainda não saíram do armazenamento.</li>
            )}
            {r.pendencias.conta && <li>A conta de login ainda não foi apagada.</li>}
          </ul>
          Repita a ação “{ROTULO_RETOMAR}” depois para concluir.
        </div>
      ) : (
        <p className="muted">Sem pendências.</p>
      )}
    </div>
  );
}

function DialogoAnonimizar({ pedido, aoFechar }: { pedido: PedidoTitular; aoFechar: () => void }) {
  const anonimizar = useAnonimizarAtleta();
  const [texto, setTexto] = useState("");
  const erro = anonimizar.isError ? mensagemDeErro(anonimizar.error) : "";
  // O resultado vem do estado da mutação (não de um callback): aparece mesmo que a lista
  // recarregue por baixo e troque o pedido.
  const resultado: ResultadoAnonimizacao | null = anonimizar.data ?? null;
  const retomada = anonimizado(pedido);
  const pendente = anonimizar.isPending;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto !== "ANONIMIZAR" || pendente) return;
    anonimizar.mutate(
      { atletaId: pedido.atleta.id, pedidoTitularId: pedido.id },
      { onSuccess: () => toast.success("Atleta anonimizado.") },
    );
  };

  return (
    <Dialogo
      titulo={retomada ? ROTULO_RETOMAR : ROTULO_ANONIMIZAR}
      aoFechar={aoFechar}
      bloqueado={pendente}
    >
      {resultado ? (
        <div className="stack" style={{ gap: 12 }}>
          <ResultadoAnon r={resultado} />
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
          <p className="rev-contexto">
            <strong>{pedido.atleta.nome}</strong>: {pedido.descricao}
          </p>
          <div className="note" role="alert">
            <strong>Esta ação não pode ser desfeita.</strong>
          </div>
          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>O que some:</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              nome, contato, clube, cidade e UF, número de vela, ID World Sailing, código VelaID e
              registro do VelaID, a conta de login e os arquivos de evidência.
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>O que fica:</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              a série histórica de notas, respostas, medidas, gates, financeiro, plano e resultados,
              sem identificação direta.
            </p>
          </div>
          {retomada && (
            <p className="muted" style={{ margin: 0 }}>
              O atleta já foi anonimizado. Repetir a ação só tenta de novo as pendências.
            </p>
          )}
          <label className="field" htmlFor="rev-anon-conf">
            Digite ANONIMIZAR para confirmar
            <input
              id="rev-anon-conf"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          {erro && (
            <div className="note" role="alert">
              {erro}
            </div>
          )}
          <div className="btn-row">
            <button
              type="submit"
              className="btn primary"
              disabled={texto !== "ANONIMIZAR" || pendente}
            >
              {pendente ? "Anonimizando…" : "Anonimizar"}
            </button>
            <button type="button" className="btn" disabled={pendente} onClick={aoFechar}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Dialogo>
  );
}
