import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BigScore } from "./BigScore";
import { FaixaPill } from "./FaixaPill";
import { GaugeClassFit } from "./GaugeClassFit";
import { PedirRevisaoDialog } from "./PedirRevisaoDialog";
import { SemAcesso } from "./SemAcesso";
import { SparkScore } from "./SparkScore";
import { StatusPill, textoDoStatus } from "./StatusPill";
import { fmt0, fmt1, fmtData, rotuloCiclo } from "./formato";
import { ErroApi, mensagemDeErro } from "@/lib/api/cliente";
import { useFicha, type FichaAtleta } from "@/lib/api/consultas";
import { atualizarGate } from "@/lib/api/mutacoes-ficha";

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
const TEXTO_NAO_VE =
  "Este perfil não vê a ficha deste atleta. Treinador vê só os próprios atletas; o IBVAR vê só quem consentiu.";

/** Aceita só links http(s) do resultado oficial. */
const linkSeguro = (url: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

function LinhaIndicador({ ind }: { ind: Indicador }) {
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
  if (ind.nota == null) {
    origem = ind.tipo === "A" ? "Aguardando resposta do atleta" : "Ainda não avaliado neste ciclo";
  } else {
    const quem =
      ind.origem === "resposta_confirmada"
        ? `Resposta do atleta · nota de ${ind.avaliador?.nome ?? "avaliador"}`
        : ind.avaliador?.nome;
    origem =
      [ind.evidencia, quem, ind.lancadoEm ? fmtData(ind.lancadoEm) : null]
        .filter(Boolean)
        .join(" · ") + resp;
  }
  return (
    <div className="ind">
      <div>
        {ind.nome}
        <div className="src">{origem}</div>
        {ind.sugestaoPendente && (
          <div className="src">
            Sugestão do atleta: {ind.sugestaoPendente.valor}, aguardando avaliador
          </div>
        )}
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
}: {
  pilar: Pilar;
  aberto: boolean;
  aoAlternar: () => void;
  maiorPerda: boolean;
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
          {pilar.nome}
          <small>
            {pilar.peso} pts
            {pilar.preenchidos < pilar.total
              ? ` · ${pilar.preenchidos} de ${pilar.total} indicadores`
              : ""}
            {maiorPerda ? " · maior perda de pontos" : ""}
          </small>
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
              <LinhaIndicador key={i.id} ind={i} />
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

function BlocoFinanceiro({ fin }: { fin: FichaAtleta["financeiro"] }) {
  if (!fin)
    return <div className="lock">Financeiro da campanha: visível só para o atleta e o gestor.</div>;
  const completo = "componentes" in fin;
  const meses = "mesesAssegurados" in fin ? fin.mesesAssegurados : null;
  const patrocinio =
    "patrocinioPrivado" in fin && fin.patrocinioPrivado ? PATROCINIO[fin.patrocinioPrivado] : "—";
  return (
    <>
      <dl className="kv">
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
        <div className="table-scroll" style={{ marginTop: 12 }}>
          <table className="data">
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
                  <td>{c.autonomia}</td>
                  <td>{c.apoioCbvela}</td>
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

function Conteudo({ ficha, papel }: { ficha: FichaAtleta; papel: string }) {
  const queryClient = useQueryClient();
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [pedindoRevisao, setPedindoRevisao] = useState(false);
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
  const ordenados = [...comNota].sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));
  const forcas = ordenados
    .slice(0, 2)
    .map((p) => p.nomeCurto)
    .join(" e ");
  const lacunas = ordenados
    .slice(-2)
    .map((p) => p.nomeCurto)
    .join(" e ");
  const temMundial = resultados.some((r) => r.nivel === "Mundial");
  const perfil = ficha.financeiro?.perfilSuporte;
  const g1 = gates.itens.find((g) => g.gate === 1);

  const pontos = [
    ...ficha.historicoScore.map((h) => ({ rotulo: rotuloCiclo(h.ciclo), score: h.score })),
    { rotulo: rotuloCiclo(ficha.ciclo?.nome ?? "Atual"), score: ficha.score },
  ];

  return (
    <div className="stack">
      {papel !== "atleta" && (
        <div>
          <Link to="/ranking" className="muted">
            ← {papel === "treinador" ? "Meus atletas" : "Ranking"}
          </Link>
        </div>
      )}
      <div className="athlete-head">
        <div>
          <div className="eyebrow">
            Ficha individual{ficha.ciclo ? ` · ciclo de ${ficha.ciclo.nome}` : ""}
          </div>
          <h1>{atleta.nome}</h1>
          <div className="facts">
            {atleta.numeroVela && <span className="sail">{atleta.numeroVela}</span>}
            <span>
              <code>{atleta.velaid}</code> VelaID
            </span>
            <span>
              {atleta.classe.nome} · {atleta.funcao}
            </span>
            <span>{atleta.idade} anos</span>
            <span>
              {[
                atleta.clube,
                atleta.cidade && atleta.uf
                  ? `${atleta.cidade}/${atleta.uf}`
                  : (atleta.cidade ?? atleta.uf),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {ficha.contato?.treinador && <span>Treinador(a): {ficha.contato.treinador.nome}</span>}
          </div>
        </div>
        <BigScore score={ficha.score} faixa={ficha.faixa} parcial={!ficha.completo}>
          <SparkScore pontos={pontos} />
        </BigScore>
      </div>
      {!atleta.termoAceito && (
        <p className="note" role="status">
          Aguardando aceite do termo: o atleta ainda não entra no ranking.
        </p>
      )}
      <div className="grid-2">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Os 9 pilares</h2>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Toque num pilar para ver por que a nota é essa
              </span>
            </div>
            {pilares.map((p) => (
              <BlocoPilar
                key={p.id}
                pilar={p}
                aberto={!!abertos[p.id]}
                aoAlternar={() => setAbertos((a) => ({ ...a, [p.id]: !a[p.id] }))}
                maiorPerda={maiorPerda?.id === p.id}
              />
            ))}
            {papel === "atleta" && (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => setPedindoRevisao(true)}>
                  Pedir revisão de uma nota
                </button>
                <span className="muted" style={{ fontSize: "0.82rem" }}>
                  Direito previsto na LGPD (art. 20)
                </span>
              </div>
            )}
            {(papel === "gestor" || papel === "treinador") && (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link to="/avaliar" search={{ atleta: atleta.id }} className="btn primary">
                  Lançar avaliação
                </Link>
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Histórico competitivo</h2>
              <span className="num">
                <b>{fmt0(ficha.pontosCbvela)}</b>{" "}
                <span className="muted">pts no Ranking CBVela</span>
              </span>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th className="r">Posição</th>
                    <th className="r">Pts CBVela</th>
                    <th>Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, i) => {
                    const link = linkSeguro(r.linkOficial);
                    return (
                      <tr key={`${r.data}-${r.evento}-${i}`}>
                        <td className="num">{fmtData(r.data)}</td>
                        <td>{r.evento}</td>
                        <td className="r">
                          {r.posicao}º de {r.tamanhoFrota}
                        </td>
                        <td className="r">{r.pontosCbvela == null ? "—" : fmt0(r.pontosCbvela)}</td>
                        <td>
                          {r.fonte === "ranking_cbvela" ? (
                            <span className="src-tag">Ranking CBVela</span>
                          ) : link ? (
                            <a
                              className="src-tag man"
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Lançado + link oficial
                            </a>
                          ) : (
                            <span className="src-tag man">Lançado + link oficial</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", margin: "10px 0 0" }}>
              Resultados nacionais chegam do Ranking CBVela pelo código VelaID. Internacionais são
              lançados com o link do resultado oficial.
            </p>
          </section>
        </div>
        <div className="stack">
          <section className="panel">
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
            <p className="muted" style={{ fontSize: "0.8rem", margin: "8px 0 0" }}>
              Sugestão automática por regra provisória (P7).{" "}
              {papel === "gestor"
                ? "O gestor confirma ou ajusta cada gate."
                : "Quem decide é o gestor."}
            </p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Class Fit</h2>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                {atleta.classe.nome}
              </span>
            </div>
            {classFit ? (
              <>
                <GaugeClassFit
                  pesoKg={classFit.pesoKg}
                  pesoMinKg={classFit.pesoMinKg}
                  pesoMedioKg={classFit.pesoMedioKg}
                  pesoMaxKg={classFit.pesoMaxKg}
                  classe={atleta.classe.nome}
                  status={g1?.sugestaoAutomatica ?? "condicional"}
                />
                <p className="muted" style={{ fontSize: "0.82rem", margin: "6px 0 0" }}>
                  Faixa de peso da classe pelo Word do Juan.
                  {classFit.alturaCm != null ? ` Altura: ${classFit.alturaCm} cm.` : ""}
                </p>
              </>
            ) : (
              <div className="lock">
                Peso e medidas são dado sensível. O IBVAR vê só o resultado do gate G1.
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Sustentabilidade da campanha</h2>
            </div>
            <BlocoFinanceiro fin={ficha.financeiro} />
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Plano individual</h2>
            </div>
            <dl className="kv">
              <dt>Forças</dt>
              <dd>{forcas || "Aguardando a primeira avaliação"}</dd>
              <dt>Lacunas</dt>
              <dd>{lacunas || "—"}</dd>
              <dt>Meta 12 meses</dt>
              <dd>
                {temMundial ? "Top 10 no Mundial da classe" : "Primeiro Mundial da classe, top 50%"}
              </dd>
              <dt>Meta 24 meses</dt>
              <dd>
                {gates.statusFinal === "apto"
                  ? "Campanha completa no circuito internacional"
                  : "Fechar os gates em aberto"}
              </dd>
              <dt>Recomendação</dt>
              <dd>
                <FaixaPill faixa={ficha.faixa} />
                {perfil === "C" || perfil === "D" ? ", com apoio para viagens e equipamento" : ""}
              </dd>
            </dl>
          </section>
        </div>
      </div>
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
