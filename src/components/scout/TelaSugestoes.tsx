import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmt1, fmtInstante } from "./formato";
import { MensagemCampo } from "./MensagemCampo";
import { SugestaoDialog } from "./SugestaoDialog";
import { buscaDaProposta } from "./sugestoes-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  LIMITE_SUGESTOES_ABERTAS,
  ROTULO_STATUS_SUGESTAO,
  ROTULO_TIPO_SUGESTAO,
  useResponderSugestao,
  useSugestoes,
  type Sugestao,
  type StatusSugestao,
} from "@/lib/api/sugestoes";
import "@/styles/sugestoes.css";

type Filtro = StatusSugestao | "todas";

const CLASSE_STATUS: Record<StatusSugestao, string> = {
  aberta: "st-cond",
  aprovada: "st-apto",
  recusada: "st-alerta",
};

const kg = (f: { pesoMinKg: number; pesoMedioKg: number; pesoMaxKg: number }) =>
  `${fmt1(f.pesoMinKg)} / ${fmt1(f.pesoMedioKg)} / ${fmt1(f.pesoMaxKg)} kg`;

/**
 * Sugestões ao gestor (D7). Treinador: as suas, com status e resposta, e o envio de novas.
 * Gestor: a fila de todas, com filtro por status, comparação proposta × faixa atual e resposta.
 */
export function TelaSugestoes({ papel }: { papel: string }) {
  const gestor = papel === "gestor";
  const [filtro, setFiltro] = useState<Filtro>(gestor ? "aberta" : "todas");
  const consulta = useSugestoes(filtro === "todas" ? undefined : filtro);
  const [novaTipo, setNovaTipo] = useState<"class_fit" | "geral" | null>(null);
  const [responder, setResponder] = useState<{ s: Sugestao; acao: "aprovar" | "recusar" } | null>(
    null,
  );
  const abertas = useSugestoes("aberta");
  const noLimite = !gestor && (abertas.data?.length ?? 0) >= LIMITE_SUGESTOES_ABERTAS;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Governança</div>
          <h1>Sugestões</h1>
          <p>
            {gestor
              ? "Sugestões dos treinadores. Aprovar uma faixa de Class Fit abre Parâmetros com a proposta preenchida: a faixa só muda quando você salvar lá."
              : "Sugira mudanças ao gestor da CBVela, principalmente nas faixas de peso do Class Fit. Nada muda sozinho: o gestor aprova ou recusa e você recebe o aviso."}
          </p>
        </div>
      </div>
      <section className="panel" aria-labelledby="sug-lista-t">
        <div className="panel-head">
          <h2 id="sug-lista-t">{gestor ? "Fila de sugestões" : "Minhas sugestões"}</h2>
          <div className="filters sug-filtro">
            <label className="field" htmlFor="sug-status">
              Status
              <select
                id="sug-status"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as Filtro)}
              >
                <option value="aberta">Abertas</option>
                <option value="aprovada">Aprovadas</option>
                <option value="recusada">Recusadas</option>
                <option value="todas">Todas</option>
              </select>
            </label>
          </div>
        </div>
        {!gestor && (
          <div className="sug-acoes">
            <button
              type="button"
              className="btn primary"
              disabled={noLimite}
              onClick={() => setNovaTipo("class_fit")}
            >
              Sugerir mudança no Class Fit
            </button>
            <button
              type="button"
              className="btn"
              disabled={noLimite}
              onClick={() => setNovaTipo("geral")}
            >
              Nova sugestão
            </button>
            {noLimite && (
              <p className="muted" role="note">
                Você já tem {LIMITE_SUGESTOES_ABERTAS} sugestões abertas. Aguarde a resposta do
                gestor para enviar outra.
              </p>
            )}
          </div>
        )}
        {consulta.isPending ? (
          <p className="muted" role="status">
            Carregando sugestões…
          </p>
        ) : consulta.isError ? (
          <div className="note" role="alert">
            {mensagemDeErro(consulta.error)}
          </div>
        ) : consulta.data.length === 0 ? (
          <EstadoVazio
            icone="lightbulb"
            titulo="Nenhuma sugestão neste filtro."
            texto={
              gestor
                ? "Quando um treinador sugerir uma mudança, ela aparece aqui para resposta."
                : "Troque o filtro de status ou envie uma sugestão nova."
            }
          />
        ) : (
          <>
            <p className="sr-only" role="status">
              {consulta.data.length} {consulta.data.length === 1 ? "sugestão" : "sugestões"} na
              lista.
            </p>
            <ul className="sug-lista" aria-label="Sugestões">
              {consulta.data.map((s) => (
                <ItemSugestao
                  key={s.id}
                  s={s}
                  gestor={gestor}
                  aoResponder={(acao) => setResponder({ s, acao })}
                />
              ))}
            </ul>
          </>
        )}
      </section>
      {novaTipo && <SugestaoDialog modo={novaTipo} aoFechar={() => setNovaTipo(null)} />}
      {responder && (
        <RespostaDialog s={responder.s} acao={responder.acao} aoFechar={() => setResponder(null)} />
      )}
    </>
  );
}

function ItemSugestao({
  s,
  gestor,
  aoResponder,
}: {
  s: Sugestao;
  gestor: boolean;
  aoResponder: (acao: "aprovar" | "recusar") => void;
}) {
  const busca = buscaDaProposta(s);
  return (
    <li className="sug-item">
      <div className="sug-topo">
        <strong>
          {ROTULO_TIPO_SUGESTAO[s.tipo]}
          {s.classe ? ` · ${s.classe.nome}` : ""}
        </strong>
        <span className={`pill ${CLASSE_STATUS[s.status]}`}>
          {ROTULO_STATUS_SUGESTAO[s.status]}
        </span>
        <span className="muted sug-meta">
          {gestor ? `${s.autor.nome} · ` : ""}
          {fmtInstante(s.criadoEm)}
        </span>
      </div>
      <p className="sug-texto">{s.texto}</p>
      {s.proposta && (
        <dl className="sug-compara">
          <div>
            <dt>Faixa atual (mín. / média / máx.)</dt>
            <dd>{s.faixaAtual ? kg(s.faixaAtual) : "—"}</dd>
          </div>
          <div>
            <dt>Faixa proposta (mín. / média / máx.)</dt>
            <dd>{kg(s.proposta)}</dd>
          </div>
        </dl>
      )}
      {s.resposta || s.respondidoPor ? (
        <div className="sug-resposta">
          <strong>
            Resposta{s.respondidoPor ? ` de ${s.respondidoPor.nome}` : ""}
            {s.respondidoEm ? ` (${fmtInstante(s.respondidoEm)})` : ""}:
          </strong>{" "}
          {s.resposta ?? "Sem comentário."}
        </div>
      ) : null}
      {gestor && s.status === "aberta" && (
        <div className="btn-row">
          <button type="button" className="btn sm primary" onClick={() => aoResponder("aprovar")}>
            Aprovar <span className="sr-only">sugestão de {s.autor.nome}</span>
          </button>
          <button type="button" className="btn sm" onClick={() => aoResponder("recusar")}>
            Recusar <span className="sr-only">sugestão de {s.autor.nome}</span>
          </button>
        </div>
      )}
      {gestor && s.status === "aprovada" && busca && (
        <div className="btn-row">
          <Link to="/parametros" search={busca} hash="classes" className="btn sm">
            Abrir em Parâmetros <span className="sr-only">com a proposta de {s.autor.nome}</span>
          </Link>
        </div>
      )}
    </li>
  );
}

/**
 * Ordem da aprovação: primeiro `PUT /sugestoes/:id` marca a sugestão como aprovada (e avisa o
 * autor); só se isso der certo a tela abre Parâmetros, no Class Fit, com a proposta preenchida.
 * A faixa só muda quando o gestor salvar lá, pelo fluxo normal (`PUT /parametros`, com
 * auditoria). Se ele sair sem salvar, a sugestão fica aprovada e o botão "Abrir em Parâmetros"
 * na lista leva de volta à proposta.
 */
function RespostaDialog({
  s,
  acao,
  aoFechar,
}: {
  s: Sugestao;
  acao: "aprovar" | "recusar";
  aoFechar: () => void;
}) {
  const aprovar = acao === "aprovar";
  const navegar = useNavigate();
  const enviar = useResponderSugestao();
  const [texto, setTexto] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const busca = buscaDaProposta(s);
  const erroResposta = local ?? errosPorCampo(enviar.error)["resposta"];

  function submeter(e: FormEvent) {
    e.preventDefault();
    const resposta = texto.trim();
    if (!aprovar && !resposta) return setLocal("Explique o motivo ao recusar a sugestão.");
    setLocal(undefined);
    enviar.mutate(
      {
        id: s.id,
        status: aprovar ? "aprovada" : "recusada",
        ...(resposta ? { resposta } : {}),
      },
      {
        onSuccess: () => {
          aoFechar();
          if (aprovar && busca) {
            toast.success("Sugestão aprovada. Revise a proposta e salve para valer.");
            void navegar({ to: "/parametros", search: busca, hash: "classes" });
          } else {
            toast.success(aprovar ? "Sugestão aprovada." : "Sugestão recusada.");
          }
        },
      },
    );
  }

  return (
    <Dialogo
      titulo={aprovar ? "Aprovar sugestão" : "Recusar sugestão"}
      aoFechar={aoFechar}
      bloqueado={enviar.isPending}
    >
      <p className="sug-contexto">
        <strong>{s.autor.nome}</strong>: {s.texto}
      </p>
      {aprovar && busca && (
        <p className="note" role="note">
          A sugestão será marcada como aprovada e o autor será avisado. Em seguida abrimos
          Parâmetros, no Class Fit, com a proposta preenchida. A faixa de peso só muda quando você
          salvar lá.
        </p>
      )}
      {aprovar && !busca && (
        <p className="note" role="note">
          Aprovar só registra a decisão e avisa o autor. Nenhum parâmetro muda sozinho.
        </p>
      )}
      <form className="stack" onSubmit={submeter} noValidate>
        <div>
          <label className="field" htmlFor="sug-resp">
            {aprovar ? "Comentário (opcional)" : "Motivo da recusa"}
            <textarea
              id="sug-resp"
              rows={4}
              autoFocus
              maxLength={1000}
              value={texto}
              {...atributosDoCampo("sug-resp-erro", erroResposta)}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          <MensagemCampo id="sug-resp-erro" texto={erroResposta} />
        </div>
        {enviar.error && !erroResposta && (
          <p className="note" role="alert">
            {mensagemDeErro(enviar.error)}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={enviar.isPending}>
            {enviar.isPending
              ? "Enviando…"
              : aprovar
                ? busca
                  ? "Aprovar e abrir Parâmetros"
                  : "Aprovar"
                : "Recusar"}
          </button>
          <button type="button" className="btn" onClick={aoFechar} disabled={enviar.isPending}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
