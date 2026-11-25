import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { CampoArquivo } from "./CampoArquivo";
import { AbrirEvidencia, VerVideo } from "./EvidenciasSecao";
import { Dialogo } from "./Dialogo";
import { atributosDoCampo } from "./campo-util";
import { MensagemCampo } from "./MensagemCampo";
import { FaixaPill } from "./FaixaPill";
import { textoDoStatus } from "./status-gate";
import { fmt1, fmtData } from "./formato";
import "@/styles/avaliar.css";
import "@/styles/autoavaliacao.css";
import "@/styles/ficha.css";
import {
  lancarAvaliacao,
  preverAvaliacao,
  useParametros,
  type CorpoAvaliacao,
  type Parametros,
} from "@/lib/api/avaliacao";
import {
  MAX_JUSTIFICATIVA,
  useAutoavaliacao,
  type IndicadorAutoavaliacao,
} from "@/lib/api/autoavaliacao";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { invalidarNotificacoes } from "@/lib/api/notificacoes";
import { INDICADORES_DE_RESULTADO } from "@/lib/api/resultados";
import {
  ACEITA_ARQUIVO,
  enviarEvidencia,
  removerEvidenciaOrfa,
  validarArquivo,
} from "@/lib/api/evidencias";
import {
  mensagemAltura,
  mensagemEvidenciaMedida,
  mensagemEvidenciaNota,
  mensagemLinkVideo,
  mensagemPeso,
} from "@/lib/validacao";
import { useFicha, useRanking, type FichaAtleta } from "@/lib/api/consultas";

type Pilar = FichaAtleta["pilares"][number];
type Indicador = NonNullable<Pilar["indicadores"]>[number];

const EVID_MAX = 500;
/** Chave do erro do link do vídeo de um indicador, ao lado da chave do erro da evidência. */
const SUFIXO_LINK = ":link";
/** Chave do erro da justificativa de um indicador (D9). */
const SUFIXO_JUST = ":just";
const MSG_JUSTIFICATIVA = "Explique por que a nota difere da sugestão do atleta.";

/** Sugestão do atleta ainda sem decisão do treinador no ciclo aberto (D9). */
type SugestaoAtleta = NonNullable<IndicadorAutoavaliacao["sugestao"]>;
type SugestoesPendentes = Map<string, SugestaoAtleta>;
const MSG_PESO_VAZIO = "Informe o peso em kg, de 30 a 160.";
const MSG_ALTURA_VAZIA = "Informe a altura em centímetros, de 120 a 230.";
const ATRASO_PREVIA_MS = 400;

/** Ponte entre os anexos (que sobem sozinhos) e o rascunho do Editor. */
interface Envio {
  /** Registra um upload em andamento e devolve a versão do rascunho em que ele começou. */
  iniciar: () => number;
  /** Encerra o upload; o anexo só entra no rascunho se a versão ainda for a mesma. */
  concluir: (versao: number, anexo?: { id: string; nome: string }) => void;
}

interface Rascunho {
  valor?: number;
  evidencia: string;
  link?: string | undefined;
  anexoId?: string | undefined;
  anexoNome?: string | undefined;
  /** Por que a nota difere da sugestão do atleta (obrigatória quando difere). */
  justificativa?: string | undefined;
  /** "Corrigir" aberto: mostra o campo de justificativa mesmo antes de escolher a nota. */
  corrigindo?: boolean | undefined;
}

/** Pendente: há sugestão no ciclo aberto e o treinador ainda não decidiu depois dela. */
function sugestoesPendentes(
  auto: IndicadorAutoavaliacao[],
  cicloAberto: boolean,
): SugestoesPendentes {
  const mapa: SugestoesPendentes = new Map();
  if (!cicloAberto) return mapa;
  for (const i of auto) {
    if (!i.sugestao) continue;
    if (i.treinador && i.treinador.em >= i.sugestao.em) continue;
    mapa.set(i.indicadorId, i.sugestao);
  }
  return mapa;
}

const indicadoresDe = (p: Pilar): Indicador[] => p.indicadores ?? [];
const pontuavel = (i: Indicador) => i.tipo !== "R" && !i.calculado;

/** undefined = campo intocado; null = valor inválido; número = válido. */
function numero(texto: string | undefined): number | null | undefined {
  if (texto === undefined) return undefined;
  const n = Number(texto.replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

function useAtrasado<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/** Segue uma media query (ex.: celular). Sem matchMedia, vale falso. */
function useMedia(consulta: string): boolean {
  const [vale, setVale] = useState(() => window.matchMedia?.(consulta).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(consulta);
    if (!m) return;
    const aoMudar = () => setVale(m.matches);
    aoMudar();
    m.addEventListener("change", aoMudar);
    return () => m.removeEventListener("change", aoMudar);
  }, [consulta]);
  return vale;
}

export interface TelaAvaliarProps {
  atletaId?: string | undefined;
  aoEscolher: (id: string | undefined) => void;
}

/** Lançar avaliação: notas com evidência, prévia "antes → depois" vinda da API. */
export function TelaAvaliar({ atletaId, aoEscolher }: TelaAvaliarProps) {
  const ranking = useRanking({});
  const itens = ranking.data?.itens ?? [];
  const ciclo = ranking.data?.ciclo;

  return (
    <>
      <div className="page-head">
        <div>
          {ciclo && (
            <div className="eyebrow">
              Ciclo de {ciclo.nome} · prazo {fmtData(ciclo.prazo)}
            </div>
          )}
          <h1>Lançar avaliação</h1>
          <p>
            Cada nota vira um registro com data, avaliador e evidência. Nada é sobrescrito: o
            histórico mostra a evolução.
          </p>
        </div>
      </div>
      {itens.length > 0 && (
        <label className="field avaliar-campo" htmlFor="av-atleta">
          Atleta
          <select
            id="av-atleta"
            value={atletaId ?? ""}
            onChange={(e) => aoEscolher(e.target.value || undefined)}
          >
            <option value="">Escolha um atleta</option>
            {itens.map((i) => (
              <option key={i.atleta.id} value={i.atleta.id}>
                {i.atleta.nome} · {i.atleta.classe.nome}
                {i.completo ? "" : " · pendente"}
              </option>
            ))}
          </select>
        </label>
      )}
      {ranking.isPending && <p className="muted">Carregando atletas…</p>}
      {ranking.isError && (
        <div className="note" role="alert">
          {mensagemDeErro(ranking.error)}
        </div>
      )}
      {ranking.isSuccess && itens.length === 0 && (
        <div className="panel empty-state">
          <h2>Nenhum atleta para avaliar</h2>
          <p className="muted">
            Quando houver atletas cadastrados e vinculados ao seu perfil, eles aparecem aqui.
          </p>
        </div>
      )}
      {ranking.isSuccess && itens.length > 0 && !atletaId && (
        <section className="avaliar-grade-wrap" aria-labelledby="av-grade-titulo">
          <h2 id="av-grade-titulo">Escolha um atleta</h2>
          <p className="muted">Selecione quem você vai avaliar neste ciclo.</p>
          <ul className="avaliar-grade">
            {itens.map((i) => (
              <li key={i.atleta.id}>
                <button
                  type="button"
                  className="avaliar-cartao"
                  onClick={() => aoEscolher(i.atleta.id)}
                >
                  <Avatar nome={i.atleta.nome} fotoUrl={i.atleta.fotoUrl} />
                  <span className="avaliar-cartao-txt">
                    <strong>{i.atleta.nome}</strong>
                    <span className="avaliar-cartao-meta">
                      {i.atleta.classe.nome}
                      {!i.completo && <span className="pill st-parcial">Pendente</span>}
                    </span>
                  </span>
                  {i.score != null && (
                    <span className="avaliar-cartao-score">
                      <span className="sr-only">Score </span>
                      {fmt1(i.score)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {atletaId && <FormAvaliacao key={atletaId} id={atletaId} />}
    </>
  );
}

function FormAvaliacao({ id }: { id: string }) {
  const ficha = useFicha(id);
  const params = useParametros();
  const auto = useAutoavaliacao(id);

  if (ficha.isError || params.isError) {
    return (
      <div className="note" role="alert">
        {mensagemDeErro(ficha.error ?? params.error)}
      </div>
    );
  }
  if (!ficha.data || !params.data || auto.isPending) {
    return <p className="muted">Carregando avaliação…</p>;
  }
  // Sem a autoavaliação (falha na rota), a tela segue sem o selo "Sugestão do atleta".
  const lista = Array.isArray(auto.data?.indicadores) ? auto.data.indicadores : [];
  const sugestoes = sugestoesPendentes(lista, auto.data?.ciclo?.status === "aberto");
  return <Editor id={id} ficha={ficha.data} params={params.data} sugestoes={sugestoes} />;
}

function Editor({
  id,
  ficha,
  params,
  sugestoes,
}: {
  id: string;
  ficha: FichaAtleta;
  params: Parametros;
  sugestoes: SugestoesPendentes;
}) {
  const qc = useQueryClient();
  const [pilarId, setPilarId] = useState(ficha.pilares[0]?.id ?? "");
  const [rasc, setRasc] = useState<Record<string, Rascunho>>({});
  const [peso, setPeso] = useState<string | undefined>();
  const [altura, setAltura] = useState<string | undefined>();
  const [evMedida, setEvMedida] = useState("");
  // Uploads de anexo em andamento e versão do rascunho: limpar() a incrementa e, com isso,
  // um upload iniciado antes não recria o rascunho depois de gravado ou descartado.
  const [enviando, setEnviando] = useState(0);
  const versaoRasc = useRef(0);
  const celular = useMedia("(max-width: 1180px)");
  const abaAtiva = useRef<HTMLButtonElement>(null);
  const router = useRouter({ warn: false });
  // Leituras de handlers e do desmonte: sempre o rascunho mais recente.
  const rascRef = useRef(rasc);
  rascRef.current = rasc;
  const montado = useRef(true);
  const gravado = useRef(false);

  const pilar = ficha.pilares.find((p) => p.id === pilarId) ?? ficha.pilares[0];
  const meta = params.pilares.find((p) => p.id === pilar?.id);
  // Indicadores cuja evidência o gestor marcou como opcional (D5); o resto exige o texto.
  const opcionais = new Set(
    params.pilares.flatMap((p) =>
      p.indicadores.filter((i) => i.evidencia === "opcional").map((i) => i.id),
    ),
  );

  // O que mudou: só isso vai para a API.
  const notas: NonNullable<CorpoAvaliacao["notas"]> = [];
  // Erros de validação locais por campo: id do indicador, "peso", "altura" ou "evMedida".
  const erros: Record<string, string> = {};
  const alterados = new Set<string>();
  for (const p of ficha.pilares) {
    for (const ind of indicadoresDe(p).filter(pontuavel)) {
      const r = rasc[ind.id];
      if (!r || r.valor === undefined) continue;
      const evidencia = r.evidencia.trim();
      const link = (r.link ?? "").trim();
      const sug = sugestoes.get(ind.id);
      // Com sugestão do atleta pendente, escolher a nota é uma decisão (aprovar ou corrigir),
      // mesmo quando ela é igual à nota atual.
      if (
        !sug &&
        r.valor === ind.nota &&
        link === "" &&
        (evidencia === "" || evidencia === (ind.evidencia ?? ""))
      ) {
        continue;
      }
      alterados.add(p.id);
      // Evidência opcional: vazia segue sem texto; preenchida, vale a mesma regra de tamanho.
      const falha =
        evidencia === "" && opcionais.has(ind.id) ? null : mensagemEvidenciaNota(evidencia);
      const falhaLink = mensagemLinkVideo(link);
      const justificativa = (r.justificativa ?? "").trim();
      const diverge = !!sug && r.valor !== sug.valor;
      const falhaJust = !diverge
        ? null
        : justificativa === ""
          ? MSG_JUSTIFICATIVA
          : justificativa.length > MAX_JUSTIFICATIVA
            ? `A justificativa tem no máximo ${MAX_JUSTIFICATIVA} caracteres.`
            : null;
      if (falha) erros[ind.id] = falha;
      if (falhaLink) erros[`${ind.id}${SUFIXO_LINK}`] = falhaLink;
      if (falhaJust) erros[`${ind.id}${SUFIXO_JUST}`] = falhaJust;
      if (!falha && !falhaLink && !falhaJust) {
        notas.push({
          indicadorId: ind.id,
          valor: r.valor,
          ...(evidencia ? { evidencia } : {}),
          ...(link ? { link } : {}),
          ...(diverge ? { justificativa } : {}),
        });
      }
    }
  }
  const pesoN = numero(peso);
  const alturaN = numero(altura);
  const pesoMudou = pesoN !== undefined && pesoN !== (ficha.classFit?.pesoKg ?? null);
  const alturaMudou = alturaN !== undefined && alturaN !== (ficha.classFit?.alturaCm ?? null);
  const medida: NonNullable<CorpoAvaliacao["medida"]> = {};
  if (pesoMudou) {
    const falha = (peso ?? "").trim() === "" ? MSG_PESO_VAZIO : mensagemPeso(peso ?? "");
    if (falha || pesoN == null) erros["peso"] = falha ?? MSG_PESO_VAZIO;
    else medida.pesoKg = pesoN;
  }
  if (alturaMudou) {
    const falha = (altura ?? "").trim() === "" ? MSG_ALTURA_VAZIA : mensagemAltura(altura ?? "");
    if (falha || alturaN == null) erros["altura"] = falha ?? MSG_ALTURA_VAZIA;
    else medida.alturaCm = alturaN;
  }
  const temMedida = medida.pesoKg !== undefined || medida.alturaCm !== undefined;
  if (pesoMudou || alturaMudou) {
    const falha = mensagemEvidenciaMedida(evMedida);
    if (falha) erros["evMedida"] = falha;
    else if (temMedida && evMedida.trim()) medida.evidencia = evMedida.trim();
    alterados.add("cf");
  }

  const corpo: CorpoAvaliacao = { notas, ...(temMedida ? { medida } : {}) };
  // O anexo só vai na gravação; a prévia não precisa dele.
  const corpoEnvio: CorpoAvaliacao = {
    ...corpo,
    notas: notas.map((n) => {
      const anexoId = rasc[n.indicadorId]?.anexoId;
      return anexoId ? { ...n, anexoId } : n;
    }),
  };
  const nErros = Object.keys(erros).length;
  const mudou = notas.length > 0 || temMedida || nErros > 0;
  const pronto = nErros === 0 && (notas.length > 0 || temMedida);
  const chave = JSON.stringify(corpo);
  const chaveAtrasada = useAtrasado(chave, ATRASO_PREVIA_MS);

  const previa = useQuery({
    queryKey: ["previa", id, chaveAtrasada],
    enabled: pronto && chave === chaveAtrasada,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: () => preverAvaliacao(id, JSON.parse(chaveAtrasada) as CorpoAvaliacao),
  });

  const salvar = useMutation({
    mutationFn: () => lancarAvaliacao(id, corpoEnvio),
    onSuccess: (r) => {
      // Os anexos agora estão vinculados às notas: não são mais órfãos.
      gravado.current = true;
      toast.success(`Avaliação lançada. Novo score: ${fmt1(r.depois.score)}.`);
      void qc.invalidateQueries({ queryKey: ["atleta", id] });
      void qc.invalidateQueries({ queryKey: ["ranking"] });
      void qc.invalidateQueries({ queryKey: ["investimento"] });
      void invalidarNotificacoes(qc);
      void qc.invalidateQueries({ queryKey: ["evidencias", id] });
      limpar(false);
    },
  });

  // Erros do 400 da API, por campo; "notas.N.evidencia" aponta para o N-ésimo item enviado.
  const doServidor: Record<string, string> = {};
  if (salvar.isError) {
    for (const [campo, mensagem] of Object.entries(errosPorCampo(salvar.error))) {
      const partes = campo.split(".");
      let chaveCampo: string | undefined;
      if (partes[0] === "notas" && partes[1] !== undefined) {
        const indId = notas[Number(partes[1])]?.indicadorId;
        chaveCampo =
          indId && partes[2] === "link"
            ? `${indId}${SUFIXO_LINK}`
            : indId && partes[2] === "justificativa"
              ? `${indId}${SUFIXO_JUST}`
              : indId;
      } else if (partes[0] === "medida") {
        chaveCampo = { pesoKg: "peso", alturaCm: "altura", evidencia: "evMedida" }[partes[1] ?? ""];
      }
      if (chaveCampo && !(chaveCampo in doServidor)) doServidor[chaveCampo] = mensagem;
    }
  }
  const errosCampo: Record<string, string> = { ...doServidor, ...erros };
  const primeiroErro = Object.values(errosCampo)[0];

  /** Qualquer edição tira o erro vindo do servidor: ele se refere ao envio anterior. */
  const aoEditar = () => {
    if (salvar.isError) salvar.reset();
  };

  /** Apaga anexos enviados que não vão para nenhuma nota (em segundo plano, sem aviso). */
  const soltarAnexos = (ids: Array<string | undefined>) => {
    for (const a of ids) if (a) void removerEvidenciaOrfa(a);
  };

  function limpar(soltar = true) {
    if (soltar) soltarAnexos(Object.values(rascRef.current).map((r) => r.anexoId));
    versaoRasc.current += 1;
    setRasc({});
    setPeso(undefined);
    setAltura(undefined);
    setEvMedida("");
  }
  const descartar = () => {
    limpar();
    salvar.reset();
  };
  useEffect(() => {
    abaAtiva.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [pilarId]);
  // Sair do editor (trocar de atleta, navegar, descartar na confirmação) com anexo não salvo.
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (!gravado.current) {
        for (const r of Object.values(rascRef.current)) {
          if (r.anexoId) void removerEvidenciaOrfa(r.anexoId);
        }
      }
    };
  }, []);
  const mudarRasc = (indId: string, parte: Partial<Rascunho>) => {
    aoEditar();
    const atual = rascRef.current[indId];
    let proximo = parte;
    // Voltar a nota ao valor original tira a nota do envio: o anexo ficaria sem destino.
    if (
      parte.valor !== undefined &&
      parte.valor === notaAtual(indId) &&
      atual?.anexoId &&
      !sugestoes.has(indId)
    ) {
      proximo = { ...parte, anexoId: undefined, anexoNome: undefined };
    }
    // Remover ou trocar o anexo: o antigo vira órfão.
    if (atual?.anexoId && "anexoId" in proximo && proximo.anexoId !== atual.anexoId) {
      soltarAnexos([atual.anexoId]);
    }
    setRasc((r) => ({ ...r, [indId]: { evidencia: "", ...r[indId], ...proximo } }));
  };
  const notaAtual = (indId: string) =>
    ficha.pilares.flatMap(indicadoresDe).find((i) => i.id === indId)?.nota ?? undefined;
  const envioDe = (indId: string): Envio => ({
    iniciar: () => {
      setEnviando((n) => n + 1);
      return versaoRasc.current;
    },
    concluir: (versao, anexo) => {
      if (montado.current) setEnviando((n) => Math.max(0, n - 1));
      if (!anexo) return;
      const atual = rascRef.current[indId];
      // Só anexa a um rascunho que ainda existe: sem nota alterada (ou com o editor já
      // descartado ou fechado), o anexo recém-enviado seria órfão.
      const serve =
        montado.current &&
        versao === versaoRasc.current &&
        !!atual &&
        atual.valor !== undefined &&
        (atual.valor !== notaAtual(indId) || sugestoes.has(indId));
      if (!serve) return soltarAnexos([anexo.id]);
      // Trocar o anexo: o anterior vira órfão.
      if (atual.anexoId && atual.anexoId !== anexo.id) soltarAnexos([atual.anexoId]);
      setRasc((r) => {
        const a = r[indId];
        if (!a) return r;
        return { ...r, [indId]: { ...a, anexoId: anexo.id, anexoNome: anexo.nome } };
      });
    },
  });

  if (!pilar) return null;
  const rubricas = params.rubricas.filter((r) => r.pilarId === pilar.id);
  const geral = rubricas.length === 0;
  const escala = (geral ? params.rubricas.filter((r) => r.pilarId === null) : rubricas)
    .slice()
    .sort((a, b) => a.nota - b.nota);
  const dep = previa.data?.depois;
  const ant = previa.data?.antes;
  // Do clique até a resposta: atraso do debounce, requisição e dado velho mantido na tela.
  const recalculando =
    pronto && (chave !== chaveAtrasada || previa.isFetching || previa.isPlaceholderData);
  const acoes = (
    <>
      <button
        type="button"
        className="btn primary"
        disabled={!pronto || salvar.isPending || enviando > 0}
        onClick={() => salvar.mutate()}
      >
        {salvar.isPending ? "Salvando…" : enviando > 0 ? "Enviando anexo…" : "Salvar avaliação"}
      </button>
      <button
        type="button"
        className="btn ghost"
        disabled={!mudou || enviando > 0}
        onClick={descartar}
      >
        Descartar
      </button>
    </>
  );

  return (
    <>
      <div className="ptabs" role="group" aria-label="Pilares">
        {ficha.pilares.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ptab"
            ref={p.id === pilar.id ? abaAtiva : undefined}
            aria-pressed={p.id === pilar.id}
            onClick={() => setPilarId(p.id)}
          >
            <b>
              {p.nomeCurto}
              {alterados.has(p.id) ? " •" : ""}
            </b>
            <span>
              {p.preenchidos}/{p.total} · {p.peso} pts
            </span>
          </button>
        ))}
      </div>
      {router && <BloqueioRascunho ativo={mudou || enviando > 0} />}
      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>{pilar.nome}</h2>
            <span className="muted">{pilar.peso} pts no score</span>
          </div>
          <div className="editor">
            <div className="rubric">
              <b>{geral ? "Escala geral" : "Rubrica do pilar"}</b>
              <ol className="escala">
                {escala.map((r) => (
                  <li key={r.nota}>
                    <span className="escala-nota">{r.nota}</span>
                    <span>{r.descricao}</span>
                  </li>
                ))}
              </ol>
            </div>
            {indicadoresDe(pilar).map((ind) => (
              <LinhaIndicador
                key={ind.id}
                ind={ind}
                escala={escala}
                evidenciaPadrao={meta?.evidenciaPadrao ?? ""}
                rascunho={rasc[ind.id]}
                erro={errosCampo[ind.id]}
                erroLink={errosCampo[`${ind.id}${SUFIXO_LINK}`]}
                erroJustificativa={errosCampo[`${ind.id}${SUFIXO_JUST}`]}
                sugestaoAtleta={sugestoes.get(ind.id)}
                evidenciaOpcional={opcionais.has(ind.id)}
                atletaId={id}
                envio={envioDe(ind.id)}
                aoMudar={(parte) => mudarRasc(ind.id, parte)}
                medida={{
                  peso,
                  altura,
                  evidencia: evMedida,
                  atual: ficha.classFit,
                  setPeso,
                  setAltura,
                  setEvidencia: setEvMedida,
                  erroPeso: errosCampo["peso"],
                  erroAltura: errosCampo["altura"],
                  erroEvidencia: errosCampo["evMedida"],
                }}
              />
            ))}
          </div>
          {salvar.isError && (
            <div className="note" role="alert" style={{ marginTop: 14 }}>
              {mensagemDeErro(salvar.error)}
            </div>
          )}
          {!celular && <div className="avaliar-rodape">{acoes}</div>}
        </section>
        <aside
          className={`panel preview avaliar-previa${recalculando && dep ? " avaliar-previa-recalc" : ""}`}
          aria-busy={recalculando}
        >
          <div className="eyebrow">Prévia do cálculo</div>
          <h3 style={{ marginTop: 8 }}>{ficha.atleta.nome}</h3>
          <div aria-live="polite" aria-atomic="true">
            {nErros > 0 && (
              <p className="muted">
                Corrija os campos indicados (evidência, justificativa, peso e altura) para ver a
                prévia.
              </p>
            )}
            {!mudou && <p className="muted">Escolha uma nota para ver o efeito no score.</p>}
            {pronto && recalculando && !dep && <p className="muted">Calculando prévia…</p>}
            {pronto && recalculando && dep && <p className="muted">Recalculando…</p>}
            {pronto && previa.isError && (
              <div className="note" role="alert">
                {mensagemDeErro(previa.error)}
              </div>
            )}
            {pronto && ant && dep && (
              <>
                <dl className="kv" style={{ marginTop: 10 }}>
                  <dt>Score</dt>
                  <dd className="num">
                    {fmt1(ant.score)} → <b>{fmt1(dep.score)}</b>
                  </dd>
                  <dt>Faixa</dt>
                  <dd>
                    <FaixaPill faixa={ant.faixa} /> → <FaixaPill faixa={dep.faixa} />
                  </dd>
                  <dt>Gates</dt>
                  <dd>
                    {textoDoStatus(ficha.gates.statusFinal)} →{" "}
                    <b>{textoDoStatus(dep.statusGates)}</b>
                  </dd>
                </dl>
                <ul>
                  {ficha.pilares.flatMap((p) => {
                    const a = ant.pilares.find((x) => x.id === p.id)?.nota ?? null;
                    const d = dep.pilares.find((x) => x.id === p.id)?.nota ?? null;
                    if (a === d) return [];
                    return [
                      <li key={p.id}>
                        <span>{p.nomeCurto}</span>
                        <span className="num">
                          {a == null ? "sem nota" : fmt1(a)} →{" "}
                          <b>{d == null ? "sem nota" : fmt1(d)}</b>
                        </span>
                      </li>,
                    ];
                  })}
                </ul>
              </>
            )}
          </div>
          <p className="muted" style={{ fontSize: ".82rem", margin: "10px 0 0" }}>
            Valores calculados pela API; nada é gravado até você salvar.
          </p>
        </aside>
      </div>
      {celular && mudou && (
        <div className="avaliar-barra" role="region" aria-label="Resumo e ações da avaliação">
          <span className="avaliar-barra-resumo">
            {pronto && ant && dep ? (
              <>
                Score:{" "}
                <b className="num">
                  {fmt1(ant.score)} → {fmt1(dep.score)}
                </b>
              </>
            ) : primeiroErro !== undefined ? (
              primeiroErro
            ) : (
              "Calculando…"
            )}
          </span>
          <span className="avaliar-barra-acoes">{acoes}</span>
        </div>
      )}
    </>
  );
}

interface CamposMedida {
  peso: string | undefined;
  altura: string | undefined;
  evidencia: string;
  atual: FichaAtleta["classFit"];
  setPeso: (v: string) => void;
  setAltura: (v: string) => void;
  setEvidencia: (v: string) => void;
  erroPeso: string | undefined;
  erroAltura: string | undefined;
  erroEvidencia: string | undefined;
}

interface LinhaProps {
  ind: Indicador;
  escala: Parametros["rubricas"];
  evidenciaPadrao: string;
  rascunho: Rascunho | undefined;
  erro: string | undefined;
  erroLink: string | undefined;
  erroJustificativa: string | undefined;
  sugestaoAtleta: SugestaoAtleta | undefined;
  evidenciaOpcional: boolean;
  atletaId: string;
  envio: Envio;
  aoMudar: (p: Partial<Rascunho>) => void;
  medida: CamposMedida;
}

function LinhaIndicador({
  ind,
  escala,
  evidenciaPadrao,
  rascunho,
  erro,
  erroLink,
  erroJustificativa,
  sugestaoAtleta,
  evidenciaOpcional,
  atletaId,
  envio,
  aoMudar,
  medida,
}: LinhaProps) {
  if (ind.tipo === "R") {
    return (
      <div className="ed-row">
        <div className="lbl">
          {ind.nome}
          <small>
            Registrado, não pontua (proposta P5)
            {ind.resposta ? ` · resposta: “${ind.resposta}”` : ""}
          </small>
        </div>
      </div>
    );
  }
  if (ind.calculado && INDICADORES_DE_RESULTADO.includes(ind.id)) {
    return (
      <div className="ed-row">
        <div className="lbl">
          {ind.nome}
          <small>
            {ind.explicacao ?? "Sem resultado validado."} Nota calculada pelos resultados validados
            (regra provisória, P12){ind.nota != null ? `: ${ind.nota} de 5` : ""}. Não recebe nota
            digitada: o atleta informa os resultados e o treinador valida na ficha.
          </small>
        </div>
      </div>
    );
  }
  if (ind.calculado) {
    const pesoTxt = medida.peso ?? (medida.atual ? String(medida.atual.pesoKg) : "");
    const altTxt =
      medida.altura ?? (medida.atual?.alturaCm != null ? String(medida.atual.alturaCm) : "");
    return (
      <div className="ed-row">
        <div className="lbl">
          {ind.nome}
          <small>
            Nota calculada pela faixa da classe
            {ind.nota != null ? `: ${ind.nota} de 5 (regra provisória, P3)` : ""}. Não recebe nota
            digitada.
          </small>
        </div>
        <div className="avaliar-peso">
          <div className="avaliar-campo-med">
            <label className="field" htmlFor="av-peso">
              Peso (kg)
              <input
                id="av-peso"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={pesoTxt}
                {...atributosDoCampo("av-peso-erro", medida.erroPeso)}
                onChange={(e) => medida.setPeso(e.target.value)}
              />
            </label>
            <MensagemCampo id="av-peso-erro" texto={medida.erroPeso} />
          </div>
          <div className="avaliar-campo-med">
            <label className="field" htmlFor="av-altura">
              Altura (cm)
              <input
                id="av-altura"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={altTxt}
                {...atributosDoCampo("av-altura-erro", medida.erroAltura)}
                onChange={(e) => medida.setAltura(e.target.value)}
              />
            </label>
            <MensagemCampo id="av-altura-erro" texto={medida.erroAltura} />
          </div>
        </div>
        <div className="avaliar-campo-med ev">
          <label className="field ev" htmlFor="av-ev-medida">
            Evidência da medida (opcional)
            <input
              id="av-ev-medida"
              placeholder="Ex.: pesagem oficial da regata"
              value={medida.evidencia}
              {...atributosDoCampo("av-ev-medida-erro", medida.erroEvidencia)}
              onChange={(e) => medida.setEvidencia(e.target.value)}
            />
          </label>
          <MensagemCampo id="av-ev-medida-erro" texto={medida.erroEvidencia} />
        </div>
      </div>
    );
  }

  return (
    <LinhaNota
      ind={ind}
      escala={escala}
      evidenciaPadrao={evidenciaPadrao}
      rascunho={rascunho}
      erro={erro}
      erroLink={erroLink}
      erroJustificativa={erroJustificativa}
      sugestaoAtleta={sugestaoAtleta}
      evidenciaOpcional={evidenciaOpcional}
      atletaId={atletaId}
      envio={envio}
      aoMudar={aoMudar}
    />
  );
}

type PropsNota = Omit<LinhaProps, "medida">;

function LinhaNota({
  ind,
  escala,
  evidenciaPadrao,
  rascunho,
  erro,
  erroLink,
  erroJustificativa,
  sugestaoAtleta,
  evidenciaOpcional,
  atletaId,
  envio,
  aoMudar,
}: PropsNota) {
  const valor = rascunho?.valor ?? ind.nota ?? undefined;
  const sug = ind.sugestaoPendente;
  const descricao = escala.find((r) => r.nota === valor)?.descricao;
  const descricaoAtual = escala.find((r) => r.nota === ind.nota)?.descricao;
  // Evidência e anexo só aparecem quando a nota muda ou já há algo digitado/anexado.
  const mudouNota = valor !== undefined && valor !== (ind.nota ?? undefined);
  const decidindo = !!sugestaoAtleta && rascunho?.valor !== undefined;
  const mostraEvidencia =
    mudouNota ||
    decidindo ||
    (rascunho?.evidencia.trim() ?? "") !== "" ||
    (rascunho?.link ?? "") !== "" ||
    !!rascunho?.anexoId;
  const campoEvidencia = useRef<HTMLInputElement>(null);
  const campoJustificativa = useRef<HTMLTextAreaElement>(null);
  const focarJustificativa = useRef(false);
  const diverge =
    !!sugestaoAtleta && rascunho?.valor !== undefined && rascunho.valor !== sugestaoAtleta.valor;
  const mostraJustificativa = !!sugestaoAtleta && (diverge || !!rascunho?.corrigindo);
  // "Corrigir" leva o foco ao campo (ação do próprio usuário); escolher a nota não move o foco.
  useEffect(() => {
    if (focarJustificativa.current && campoJustificativa.current) {
      campoJustificativa.current.focus();
      focarJustificativa.current = false;
    }
  }, [rascunho?.corrigindo]);
  // O foco fica nas notas (WCAG 3.2.2): o campo novo é anunciado, não recebe foco sozinho.
  const faltaEvidencia =
    mostraEvidencia && !evidenciaOpcional && (rascunho?.evidencia.trim() ?? "") === "";

  return (
    <div className="ed-row">
      <div className="lbl">
        {ind.nome}
        <small>
          {ind.resposta
            ? `Resposta do atleta: “${ind.resposta}”`
            : ind.tipo === "A"
              ? "Atleta ainda não respondeu"
              : `Atual: ${ind.nota == null ? "sem nota" : ind.nota}${
                  descricaoAtual ? ` · ${descricaoAtual}` : ""
                }`}
        </small>
        {sugestaoAtleta && (
          <div className="aval-sug-atleta">
            <span>
              <b>Sugestão do atleta: {sugestaoAtleta.valor}</b>
            </span>
            {sugestaoAtleta.evidencia && (
              <span>Evidência do atleta: {sugestaoAtleta.evidencia}</span>
            )}
            {sugestaoAtleta.link && <VerVideo url={sugestaoAtleta.link} />}
            {sugestaoAtleta.anexo && (
              <AbrirEvidencia
                id={sugestaoAtleta.anexo.id}
                nomeArquivo={sugestaoAtleta.anexo.nomeArquivo}
                className="ficha-clipe"
              >
                <i className="ph ph-paperclip" aria-hidden="true" />
                <span>{sugestaoAtleta.anexo.nomeArquivo}</span>
              </AbrirEvidencia>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn sm"
                aria-label={`Aprovar sugestão ${sugestaoAtleta.valor} do atleta em ${ind.nome}`}
                onClick={() =>
                  aoMudar({
                    valor: sugestaoAtleta.valor,
                    evidencia: sugestaoAtleta.evidencia ?? "",
                    link: sugestaoAtleta.link ?? "",
                    justificativa: "",
                    corrigindo: false,
                  })
                }
              >
                Aprovar
              </button>
              <button
                type="button"
                className="btn sm"
                aria-label={`Corrigir sugestão do atleta em ${ind.nome}`}
                aria-expanded={mostraJustificativa}
                onClick={() => {
                  focarJustificativa.current = true;
                  aoMudar({ corrigindo: true });
                }}
              >
                Corrigir
              </button>
            </div>
          </div>
        )}
        {sug && (
          <div className="avaliar-sugestao">
            <span>Sugestão pela resposta: {sug.valor}</span>
            <button
              type="button"
              className="btn sm"
              onClick={() => aoMudar({ valor: sug.valor })}
              aria-label={`Usar sugestão ${sug.valor} em ${ind.nome}`}
            >
              Usar sugestão
            </button>
          </div>
        )}
      </div>
      <div className="seg seg-radio" role="radiogroup" aria-label={`Nota de ${ind.nome}`}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <label key={n} title={escala.find((r) => r.nota === n)?.descricao}>
            <input
              type="radio"
              name={`nota-${ind.id}`}
              value={n}
              checked={valor === n}
              onChange={() => aoMudar({ valor: n })}
            />
            {n}
          </label>
        ))}
      </div>
      {mudouNota && descricao && (
        <div className="lbl" style={{ gridColumn: "1 / -1" }}>
          <small>
            Nota {valor}: {descricao}
          </small>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {faltaEvidencia ? `Evidência obrigatória para a nova nota de ${ind.nome}` : ""}
        {decidindo && !diverge && !rascunho?.corrigindo
          ? `Sugestão do atleta aprovada em ${ind.nome}: nota ${rascunho?.valor}`
          : ""}
      </span>
      {mostraJustificativa && (
        <div className="aval-justificativa">
          <label className="field" htmlFor={`just-${ind.id}`}>
            Justificativa da correção (obrigatória quando a nota difere da sugestão)
            <textarea
              ref={campoJustificativa}
              id={`just-${ind.id}`}
              rows={2}
              maxLength={MAX_JUSTIFICATIVA}
              value={rascunho?.justificativa ?? ""}
              {...atributosDoCampo(`just-erro-${ind.id}`, erroJustificativa)}
              onChange={(e) => aoMudar({ justificativa: e.target.value })}
            />
          </label>
          <MensagemCampo id={`just-erro-${ind.id}`} texto={erroJustificativa} />
        </div>
      )}
      {mostraEvidencia && (
        <div
          className={
            faltaEvidencia ? "avaliar-evidencia avaliar-evidencia-nova" : "avaliar-evidencia"
          }
        >
          <label className="field ev" htmlFor={`ev-${ind.id}`}>
            {evidenciaOpcional ? "Evidência (opcional)" : "Evidência (obrigatória)"}
            <input
              ref={campoEvidencia}
              id={`ev-${ind.id}`}
              maxLength={EVID_MAX}
              placeholder={evidenciaPadrao ? `Ex.: ${evidenciaPadrao}` : ""}
              value={rascunho?.evidencia ?? ""}
              {...atributosDoCampo(`ev-erro-${ind.id}`, erro)}
              onChange={(e) => aoMudar({ evidencia: e.target.value })}
            />
          </label>
          {evidenciaPadrao && (
            <button
              type="button"
              className="btn sm ghost avaliar-usar-padrao"
              onClick={() => {
                aoMudar({ evidencia: evidenciaPadrao });
                campoEvidencia.current?.focus();
              }}
            >
              Usar «{evidenciaPadrao}»
            </button>
          )}
          <MensagemCampo id={`ev-erro-${ind.id}`} texto={erro} />
          <label className="field ev" htmlFor={`link-${ind.id}`}>
            Link do vídeo (opcional)
            <input
              id={`link-${ind.id}`}
              type="url"
              inputMode="url"
              maxLength={EVID_MAX}
              placeholder="https://"
              autoComplete="off"
              value={rascunho?.link ?? ""}
              {...atributosDoCampo(`link-erro-${ind.id}`, erroLink)}
              onChange={(e) => aoMudar({ link: e.target.value })}
            />
          </label>
          <MensagemCampo id={`link-erro-${ind.id}`} texto={erroLink} />
          <AnexoDaNota
            atletaId={atletaId}
            indicador={ind}
            anexoNome={rascunho?.anexoNome}
            envio={envio}
            aoRemover={() => aoMudar({ anexoId: undefined, anexoNome: undefined })}
          />
        </div>
      )}
    </div>
  );
}

/** "Anexar evidência": envia o arquivo na hora e guarda o id para seguir junto da nota. */
function AnexoDaNota({
  atletaId,
  indicador,
  anexoNome,
  envio,
  aoRemover,
}: {
  atletaId: string;
  indicador: Indicador;
  anexoNome: string | undefined;
  envio: Envio;
  aoRemover: () => void;
}) {
  const qc = useQueryClient();
  const [erro, setErro] = useState("");
  const enviar = useMutation({
    mutationFn: (arquivo: File) => enviarEvidencia(atletaId, arquivo, indicador.id),
    onSuccess: (r, _arquivo, versao) => {
      setErro("");
      envio.concluir(versao, { id: r.id, nome: r.nomeArquivo });
      void qc.invalidateQueries({ queryKey: ["evidencias", atletaId] });
    },
    onError: (e, _arquivo, versao) => {
      setErro(mensagemDeErro(e, "Não foi possível anexar o arquivo."));
      envio.concluir(versao ?? -1);
    },
    onMutate: () => envio.iniciar(),
  });

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    const recusa = validarArquivo(arquivo);
    if (recusa) return setErro(recusa);
    setErro("");
    enviar.mutate(arquivo);
  }

  const arquivo = useMemo(() => (anexoNome ? new File([], anexoNome) : null), [anexoNome]);

  return (
    <div className="avaliar-anexo">
      <CampoArquivo
        id={`anexo-${indicador.id}`}
        rotulo={`Anexar evidência de ${indicador.nome}`}
        accept={ACEITA_ARQUIVO}
        textoBotao="Anexar evidência"
        contexto={indicador.nome}
        dica="PDF, JPG ou PNG, até 5 MB"
        arquivo={arquivo}
        desabilitado={enviar.isPending}
        aoEscolher={(f) => (f ? escolher(f) : aoRemover())}
      />
      {enviar.isPending && <span className="muted">Enviando…</span>}
      {anexoNome && !enviar.isPending && <span className="muted">Anexo segue junto da nota.</span>}
      {erro && (
        <span className="avaliar-erro-campo" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}

/**
 * Confirma antes de sair da avaliação com alterações: trocar de atleta, menu, busca ou voltar.
 * Fechar a aba também avisa (`beforeunload`). Só entra quando há um roteador (a rota).
 */
function BloqueioRascunho({ ativo }: { ativo: boolean }) {
  const ativoRef = useRef(ativo);
  ativoRef.current = ativo;
  const bloqueio = useBlocker({
    shouldBlockFn: () => ativoRef.current,
    enableBeforeUnload: () => ativoRef.current,
    withResolver: true,
  });
  if (bloqueio.status !== "blocked") return null;
  return (
    <Dialogo titulo="Descartar a avaliação em andamento?" aoFechar={bloqueio.reset}>
      <p>
        As notas, evidências e anexos que você ainda não salvou serão descartados. Essa ação não
        pode ser desfeita.
      </p>
      <div className="avaliar-rodape">
        <button type="button" className="btn primary" onClick={bloqueio.reset}>
          Continuar editando
        </button>
        <button type="button" className="btn ghost" onClick={bloqueio.proceed}>
          Descartar e sair
        </button>
      </div>
    </Dialogo>
  );
}
