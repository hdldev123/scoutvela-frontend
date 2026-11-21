import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { CampoArquivo } from "./CampoArquivo";
import { FaixaPill } from "./FaixaPill";
import { textoDoStatus } from "./status-gate";
import { fmt0, fmt1, fmtData } from "./formato";
import "@/styles/avaliar.css";
import "@/styles/ficha.css";
import {
  lancarAvaliacao,
  preverAvaliacao,
  useParametros,
  type CorpoAvaliacao,
  type Parametros,
} from "@/lib/api/avaliacao";
import { mensagemDeErro } from "@/lib/api/cliente";
import { invalidarNotificacoes } from "@/lib/api/notificacoes";
import { ACEITA_ARQUIVO, enviarEvidencia, validarArquivo } from "@/lib/api/evidencias";
import { useFicha, useRanking, type FichaAtleta } from "@/lib/api/consultas";

type Pilar = FichaAtleta["pilares"][number];
type Indicador = NonNullable<Pilar["indicadores"]>[number];

const EVID_MIN = 3;
const EVID_MAX = 500;
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
  anexoId?: string | undefined;
  anexoNome?: string | undefined;
}

const indicadoresDe = (p: Pilar): Indicador[] => p.indicadores ?? [];
const pontuavel = (i: Indicador) => i.tipo !== "R" && !i.calculado;
const evidenciaValida = (t: string) => t.trim().length >= EVID_MIN && t.trim().length <= EVID_MAX;

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

  if (ficha.isError || params.isError) {
    return (
      <div className="note" role="alert">
        {mensagemDeErro(ficha.error ?? params.error)}
      </div>
    );
  }
  if (!ficha.data || !params.data) return <p className="muted">Carregando avaliação…</p>;
  return <Editor id={id} ficha={ficha.data} params={params.data} />;
}

function Editor({ id, ficha, params }: { id: string; ficha: FichaAtleta; params: Parametros }) {
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

  const pilar = ficha.pilares.find((p) => p.id === pilarId) ?? ficha.pilares[0];
  const meta = params.pilares.find((p) => p.id === pilar?.id);

  // O que mudou: só isso vai para a API.
  const notas: NonNullable<CorpoAvaliacao["notas"]> = [];
  const invalidos = new Set<string>();
  const alterados = new Set<string>();
  for (const p of ficha.pilares) {
    for (const ind of indicadoresDe(p).filter(pontuavel)) {
      const r = rasc[ind.id];
      if (!r || r.valor === undefined) continue;
      const evidencia = r.evidencia.trim();
      if (r.valor === ind.nota && (evidencia === "" || evidencia === (ind.evidencia ?? ""))) {
        continue;
      }
      alterados.add(p.id);
      if (!evidenciaValida(evidencia)) invalidos.add(ind.id);
      else notas.push({ indicadorId: ind.id, valor: r.valor, evidencia });
    }
  }
  const pesoN = numero(peso);
  const alturaN = numero(altura);
  const pesoMudou = pesoN !== undefined && pesoN !== (ficha.classFit?.pesoKg ?? null);
  const alturaMudou = alturaN !== undefined && alturaN !== (ficha.classFit?.alturaCm ?? null);
  const medida: NonNullable<CorpoAvaliacao["medida"]> = {};
  if (pesoMudou) {
    if (pesoN == null) invalidos.add("peso");
    else medida.pesoKg = pesoN;
  }
  if (alturaMudou) {
    if (alturaN == null) invalidos.add("altura");
    else medida.alturaCm = alturaN;
  }
  const temMedida = medida.pesoKg !== undefined || medida.alturaCm !== undefined;
  if (temMedida && evMedida.trim()) medida.evidencia = evMedida.trim();
  if (pesoMudou || alturaMudou) alterados.add("cf");

  const corpo: CorpoAvaliacao = { notas, ...(temMedida ? { medida } : {}) };
  // O anexo só vai na gravação; a prévia não precisa dele.
  const corpoEnvio: CorpoAvaliacao = {
    ...corpo,
    notas: notas.map((n) => {
      const anexoId = rasc[n.indicadorId]?.anexoId;
      return anexoId ? { ...n, anexoId } : n;
    }),
  };
  const mudou = notas.length > 0 || temMedida || invalidos.size > 0;
  const pronto = invalidos.size === 0 && (notas.length > 0 || temMedida);
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
      toast.success(`Avaliação lançada. Novo score: ${fmt1(r.depois.score)}.`);
      void qc.invalidateQueries({ queryKey: ["atleta", id] });
      void qc.invalidateQueries({ queryKey: ["ranking"] });
      void qc.invalidateQueries({ queryKey: ["investimento"] });
      void invalidarNotificacoes(qc);
      void qc.invalidateQueries({ queryKey: ["evidencias", id] });
      limpar();
    },
  });

  function limpar() {
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
  const mudarRasc = (indId: string, parte: Partial<Rascunho>) =>
    setRasc((r) => ({ ...r, [indId]: { evidencia: "", ...r[indId], ...parte } }));
  const notaAtual = (indId: string) =>
    ficha.pilares.flatMap(indicadoresDe).find((i) => i.id === indId)?.nota ?? undefined;
  const envioDe = (indId: string): Envio => ({
    iniciar: () => {
      setEnviando((n) => n + 1);
      return versaoRasc.current;
    },
    concluir: (versao, anexo) => {
      setEnviando((n) => Math.max(0, n - 1));
      if (!anexo || versao !== versaoRasc.current) return;
      // Só anexa a um rascunho que ainda existe: sem nota alterada, o anexo seria órfão.
      setRasc((r) => {
        const atual = r[indId];
        if (!atual || atual.valor === undefined || atual.valor === notaAtual(indId)) return r;
        return { ...r, [indId]: { ...atual, anexoId: anexo.id, anexoNome: anexo.nome } };
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
                invalido={invalidos.has(ind.id)}
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
                  pesoInvalido: invalidos.has("peso"),
                  alturaInvalida: invalidos.has("altura"),
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
        <aside className="panel preview avaliar-previa">
          <div className="eyebrow">Prévia do cálculo</div>
          <h3 style={{ marginTop: 8 }}>{ficha.atleta.nome}</h3>
          <div aria-live="polite" aria-atomic="true">
            {invalidos.size > 0 && (
              <p className="muted">
                Informe a evidência (de {EVID_MIN} a {EVID_MAX} caracteres) e valores válidos para
                ver a prévia.
              </p>
            )}
            {!mudou && <p className="muted">Escolha uma nota para ver o efeito no score.</p>}
            {pronto && previa.isFetching && !previa.data && (
              <p className="muted">Calculando prévia…</p>
            )}
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
            ) : invalidos.size > 0 ? (
              "Falta evidência"
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
  pesoInvalido: boolean;
  alturaInvalida: boolean;
}

interface LinhaProps {
  ind: Indicador;
  escala: Parametros["rubricas"];
  evidenciaPadrao: string;
  rascunho: Rascunho | undefined;
  invalido: boolean;
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
  invalido,
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
          <label className="field" htmlFor="av-peso">
            Peso (kg)
            <input
              id="av-peso"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={pesoTxt}
              aria-invalid={medida.pesoInvalido}
              onChange={(e) => medida.setPeso(e.target.value)}
            />
          </label>
          <label className="field" htmlFor="av-altura">
            Altura (cm)
            <input
              id="av-altura"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={altTxt}
              aria-invalid={medida.alturaInvalida}
              onChange={(e) => medida.setAltura(e.target.value)}
            />
          </label>
        </div>
        <label className="field ev" htmlFor="av-ev-medida">
          Evidência da medida (opcional)
          <input
            id="av-ev-medida"
            maxLength={EVID_MAX}
            placeholder="Ex.: pesagem oficial da regata"
            value={medida.evidencia}
            onChange={(e) => medida.setEvidencia(e.target.value)}
          />
        </label>
      </div>
    );
  }

  return (
    <LinhaNota
      ind={ind}
      escala={escala}
      evidenciaPadrao={evidenciaPadrao}
      rascunho={rascunho}
      invalido={invalido}
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
  invalido,
  atletaId,
  envio,
  aoMudar,
}: PropsNota) {
  const valor = rascunho?.valor ?? ind.nota ?? undefined;
  const sug = ind.sugestaoPendente;
  // Nota sugerida pelos pontos do Ranking CBVela (regra PERF_PONTOS). Só vale se o avaliador lançar.
  const pontos = ind.sugestaoPontos;
  const descricao = escala.find((r) => r.nota === valor)?.descricao;
  const descricaoAtual = escala.find((r) => r.nota === ind.nota)?.descricao;
  // Evidência e anexo só aparecem quando a nota muda ou já há algo digitado/anexado.
  const mudouNota = valor !== undefined && valor !== (ind.nota ?? undefined);
  const mostraEvidencia =
    mudouNota || (rascunho?.evidencia.trim() ?? "") !== "" || !!rascunho?.anexoId;
  const campoEvidencia = useRef<HTMLInputElement>(null);
  // O foco fica nas notas (WCAG 3.2.2): o campo novo é anunciado, não recebe foco sozinho.
  const faltaEvidencia = mostraEvidencia && (rascunho?.evidencia.trim() ?? "") === "";

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
        {pontos && (
          <div className="avaliar-sugestao">
            <span>
              Sugerido pelo Ranking CBVela: nota {pontos.nota} ({fmt0(pontos.pontos)} pts)
            </span>
            <button
              type="button"
              className="btn sm"
              onClick={() => aoMudar({ valor: pontos.nota })}
              aria-label={`Usar sugestão do Ranking CBVela (nota ${pontos.nota}) em ${ind.nome}`}
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
      </span>
      {mostraEvidencia && (
        <div
          className={
            faltaEvidencia ? "avaliar-evidencia avaliar-evidencia-nova" : "avaliar-evidencia"
          }
        >
          <label className="field ev" htmlFor={`ev-${ind.id}`}>
            Evidência (obrigatória)
            <input
              ref={campoEvidencia}
              id={`ev-${ind.id}`}
              maxLength={EVID_MAX}
              placeholder={evidenciaPadrao ? `Ex.: ${evidenciaPadrao}` : ""}
              value={rascunho?.evidencia ?? ""}
              aria-invalid={invalido}
              aria-describedby={invalido ? `ev-erro-${ind.id}` : undefined}
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
          {invalido && (
            <span id={`ev-erro-${ind.id}`} className="avaliar-erro-campo">
              Informe a evidência, de {EVID_MIN} a {EVID_MAX} caracteres.
            </span>
          )}
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
