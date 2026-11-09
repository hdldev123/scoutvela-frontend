import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@/styles/painel.css";
import { BigScore } from "./BigScore";
import { PedirRevisaoDialog } from "./PedirRevisaoDialog";
import { fmtData, primeiroNome } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useFicha } from "@/lib/api/consultas";
import {
  alterarConsentimento,
  responderPergunta,
  usePainel,
  useRevisoes,
  type ConsentimentoPainel,
  type ModuloPainel,
  type PainelAtleta,
  type PerguntaPainel,
} from "@/lib/api/painel";

const SITUACAO = {
  sua_vez: { rotulo: "Sua vez", classe: "st-parcial" },
  com_treinador: { rotulo: "Com o treinador", classe: "st-lock" },
  completo: { rotulo: "Completo", classe: "st-apto" },
} as const;

const QUEM = {
  atleta: "Você responde",
  treinador: "Treinador avalia",
  ambos: "Você responde · treinador pontua",
} as const;

function Pergunta({ p, atletaId }: { p: PerguntaPainel; atletaId: string }) {
  const queryClient = useQueryClient();
  const [escolha, setEscolha] = useState<string | null>(null);
  const atual = escolha ?? p.resposta;
  const mudou = escolha !== null && escolha !== p.resposta;

  const enviar = useMutation({
    mutationFn: () => responderPergunta({ indicadorId: p.indicadorId, resposta: escolha ?? "" }),
    onSuccess: async () => {
      toast("Resposta salva");
      setEscolha(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["painel"] }),
        queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] }),
      ]);
    },
    onError: (e) => toast.error(mensagemDeErro(e, "Não foi possível salvar a resposta.")),
  });

  return (
    <fieldset className="painel-pergunta">
      <legend>{p.enunciado}</legend>
      {p.registradoNaoPontua && (
        <span className="muted painel-aviso">Fica registrado, não entra na nota</span>
      )}
      {p.opcoes.map((o) => (
        <label key={o.ordem} className="painel-opcao">
          <input
            type="radio"
            name={`perg-${p.indicadorId}`}
            value={o.texto}
            checked={atual === o.texto}
            onChange={() => setEscolha(o.texto)}
          />
          {o.texto}
        </label>
      ))}
      <div className="btn-row">
        <button
          type="button"
          className="btn primary"
          disabled={!mudou || enviar.isPending}
          onClick={() => enviar.mutate()}
        >
          {p.resposta ? "Atualizar resposta" : "Confirmar resposta"}
        </button>
      </div>
    </fieldset>
  );
}

function Modulo({
  m,
  aberto,
  aoAlternar,
}: {
  m: ModuloPainel;
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const sit = SITUACAO[m.situacao];
  const temPerguntas = m.perguntas.length > 0;
  return (
    <div className="module">
      <span className="mh">
        <b>{m.nome}</b>
        <span className={`pill ${sit.classe}`}>{sit.rotulo}</span>
      </span>
      <span className="who-fills">
        {QUEM[m.quemPreenche]} · {m.peso} pts
      </span>
      <span
        className="track"
        role="progressbar"
        aria-label={`Indicadores preenchidos em ${m.nome}`}
        aria-valuemin={0}
        aria-valuemax={m.total}
        aria-valuenow={m.preenchidos}
      >
        <span style={{ width: `${m.total ? (m.preenchidos / m.total) * 100 : 0}%` }} />
      </span>
      <span className="who-fills num">
        {m.preenchidos} de {m.total} indicadores
        {temPerguntas ? ` · ${m.respostasFeitas} de ${m.respostasTotal} respostas suas` : ""}
      </span>
      {temPerguntas && (
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            aria-expanded={aberto}
            aria-label={`${aberto ? "Fechar" : "Abrir"} questionário de ${m.nome}`}
            onClick={aoAlternar}
          >
            {aberto ? "Fechar questionário" : "Abrir questionário"}
          </button>
        </div>
      )}
    </div>
  );
}

function Questionario({
  m,
  atletaId,
  aoFechar,
}: {
  m: ModuloPainel;
  atletaId: string;
  aoFechar: () => void;
}) {
  return (
    <section className="panel" aria-label={`Questionário de ${m.nome}`}>
      <div className="panel-head">
        <h2>{m.nome}</h2>
        <button type="button" className="btn" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      <div className="painel-perguntas">
        {m.perguntas.map((p) => (
          <Pergunta key={p.indicadorId} p={p} atletaId={atletaId} />
        ))}
      </div>
      <p className="muted" style={{ fontSize: ".82rem", margin: "8px 0 0" }}>
        Sua resposta vira uma nota sugerida. A nota só vale no ranking depois que o treinador
        confirmar.
      </p>
    </section>
  );
}

function Consentimento({ c }: { c: ConsentimentoPainel }) {
  const queryClient = useQueryClient();
  const alterar = useMutation({
    mutationFn: (valor: boolean) => alterarConsentimento(valor),
    onSuccess: async (novo) => {
      toast(
        novo.compartilharIbvar
          ? "IBVAR passa a ver seu score e seus gates"
          : "IBVAR deixa de ver seus dados individuais",
      );
      await queryClient.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (e) => toast.error(mensagemDeErro(e, "Não foi possível salvar sua decisão.")),
  });
  return (
    <section className="panel" aria-labelledby="painel-consent">
      <div className="panel-head">
        <h2 id="painel-consent">Seus dados e consentimento</h2>
        <span className="muted" style={{ fontSize: ".85rem" }}>
          {c.termoAceitoEm
            ? `Termo do piloto 18+${c.termoVersao ? ` (versão ${c.termoVersao})` : ""} · aceito em ${fmtData(c.termoAceitoEm)}`
            : "Termo do piloto 18+ ainda não aceito"}
        </span>
      </div>
      <label className="switch" htmlFor="c-ibvar">
        <span>
          Compartilhar meu score com o IBVAR
          <br />
          <span className="muted" style={{ fontSize: ".82rem" }}>
            Sem o consentimento, o IBVAR vê só números agregados. Você pode mudar a qualquer
            momento.
            {c.atualizadoEm ? ` Última decisão em ${fmtData(c.atualizadoEm)}.` : ""}
          </span>
        </span>
        <input
          id="c-ibvar"
          type="checkbox"
          role="switch"
          checked={c.compartilharIbvar}
          disabled={alterar.isPending}
          onChange={(e) => alterar.mutate(e.target.checked)}
        />
      </label>
      <div className="switch">
        <span>
          Peso, perfil mental e finanças
          <br />
          <span className="muted" style={{ fontSize: ".82rem" }}>
            Sempre restritos a você, seu treinador e o gestor da CBVela.
          </span>
        </span>
        <span className="pill st-lock">Restrito</span>
      </div>
    </section>
  );
}

function DialogoRevisao({ atletaId, aoFechar }: { atletaId: string; aoFechar: () => void }) {
  const { data, error } = useFicha(atletaId);
  useEffect(() => {
    if (error) {
      toast.error(mensagemDeErro(error, "Não foi possível carregar os pilares."));
      aoFechar();
    }
  }, [error, aoFechar]);
  if (!data) return null;
  return (
    <PedirRevisaoDialog
      aoFechar={aoFechar}
      pilares={data.pilares.map((p) => ({
        id: p.id,
        nome: p.nome,
        indicadores: (p.indicadores ?? []).map((i) => ({ id: i.id, nome: i.nome })),
      }))}
    />
  );
}

function Revisoes({ atletaId }: { atletaId: string }) {
  const { data, error, isPending } = useRevisoes();
  const [pedindo, setPedindo] = useState(false);
  return (
    <section className="panel" aria-labelledby="painel-rev">
      <div className="panel-head">
        <h2 id="painel-rev">Pedidos de revisão</h2>
        <button type="button" className="btn" onClick={() => setPedindo(true)}>
          Pedir revisão de nota
        </button>
      </div>
      {isPending && (
        <p role="status" className="muted">
          Carregando pedidos…
        </p>
      )}
      {error && (
        <p className="note" role="alert">
          {mensagemDeErro(error, "Não foi possível carregar os pedidos.")}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="muted">Você ainda não pediu revisão de nenhuma nota.</p>
      )}
      {data?.map((r) => (
        <div key={r.id} className="painel-revisao">
          <span className="mh">
            <b>
              {r.pilar?.nomeCurto ?? "Nota"}
              {r.indicador ? ` · ${r.indicador.nome}` : ""}
            </b>{" "}
            <span className={`pill ${r.status === "aberto" ? "st-parcial" : "st-apto"}`}>
              {r.status === "aberto" ? "Aberto" : "Respondido"}
            </span>
          </span>
          <p>{r.motivo}</p>
          <span className="muted" style={{ fontSize: ".82rem" }}>
            Pedido em {fmtData(r.criadoEm)}
          </span>
          {r.resposta && (
            <p>
              <b>Resposta do gestor:</b> {r.resposta}
              {r.respondidoEm ? ` (${fmtData(r.respondidoEm)})` : ""}
            </p>
          )}
        </div>
      ))}
      {pedindo && <DialogoRevisao atletaId={atletaId} aoFechar={() => setPedindo(false)} />}
    </section>
  );
}

function Conteudo({ painel }: { painel: PainelAtleta }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const modulo = painel.modulos.find((m) => m.pilarId === aberto);
  const prazo = painel.ciclo ? fmtData(painel.ciclo.prazo) : null;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {painel.ciclo ? `Ciclo ${painel.ciclo.nome} · prazo ${prazo}` : "Sem ciclo aberto"}
          </div>
          <h1>Olá, {primeiroNome(painel.atleta.nome)}</h1>
          <p>
            Seu score é montado em {painel.modulos.length} módulos. Alguns você responde; os outros
            seu treinador avalia.
          </p>
          <div className="painel-cabeca-acoes">
            <span className="muted">
              {painel.completo ? "Avaliação completa" : "Avaliação parcial: faltam indicadores"}
            </span>
            <Link to="/atletas/$id" params={{ id: painel.atleta.id }} className="btn">
              Minha ficha
            </Link>
          </div>
        </div>
        <BigScore score={painel.score} faixa={painel.faixa} parcial={!painel.completo} />
      </div>
      <div className="stack">
        {painel.pendencias.length > 0 ? (
          <div className="note" role="status">
            <b>Pendências:</b> faltam suas respostas em {painel.pendencias.join(", ")}.
            {prazo ? ` Prazo: ${prazo}.` : ""}
          </div>
        ) : (
          <div className="note" role="status">
            Suas respostas deste ciclo estão completas. Obrigado!
          </div>
        )}
        <div className="modules">
          {painel.modulos.map((m) => (
            <Modulo
              key={m.pilarId}
              m={m}
              aberto={aberto === m.pilarId}
              aoAlternar={() => setAberto(aberto === m.pilarId ? null : m.pilarId)}
            />
          ))}
        </div>
        {modulo && (
          <Questionario m={modulo} atletaId={painel.atleta.id} aoFechar={() => setAberto(null)} />
        )}
        <Consentimento c={painel.consentimento} />
        <Revisoes atletaId={painel.atleta.id} />
      </div>
    </>
  );
}

/** Meu painel (atleta): tudo vem de GET /painel; score, faixa e situação são calculados na API. */
export function TelaPainel() {
  const { data, error, isPending } = usePainel();
  if (isPending) {
    return (
      <p role="status" className="muted">
        Carregando painel…
      </p>
    );
  }
  if (error) {
    return (
      <div className="panel empty-state" role="alert">
        {mensagemDeErro(error, "Não foi possível carregar o painel.")}
      </div>
    );
  }
  return <Conteudo painel={data} />;
}
