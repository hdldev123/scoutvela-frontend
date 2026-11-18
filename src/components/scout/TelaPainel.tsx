import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@/styles/contas.css";
import "@/styles/painel.css";
import { BigScore } from "./BigScore";
import { NotaRevisao } from "./NotaRevisao";
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
import {
  baixarJson,
  buscarMeusDados,
  useAceitarTermo,
  useCriarPedidoTitular,
  usePedidosTitular,
  useTermo,
  type TipoPedidoTitular,
} from "@/lib/api/titular";

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
          {c.termoAceitoEm && c.termoPendente
            ? ` · aceite da versão ${c.termoVigenteVersao} pendente`
            : ""}
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
      <MeusDados />
    </section>
  );
}

const TIPOS_PEDIDO: Record<TipoPedidoTitular, string> = {
  acesso: "Acesso aos meus dados",
  correcao: "Correção de dados",
  exclusao: "Exclusão de dados",
  revogacao: "Revogação de consentimento",
};

/** Termo vigente e botão de aceite; some quando o atleta já aceitou a versão vigente. */
function TermoAceite({ novaVersao }: { novaVersao?: string | undefined }) {
  const termo = useTermo();
  const aceitar = useAceitarTermo();
  return (
    <section className="panel" aria-labelledby="painel-termo">
      <div className="panel-head">
        <h2 id="painel-termo">{termo.data?.titulo ?? "Termo de consentimento"}</h2>
        {termo.data && <span className="muted">Versão {termo.data.versao}</span>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {novaVersao
          ? `Há uma nova versão do termo (${novaVersao}). Leia e aceite para continuar no piloto.`
          : "Leia e aceite o termo para entrar no ranking do piloto."}
      </p>
      {termo.isPending && (
        <p role="status" className="muted">
          Carregando termo…
        </p>
      )}
      {termo.error && (
        <p className="note" role="alert">
          {mensagemDeErro(termo.error, "Não foi possível carregar o termo.")}
        </p>
      )}
      {termo.data && (
        <>
          <div className="ped-termo" tabIndex={0} role="region" aria-label="Texto do termo">
            {termo.data.texto}
          </div>
          {aceitar.error && (
            <p className="note" role="alert">
              {mensagemDeErro(aceitar.error, "Não foi possível registrar o aceite.")}
            </p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              disabled={aceitar.isPending}
              onClick={() =>
                aceitar.mutate(termo.data.versao, { onSuccess: () => toast("Termo aceito") })
              }
            >
              {aceitar.isPending ? "Registrando…" : "Li e aceito"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function MeusDados() {
  const [baixando, setBaixando] = useState(false);
  async function baixar() {
    setBaixando(true);
    try {
      baixarJson("meus-dados-scout-vela.json", await buscarMeusDados());
    } catch (e) {
      toast.error(mensagemDeErro(e, "Não foi possível baixar seus dados."));
    } finally {
      setBaixando(false);
    }
  }
  return (
    <div className="btn-row" style={{ marginTop: 12 }}>
      <button type="button" className="btn" disabled={baixando} onClick={() => void baixar()}>
        {baixando ? "Gerando arquivo…" : "Baixar meus dados"}
      </button>
    </div>
  );
}

function PedidosTitular() {
  const pedidos = usePedidosTitular();
  const criar = useCriarPedidoTitular();
  const [tipo, setTipo] = useState<TipoPedidoTitular>("acesso");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const tamanho = descricao.trim().length;
  const valido = tamanho >= 10 && tamanho <= 2000;

  return (
    <section className="panel" aria-labelledby="painel-lgpd">
      <div className="panel-head">
        <h2 id="painel-lgpd">Pedidos sobre meus dados (LGPD)</h2>
      </div>
      <form
        className="stack"
        style={{ gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          setErro("");
          criar.mutate(
            { tipo, descricao: descricao.trim() },
            {
              onSuccess: () => {
                setDescricao("");
                toast("Pedido enviado");
              },
              onError: (err) => setErro(mensagemDeErro(err, "Não foi possível enviar o pedido.")),
            },
          );
        }}
      >
        <label className="field">
          Tipo de pedido
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPedidoTitular)}>
            {(Object.keys(TIPOS_PEDIDO) as TipoPedidoTitular[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_PEDIDO[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Descrição (10 a 2000 caracteres)
          <textarea
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={2000}
          />
        </label>
        <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>
          A exclusão é analisada pela CBVela: dados que sustentam a série histórica e a trilha de
          auditoria podem precisar ser mantidos. Você recebe a resposta aqui.
        </p>
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={!valido || criar.isPending}>
            {criar.isPending ? "Enviando…" : "Enviar pedido"}
          </button>
        </div>
      </form>
      {pedidos.isPending && (
        <p role="status" className="muted">
          Carregando pedidos…
        </p>
      )}
      {pedidos.error && (
        <p className="note" role="alert">
          {mensagemDeErro(pedidos.error, "Não foi possível carregar os pedidos.")}
        </p>
      )}
      {pedidos.data && pedidos.data.length === 0 && (
        <p className="muted">Você ainda não fez nenhum pedido sobre seus dados.</p>
      )}
      {pedidos.data?.map((p) => (
        <div key={p.id} className="ped-pedido">
          <span className="mh">
            <b>{TIPOS_PEDIDO[p.tipo]}</b>{" "}
            <span className={`pill ${p.status === "aberto" ? "st-parcial" : "st-apto"}`}>
              {p.status === "aberto" ? "Aberto" : "Respondido"}
            </span>
          </span>
          <p>{p.descricao}</p>
          <span className="muted" style={{ fontSize: ".82rem" }}>
            Pedido em {fmtData(p.criadoEm)}
          </span>
          {p.resposta && (
            <p>
              <b>Resposta:</b> {p.resposta}
              {p.respondidoEm ? ` (${fmtData(p.respondidoEm)})` : ""}
            </p>
          )}
        </div>
      ))}
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
          {typeof r.notaNova === "number" && (
            <p>
              <b>Nota:</b> <NotaRevisao notaAnterior={r.notaAnterior} notaNova={r.notaNova} />
            </p>
          )}
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
        {(!painel.consentimento.termoAceitoEm || painel.consentimento.termoPendente) && (
          <TermoAceite
            novaVersao={
              painel.consentimento.termoAceitoEm
                ? painel.consentimento.termoVigenteVersao
                : undefined
            }
          />
        )}
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
        <PedidosTitular />
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
