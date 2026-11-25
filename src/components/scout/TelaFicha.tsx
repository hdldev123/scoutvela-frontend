import { CartaoPerfil } from "./CartaoPerfil";
import { BlocoContato } from "./BlocoContato";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BigScore } from "./BigScore";
import { ComparacaoAutoavaliacao } from "./ComparacaoAutoavaliacao";
import { Dialogo } from "./Dialogo";
import { EvidenciasSecao, AbrirEvidencia, VerVideo } from "./EvidenciasSecao";
import { FinanceiroDialog } from "./FinanceiroDialog";
import { GaugeClassFit } from "./GaugeClassFit";
import { PedirAjusteDialog } from "./PedirAjusteDialog";
import { PedirRevisaoDialog } from "./PedirRevisaoDialog";
import { PesagensPendentes } from "./PesagensPendentes";
import { ConquistasParaValidar } from "./ConquistasParaValidar";
import { ResultadosParaValidar } from "./ResultadosParaValidar";
import { PlanoIndividual } from "./PlanoIndividual";
import { ResultadoDialog } from "./ResultadoDialog";
import { SemAcesso } from "./SemAcesso";
import { ComparacaoTurma } from "./ComparacaoTurma";
import { SparkScore } from "./SparkScore";
import { StatusPill } from "./StatusPill";
import { fmt0, fmt1, fmtData, fmtInstante, rotuloCiclo } from "./formato";
import { rotuloNivelHistorico } from "./niveis";
import { textoDoStatus } from "./status-gate";
import { seloApoio, seloAutonomia } from "./financeiro-util";
import { ErroApi, mensagemDeErro } from "@/lib/api/cliente";
import {
  useFicha,
  useHistoricoIndicador,
  type FichaAtleta,
  type LancamentoHistorico,
} from "@/lib/api/consultas";
import { atualizarGate } from "@/lib/api/mutacoes-ficha";
import { INDICADORES_DE_RESULTADO, ROTULO_STATUS_RESULTADO } from "@/lib/api/resultados";
import "@/styles/ficha.css";

type Pilar = FichaAtleta["pilares"][number];
type Indicador = NonNullable<Pilar["indicadores"]>[number];
type Gate = FichaAtleta["gates"]["itens"][number];

const SUPORTE: Record<string, string> = {
  A: "A · Alta autonomia",
  B: "B · Autonomia parcial",
  C: "C · Alta dependência",
  D: "D · Estrutura insuficiente",
};
const PATROCINIO = { sim: "Sim", em_negociacao: "Em negociação", nao: "Não" } as const;
const STATUS_GATE = ["apto", "condicional", "alerta"] as const;
const SEM_EVIDENCIA = "Sem evidência registrada";
const TEXTO_NAO_VE =
  "Este perfil não vê a ficha deste atleta. Treinador vê só os próprios atletas; o IBVAR vê só quem consentiu.";

/** Aceita só links http(s) do resultado oficial. */
const linkSeguro = (url: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

const ORIGEM_LANCAMENTO: Record<LancamentoHistorico["origem"], string> = {
  avaliacao: "Avaliação",
  resposta_confirmada: "Resposta do atleta confirmada",
  resposta_sugerida: "Sugestão do atleta, aguardando avaliador",
  autoavaliacao: "Autoavaliação do atleta, aguardando avaliador",
  autoavaliacao_aprovada: "Autoavaliação do atleta aprovada",
  calculado: "Calculada pela pesagem",
};
const ORIGEM_RESULTADO = "Calculado pelo resultado validado";
const rotuloFonte = (fonte: string, papel: string) =>
  papel === "ibvar" ? "Lançado" : (FONTE_RESULTADO[fonte] ?? "Lançado");
const ehResultado = (id: string) => INDICADORES_DE_RESULTADO.includes(id);
const FONTE_RESULTADO: Record<string, string> = {
  ranking_cbvela: "Ranking CBVela",
  manual: "Lançado",
  atleta: "Atleta",
};

/** Lançamentos do indicador, do mais novo para o mais antigo. Mostra só o que a API devolve ao papel. */
function HistoricoDialog({
  atletaId,
  ind,
  papel,
  aoFechar,
}: {
  atletaId: string;
  ind: Indicador;
  papel: string;
  aoFechar: () => void;
}) {
  const hist = useHistoricoIndicador(atletaId, ind.id);
  return (
    <Dialogo titulo={`Histórico: ${ind.nome}`} aoFechar={aoFechar}>
      {hist.isPending ? (
        <p className="muted" role="status">
          Carregando histórico…
        </p>
      ) : hist.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(hist.error)}
        </div>
      ) : hist.data.length === 0 ? (
        <p className="muted">Nenhum lançamento para este indicador.</p>
      ) : (
        <ol className="ficha-historico">
          {hist.data.map((l, i) => (
            <li key={`${l.lancadoEm}-${i}`} className={l.pendente ? "pendente" : undefined}>
              <div className="ficha-historico-topo">
                <span className="nota">{l.valor}</span>
                <span>
                  {fmtInstante(l.lancadoEm)}
                  {l.cicloNome ? ` · ${l.cicloNome}` : ""}
                  {l.pesoKg != null ? ` · ${fmt1(l.pesoKg)} kg` : ""}
                </span>
              </div>
              <div className="src">
                {[
                  l.origem === "calculado" && ehResultado(ind.id)
                    ? ORIGEM_RESULTADO
                    : ORIGEM_LANCAMENTO[l.origem],
                  l.avaliador?.nome,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {l.justificativa && <div className="src">Justificativa: {l.justificativa}</div>}
              {l.evidencia ? (
                <div className="src">Evidência: {l.evidencia}</div>
              ) : (
                papel !== "ibvar" &&
                !(l.origem === "calculado" && ehResultado(ind.id)) && (
                  <div className="src">{SEM_EVIDENCIA}</div>
                )
              )}
              {l.link && <VerVideo url={l.link} />}
              {l.anexo && (
                <AbrirEvidencia
                  id={l.anexo.id}
                  nomeArquivo={l.anexo.nomeArquivo}
                  className="ficha-clipe"
                >
                  <i className="ph ph-paperclip" aria-hidden="true" />
                  <span>{l.anexo.nomeArquivo}</span>
                </AbrirEvidencia>
              )}
            </li>
          ))}
        </ol>
      )}
    </Dialogo>
  );
}

function BotaoHistorico({
  atletaId,
  ind,
  papel,
}: {
  atletaId: string;
  ind: Indicador;
  papel: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ficha-clipe"
        aria-label={`Ver histórico de ${ind.nome}`}
        onClick={() => setAberto(true)}
      >
        Ver histórico
      </button>
      {aberto && (
        <HistoricoDialog
          atletaId={atletaId}
          ind={ind}
          papel={papel}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}

function LinhaIndicador({
  ind,
  atletaId,
  papel,
}: {
  ind: Indicador;
  atletaId: string;
  papel: string;
}) {
  const resp = ind.resposta ? ` · resposta: “${ind.resposta}”` : "";
  if (ind.tipo === "R") {
    return (
      <div className="ind">
        <div>
          {ind.nome}
          <div className="src">Registrado, não pontua (proposta P5){resp}</div>
        </div>
        <span className="nota na">—</span>
      </div>
    );
  }
  let origem: string;
  if (ind.calculado && ehResultado(ind.id)) {
    // Nota calculada pelos resultados validados: a API explica qual resultado vale.
    origem = [ind.explicacao, ORIGEM_RESULTADO].filter(Boolean).join(" · ");
  } else if (ind.nota == null) {
    origem = ind.tipo === "A" ? "Aguardando resposta do atleta" : "Ainda não avaliado neste ciclo";
  } else {
    const quem =
      ind.origem === "resposta_confirmada"
        ? `Resposta do atleta · nota de ${ind.avaliador?.nome ?? "avaliador"}`
        : ind.origem === "autoavaliacao_aprovada"
          ? `Autoavaliação aprovada por ${ind.avaliador?.nome ?? "avaliador"}`
          : ind.avaliador?.nome;
    origem =
      [
        ind.evidencia ?? (papel !== "ibvar" && !ind.calculado ? SEM_EVIDENCIA : null),
        quem,
        ind.lancadoEm ? fmtInstante(ind.lancadoEm) : null,
      ]
        .filter(Boolean)
        .join(" · ") + resp;
  }
  return (
    <div className="ind">
      <div>
        {ind.nome}
        <div className="src">{origem}</div>
        {ind.justificativa && <div className="src">Justificativa: {ind.justificativa}</div>}
        {ind.sugestaoPendente && (
          <div className="src">
            Sugestão do atleta: {ind.sugestaoPendente.valor}, aguardando avaliador
          </div>
        )}
        {ind.anexo && (
          <AbrirEvidencia
            id={ind.anexo.id}
            nomeArquivo={ind.anexo.nomeArquivo}
            className="ficha-clipe"
          >
            <i className="ph ph-paperclip" aria-hidden="true" />
            <span>{ind.anexo.nomeArquivo}</span>
          </AbrirEvidencia>
        )}
        {ind.link && (
          <div>
            <VerVideo url={ind.link} />
          </div>
        )}
        <div>
          <BotaoHistorico atletaId={atletaId} ind={ind} papel={papel} />
        </div>
      </div>
      <span className={`nota ${ind.nota == null ? "na" : ""}`}>
        {ind.nota == null ? "—" : ind.nota}
      </span>
    </div>
  );
}

function BlocoPilar({
  pilar,
  aberto,
  aoAlternar,
  maiorPerda,
  atletaId,
  papel,
}: {
  pilar: Pilar;
  aberto: boolean;
  aoAlternar: () => void;
  maiorPerda: boolean;
  atletaId: string;
  papel: string;
}) {
  const { nota } = pilar;
  const painel = `pilar-${pilar.id}`;
  return (
    <div className="pilar" data-open={aberto ? 1 : 0}>
      <button
        type="button"
        className="pilar-btn"
        onClick={aoAlternar}
        aria-expanded={aberto}
        aria-controls={painel}
      >
        <span className="nm">
          <span className="nm-t">{pilar.nome}</span>{" "}
          <small className="peso">{pilar.peso} pts</small>
          {(pilar.preenchidos < pilar.total || maiorPerda) && (
            <small className="nm-extra">
              {[
                pilar.preenchidos < pilar.total
                  ? `${pilar.preenchidos} de ${pilar.total} indicadores`
                  : null,
                maiorPerda ? "maior perda de pontos" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          )}
        </span>
        <span className={`meter ${nota != null && nota < 3 ? "low" : ""}`}>
          <span style={{ width: `${nota == null ? 0 : (nota / 5) * 100}%` }} />
        </span>
        <span className="contrib">
          {nota == null ? "sem nota" : `${fmt1(pilar.contribuicao)} de ${pilar.peso}`}
        </span>
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>
      {aberto &&
        (pilar.restrito || !pilar.indicadores ? (
          <div className="lock" id={painel}>
            <i className="ph ph-lock-simple" aria-hidden="true" /> Detalhe restrito:{" "}
            {pilar.id === "amb" ? "informação sobre a família" : "dado sensível"}. O IBVAR vê só a
            nota do pilar.
          </div>
        ) : (
          <div className="ind-list" id={painel}>
            {pilar.indicadores.map((i) => (
              <LinhaIndicador key={i.id} ind={i} atletaId={atletaId} papel={papel} />
            ))}
          </div>
        ))}
    </div>
  );
}

function LinhaGate({
  gate,
  editavel,
  aoAlterar,
  ocupado,
}: {
  gate: Gate;
  editavel: boolean;
  aoAlterar: (status: (typeof STATUS_GATE)[number]) => void;
  ocupado: boolean;
}) {
  return (
    <div className="gate">
      <span className="gid">G{gate.gate}</span>
      <div>
        <div>{gate.nome}</div>
        <div className="why">
          {gate.motivo}
          {gate.ajustadoPeloGestor ? " · ajustado pelo gestor" : ""}
        </div>
      </div>
      {editavel ? (
        <select
          aria-label={`Status do gate G${gate.gate}`}
          value={gate.status}
          disabled={ocupado}
          onChange={(e) => aoAlterar(e.target.value as (typeof STATUS_GATE)[number])}
        >
          {STATUS_GATE.map((s) => (
            <option key={s} value={s}>
              {textoDoStatus(s)}
            </option>
          ))}
        </select>
      ) : (
        <StatusPill status={gate.status} />
      )}
    </div>
  );
}

function SeloNivelFin({ selo }: { selo: ReturnType<typeof seloAutonomia> }) {
  return <span className={`pill ${selo.classe}`}>{selo.rotulo}</span>;
}

function BlocoFinanceiro({ fin }: { fin: FichaAtleta["financeiro"] }) {
  if (!fin)
    return <div className="lock">Financeiro da campanha: visível só para o atleta e o gestor.</div>;
  const completo = "componentes" in fin;
  const meses = "mesesAssegurados" in fin ? fin.mesesAssegurados : null;
  const patrocinio =
    "patrocinioPrivado" in fin && fin.patrocinioPrivado ? PATROCINIO[fin.patrocinioPrivado] : "—";
  return (
    <>
      <dl className="kv kv-fin">
        <dt>Perfil de suporte</dt>
        <dd>
          <b>{SUPORTE[fin.perfilSuporte]}</b>
        </dd>
        <dt>Orçamento assegurado</dt>
        <dd>{meses == null ? "—" : meses > 0 ? `${meses} meses` : "Nenhum"}</dd>
        {completo && (
          <>
            <dt>Patrocínio privado</dt>
            <dd>{patrocinio}</dd>
          </>
        )}
      </dl>
      {completo ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de componentes do financeiro da campanha, role para ver todas as colunas"
          style={{ marginTop: 12 }}
        >
          <table className="data tabela-fin">
            <thead>
              <tr>
                <th>Componente</th>
                <th>Autonomia</th>
                <th>Apoio CBVela</th>
              </tr>
            </thead>
            <tbody>
              {fin.componentes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>
                    <SeloNivelFin selo={seloAutonomia(c.autonomia)} />
                  </td>
                  <td>
                    <SeloNivelFin selo={seloApoio(c.apoioCbvela)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lock" style={{ marginTop: 10 }}>
          Componentes de custo restritos ao atleta e ao gestor.
        </div>
      )}
    </>
  );
}

const SITUACAO_ALTURA = {
  dentro: { texto: "dentro da faixa", status: "apto" },
  abaixo: { texto: "abaixo da faixa", status: "condicional" },
  acima: { texto: "acima da faixa", status: "condicional" },
} as const;

/** Altura contra a faixa da classe; a situação vem pronta da API. Só informativa. */
function MedidorAltura({
  altura,
  classe,
}: {
  altura: NonNullable<FichaAtleta["classFit"]>["altura"];
  classe: string;
}) {
  const { cm, minCm, mediaCm, maxCm, situacao } = altura;
  let corpo;
  if (cm == null) {
    corpo = <p className="medidor-texto">Altura não registrada</p>;
  } else if (minCm == null || mediaCm == null || maxCm == null) {
    corpo = (
      <>
        <p className="medidor-texto">{cm} cm</p>
        <p className="panel-dica">
          Faixa de altura da classe não definida (parâmetro da metodologia).
        </p>
      </>
    );
  } else {
    const s = situacao ? SITUACAO_ALTURA[situacao] : null;
    corpo = (
      <GaugeClassFit
        grandeza="Altura"
        unidade="cm"
        casas={0}
        valor={cm}
        min={minCm}
        media={mediaCm}
        max={maxCm}
        margem={10}
        classe={classe}
        status={s?.status ?? "condicional"}
        {...(s ? { situacao: s.texto } : {})}
      />
    );
  }
  return (
    <div className="medidor">
      <p className="medidor-rotulo">Altura</p>
      {corpo}
    </div>
  );
}

function Conteudo({ ficha, papel }: { ficha: FichaAtleta; papel: string }) {
  const queryClient = useQueryClient();
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [pedindoRevisao, setPedindoRevisao] = useState(false);
  const [pedindoAjuste, setPedindoAjuste] = useState(false);
  const [lancandoResultado, setLancandoResultado] = useState(false);
  const [editandoFinanceiro, setEditandoFinanceiro] = useState(false);
  const { atleta, pilares, gates, classFit, resultados } = ficha;

  const alterarGate = useMutation({
    mutationFn: (v: { gate: number; status: (typeof STATUS_GATE)[number] }) =>
      atualizarGate(atleta.id, { gate: v.gate as 1 | 2 | 3 | 4, status: v.status }),
    onSuccess: async (novos, v) => {
      queryClient.setQueryData<FichaAtleta>(["atleta", atleta.id], (antigo) =>
        antigo ? { ...antigo, gates: novos } : antigo,
      );
      toast(`G${v.gate} atualizado pelo gestor`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["atleta", atleta.id] }),
        queryClient.invalidateQueries({ queryKey: ["ranking"] }),
        queryClient.invalidateQueries({ queryKey: ["investimento"] }),
      ]);
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const comNota = pilares.filter((p) => p.nota != null);
  const maiorPerda = comNota.reduce<Pilar | null>(
    (m, p) => (m === null || p.peso - p.contribuicao > m.peso - m.contribuicao ? p : m),
    null,
  );
  const g1 = gates.itens.find((g) => g.gate === 1);
  const podeLancar = papel === "gestor" || papel === "treinador";
  const indicadoresEvidencia = pilares.flatMap((p) =>
    (p.indicadores ?? []).filter((i) => i.tipo !== "R").map((i) => ({ id: i.id, nome: i.nome })),
  );

  // Média da turma por ciclo fechado (D13): o ponto do ciclo atual não tem média, e `null` (grupo
  // pequeno para o IBVAR) não desenha ponto.
  const mediaDoCiclo = new Map(ficha.mediaTurmaPorCiclo.map((m) => [m.ciclo, m.media]));
  const pontos = [
    ...ficha.historicoScore.map((h) => ({
      rotulo: rotuloCiclo(h.ciclo),
      score: h.score,
      mediaTurma: mediaDoCiclo.get(h.ciclo) ?? null,
    })),
    { rotulo: rotuloCiclo(ficha.ciclo?.nome ?? "Atual"), score: ficha.score, mediaTurma: null },
  ];

  return (
    <div className="stack ficha">
      {papel !== "atleta" && (
        <div>
          <Link to="/ranking" className="link-voltar">
            <i className="ph ph-arrow-left" aria-hidden="true" />
            {papel === "treinador" ? "Meus atletas" : "Ranking"}
          </Link>
        </div>
      )}
      <div className="athlete-head">
        <CartaoPerfil ficha={ficha} />
        <BigScore score={ficha.score} faixa={ficha.faixa} parcial={!ficha.completo}>
          <SparkScore pontos={pontos} />
        </BigScore>
      </div>
      {!atleta.termoAceito && (
        <p className="note" role="status">
          Aguardando aceite do termo: o atleta ainda não entra no ranking.
        </p>
      )}
      <ComparacaoTurma ficha={ficha} />
      <div className="ficha-grid">
        {/* Duas colunas reais no DOM: a esquerda inteira, depois a direita. No celular, essa
            sequência é a ordem de leitura e de foco (pilares, gates, histórico, Class Fit,
            financeiro, plano, evidências); no desktop, as colunas ficam lado a lado. */}
        <div className="ficha-col ficha-col-a">
          <section className="panel ordem-pilares">
            <div className="panel-head">
              <h2>Os 9 pilares</h2>
              {papel === "atleta" && (
                <button type="button" className="btn sm" onClick={() => setPedindoRevisao(true)}>
                  Pedir revisão de uma nota
                </button>
              )}
              {podeLancar && (
                <button type="button" className="btn sm" onClick={() => setPedindoAjuste(true)}>
                  Pedir ajuste
                </button>
              )}
              {podeLancar && (
                <Link to="/avaliar" search={{ atleta: atleta.id }} className="btn sm primary">
                  Lançar avaliação
                </Link>
              )}
            </div>
            <p className="panel-dica">
              Toque num pilar para ver por que a nota é essa.
              {papel === "atleta" ? " Pedir revisão é um direito previsto na LGPD (art. 20)." : ""}
            </p>
            {pilares.map((p) => (
              <BlocoPilar
                key={p.id}
                pilar={p}
                aberto={!!abertos[p.id]}
                aoAlternar={() => setAbertos((a) => ({ ...a, [p.id]: !a[p.id] }))}
                maiorPerda={maiorPerda?.id === p.id}
                atletaId={ficha.atleta.id}
                papel={papel}
              />
            ))}
          </section>
          <section className="panel ordem-gates">
            <div className="panel-head">
              <h2>Gates aos 18</h2>
              <StatusPill status={gates.statusFinal} ponto />
            </div>
            {gates.itens.map((g) => (
              <LinhaGate
                key={g.gate}
                gate={g}
                editavel={papel === "gestor"}
                ocupado={alterarGate.isPending}
                aoAlterar={(status) => alterarGate.mutate({ gate: g.gate, status })}
              />
            ))}
            <p className="panel-dica">
              Sugestão automática por regra provisória (P7).{" "}
              {papel === "gestor"
                ? "O gestor confirma ou ajusta cada gate."
                : "Quem decide é o gestor."}
            </p>
          </section>
          <section className="panel ordem-historico">
            <div className="panel-head">
              <h2>Histórico competitivo</h2>
              {podeLancar && (
                <button type="button" className="btn sm" onClick={() => setLancandoResultado(true)}>
                  Lançar resultado internacional
                </button>
              )}
            </div>
            <p className="pts-total">
              <b>{fmt0(ficha.pontosCbvela)}</b> pts no Ranking CBVela
            </p>
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
                    {papel !== "ibvar" && <th>Situação</th>}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => {
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
                        <td className="r num">
                          {r.pontosCbvela == null ? "—" : fmt0(r.pontosCbvela)}
                        </td>
                        <td className="nw">
                          {r.fonte === "ranking_cbvela" ? (
                            <span className="pill st-info">Ranking CBVela</span>
                          ) : link ? (
                            <a
                              className="pill st-neutro"
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
                        {papel !== "ibvar" && (
                          <td>
                            <span className={`pill ${ROTULO_STATUS_RESULTADO[r.status].classe}`}>
                              {ROTULO_STATUS_RESULTADO[r.status].rotulo}
                            </span>
                            {r.validadoPor && r.validadoEm && (
                              <small className="sub">
                                por {r.validadoPor.nome} em {fmtInstante(r.validadoEm)}
                              </small>
                            )}
                            {r.status === "recusado" && r.motivo && (
                              <small className="sub">Motivo: {r.motivo}</small>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="panel-dica">
              Os pontos do Ranking CBVela são só informação e não entram na nota. A nota dos
              indicadores de resultado sai dos resultados validados.
            </p>
          </section>
          {podeLancar && <ResultadosParaValidar atletaId={atleta.id} />}
          {podeLancar && <ConquistasParaValidar atletaId={atleta.id} />}
          {papel !== "ibvar" && (
            <ComparacaoAutoavaliacao
              atletaId={atleta.id}
              pilares={pilares.map((p) => ({ id: p.id, nomeCurto: p.nomeCurto }))}
            />
          )}
        </div>
        <div className="ficha-col ficha-col-b">
          <section className="panel ordem-classfit">
            <div className="panel-head">
              <h2>Class Fit</h2>
              <span className="muted panel-info">{atleta.classe.nome}</span>
            </div>
            {classFit ? (
              <>
                <div className="medidor">
                  <p className="medidor-rotulo">Peso</p>
                  <GaugeClassFit
                    grandeza="Peso"
                    unidade="kg"
                    casas={1}
                    valor={classFit.pesoKg}
                    min={classFit.pesoMinKg}
                    media={classFit.pesoMedioKg}
                    max={classFit.pesoMaxKg}
                    classe={atleta.classe.nome}
                    status={g1?.sugestaoAutomatica ?? "condicional"}
                  />
                </div>
                <MedidorAltura altura={classFit.altura} classe={atleta.classe.nome} />
                <p className="panel-dica">
                  Faixa de peso de referência da classe (parâmetro da metodologia).
                </p>
                <p className="panel-dica">
                  A altura é informativa: não entra no score nem nos gates.
                </p>
              </>
            ) : (
              <div className="lock">
                Peso e medidas são dado sensível. O IBVAR vê só o resultado do gate G1.
              </div>
            )}
          </section>
          {podeLancar && <PesagensPendentes atletaId={atleta.id} />}
          {ficha.contato && (
            <BlocoContato atletaId={atleta.id} contato={ficha.contato} papel={papel} />
          )}
          <section className="panel ordem-financeiro">
            <div className="panel-head">
              <h2>Sustentabilidade da campanha</h2>
              {papel === "gestor" && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setEditandoFinanceiro(true)}
                >
                  Atualizar financeiro
                </button>
              )}
            </div>
            <BlocoFinanceiro fin={ficha.financeiro} />
          </section>
          <PlanoIndividual ficha={ficha} papel={papel} className="ordem-plano" />
          {papel !== "ibvar" && (
            <EvidenciasSecao
              atletaId={atleta.id}
              papel={papel}
              indicadores={indicadoresEvidencia}
              className="ordem-evidencias"
            />
          )}
        </div>
      </div>
      {lancandoResultado && (
        <ResultadoDialog atletaId={atleta.id} aoFechar={() => setLancandoResultado(false)} />
      )}
      {editandoFinanceiro && (
        <FinanceiroDialog
          atletaId={atleta.id}
          atual={ficha.financeiro}
          aoFechar={() => setEditandoFinanceiro(false)}
        />
      )}
      {pedindoAjuste && (
        <PedirAjusteDialog
          atletaId={atleta.id}
          atletaNome={atleta.nome}
          aoFechar={() => setPedindoAjuste(false)}
          pilares={pilares.map((p) => ({
            id: p.id,
            nome: p.nome,
            indicadores: (p.indicadores ?? []).map((i) => ({ id: i.id, nome: i.nome })),
          }))}
        />
      )}
      {pedindoRevisao && (
        <PedirRevisaoDialog
          aoFechar={() => setPedindoRevisao(false)}
          pilares={pilares.map((p) => ({
            id: p.id,
            nome: p.nome,
            indicadores: (p.indicadores ?? []).map((i) => ({ id: i.id, nome: i.nome })),
          }))}
        />
      )}
    </div>
  );
}

/** Ficha individual do atleta. Tudo o que aparece vem da API (que já aplica a matriz de acesso). */
export function TelaFicha({ id, papel }: { id: string; papel: string }) {
  const { data, error, isPending } = useFicha(id);
  if (isPending) {
    return (
      <p role="status" className="muted">
        Carregando ficha…
      </p>
    );
  }
  if (error) {
    if (error instanceof ErroApi && (error.status === 404 || error.status === 403)) {
      return <SemAcesso mensagem={TEXTO_NAO_VE} />;
    }
    return (
      <div className="panel empty-state" role="alert">
        {mensagemDeErro(error)}
      </div>
    );
  }
  return <Conteudo ficha={data} papel={papel} />;
}
