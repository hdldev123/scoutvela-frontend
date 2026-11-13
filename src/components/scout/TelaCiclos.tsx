import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import {
  useAbrirCiclo,
  useAjustarPrazo,
  useCiclos,
  useFecharCiclo,
  usePendenciasCiclo,
  type Ciclo,
  type PendenciasCiclo,
} from "@/lib/api/ciclos";
import { mensagemDeErro } from "@/lib/api/cliente";
import "@/styles/ciclos.css";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const dois = (n: number) => String(n).padStart(2, "0");
const isoLocal = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

/** Sugestão do formulário: "Mês de AAAA", início hoje, prazo no último dia do mês. */
export function sugestaoCiclo(hoje = new Date()) {
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    nome: `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`,
    inicio: isoLocal(hoje),
    prazo: isoLocal(ultimo),
  };
}

/** Dias de calendário de hoje até o prazo (negativo = atrasado). */
export function diasAtePrazo(prazo: string, hoje = new Date()): number {
  const [a = 0, m = 1, d = 1] = prazo.split("-").map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86400000);
}

function textoPrazo(dias: number): string {
  if (dias < 0) return `atrasado há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  return `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** Ciclos de avaliação: abrir, ajustar prazo e fechar (gestor). */
export function TelaCiclos() {
  const ciclos = useCiclos();
  const aberto = ciclos.data?.find((c) => c.status === "aberto");
  const [congelados, setCongelados] = useState<{ nome: string; atletas: number } | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gestor CBVela</div>
          <h1>Ciclos de avaliação</h1>
          <p>
            Rodada mensal com prazo. Ao fechar, o score e a faixa de cada atleta ficam congelados no
            histórico.
          </p>
        </div>
      </div>
      <div className="stack">
        {congelados && (
          <div className="note" role="status">
            Ciclo {congelados.nome} fechado: {congelados.atletas}{" "}
            {congelados.atletas === 1
              ? "atleta teve o score congelado"
              : "atletas tiveram o score congelado"}
            .
          </div>
        )}
        {ciclos.isPending ? (
          <p className="muted" role="status">
            Carregando ciclos…
          </p>
        ) : ciclos.isError ? (
          <div className="note" role="alert">
            {mensagemDeErro(ciclos.error)}
          </div>
        ) : (
          <>
            {aberto && (
              <CicloAberto
                ciclo={aberto}
                aoFechar={(r) => setCongelados({ nome: r.nome, atletas: r.atletas })}
              />
            )}
            {aberto && <PendenciasDoCiclo cicloId={aberto.id} />}
            <AbrirCiclo bloqueado={!!aberto} />
            <TabelaCiclos itens={ciclos.data} />
          </>
        )}
      </div>
    </>
  );
}

function CicloAberto({
  ciclo,
  aoFechar,
}: {
  ciclo: Ciclo;
  aoFechar: (r: { nome: string; atletas: number }) => void;
}) {
  const ajustar = useAjustarPrazo();
  const fechar = useFecharCiclo();
  const [editando, setEditando] = useState(false);
  const [prazo, setPrazo] = useState(ciclo.prazo);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const dias = diasAtePrazo(ciclo.prazo);

  const salvarPrazo = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    ajustar.mutate(
      { id: ciclo.id, prazo },
      {
        onSuccess: () => {
          setEditando(false);
          toast.success("Prazo ajustado.");
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  const confirmarFechamento = () => {
    setErro("");
    fechar.mutate(ciclo.id, {
      onSuccess: (r) => {
        setConfirmando(false);
        aoFechar({ nome: r.ciclo.nome, atletas: r.atletas });
        toast.success("Ciclo fechado.");
      },
      onError: (err) => setErro(mensagemDeErro(err)),
    });
  };

  return (
    <section className="panel cic-aberto" aria-labelledby="cic-aberto-t">
      <div className="panel-head">
        <h2 id="cic-aberto-t">Ciclo aberto: {ciclo.nome}</h2>
        <span className={`pill ${dias < 0 ? "st-alerta" : "st-apto"}`}>{textoPrazo(dias)}</span>
      </div>
      <p>
        Início em {fmtData(ciclo.inicio)}. Prazo em {fmtData(ciclo.prazo)}.
      </p>
      {erro && !confirmando && (
        <div className="note" role="alert">
          {erro}
        </div>
      )}
      {editando ? (
        <form className="cic-form" onSubmit={salvarPrazo}>
          <label className="field" htmlFor="cic-novo-prazo">
            Novo prazo
            <input
              id="cic-novo-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              required
            />
          </label>
          <div className="btn-row">
            <button type="submit" className="btn primary" disabled={ajustar.isPending}>
              {ajustar.isPending ? "Salvando…" : "Salvar prazo"}
            </button>
            <button type="button" className="btn" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setErro("");
              setPrazo(ciclo.prazo);
              setEditando(true);
            }}
          >
            Ajustar prazo
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setErro("");
              setConfirmando(true);
            }}
          >
            Fechar ciclo
          </button>
        </div>
      )}
      {confirmando && (
        <Dialogo titulo="Fechar ciclo" aoFechar={() => setConfirmando(false)}>
          <div className="stack" style={{ gap: 12 }}>
            <p>
              Ao fechar {ciclo.nome}, o score e a faixa de todos os atletas com termo aceito serão
              congelados no histórico. Isso não se desfaz.
            </p>
            {erro && (
              <div className="note" role="alert">
                {erro}
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn primary"
                onClick={confirmarFechamento}
                disabled={fechar.isPending}
              >
                {fechar.isPending ? "Fechando…" : "Confirmar fechamento"}
              </button>
              <button type="button" className="btn" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </section>
  );
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Quem está atrasado no ciclo aberto, pela mesma regra dos lembretes (a API decide). */
function PendenciasDoCiclo({ cicloId }: { cicloId: string }) {
  const pend = usePendenciasCiclo(cicloId);
  return (
    <section className="panel" aria-labelledby="cic-pend-t">
      <div className="panel-head">
        <h2 id="cic-pend-t">Pendências</h2>
        <span className="muted cic-sub">Atletas ativos com termo aceito</span>
      </div>
      {pend.isPending ? (
        <p className="muted" role="status">
          Carregando pendências…
        </p>
      ) : pend.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(pend.error)}
        </div>
      ) : (
        <ListaPendencias p={pend.data} />
      )}
    </section>
  );
}

function ListaPendencias({ p }: { p: PendenciasCiclo }) {
  const { totais } = p;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <dl className="cic-totais">
        <div>
          <dt>Treinadores com pendência</dt>
          <dd>{totais.treinadoresComPendencia}</dd>
        </div>
        <div>
          <dt>Atletas com questionário pendente</dt>
          <dd>{totais.atletasComPendencia}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd>{textoPrazo(totais.diasParaPrazo)}</dd>
        </div>
      </dl>

      <div>
        <h3 className="cic-pend-titulo">Avaliações dos treinadores</h3>
        {p.treinadores.length === 0 ? (
          <p className="muted">Nenhum treinador com avaliação pendente.</p>
        ) : (
          <ul className="cic-pend-lista">
            {p.treinadores.map((t) => (
              <li key={t.id}>
                <b>{t.nome}</b>{" "}
                <span className="muted">
                  · {plural(t.atletasPendentes.length, "atleta pendente", "atletas pendentes")}
                </span>
                <ul>
                  {t.atletasPendentes.map((a) => (
                    <li key={a.id}>
                      <Link to="/atletas/$id" params={{ id: a.id }}>
                        {a.nome}
                      </Link>{" "}
                      <span className="muted">
                        · faltam {plural(a.faltam, "indicador", "indicadores")}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="cic-pend-titulo">Questionário dos atletas</h3>
        {p.atletas.length === 0 ? (
          <p className="muted">Nenhum atleta com questionário pendente.</p>
        ) : (
          <ul className="cic-pend-lista">
            {p.atletas.map((a) => (
              <li key={a.id}>
                <Link to="/atletas/$id" params={{ id: a.id }}>
                  {a.nome}
                </Link>{" "}
                <span className="muted">
                  ·{" "}
                  {plural(
                    a.perguntasSemResposta,
                    "pergunta sem resposta",
                    "perguntas sem resposta",
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AbrirCiclo({ bloqueado }: { bloqueado: boolean }) {
  const abrir = useAbrirCiclo();
  const [sug] = useState(() => sugestaoCiclo());
  const [nome, setNome] = useState(sug.nome);
  const [inicio, setInicio] = useState(sug.inicio);
  const [prazo, setPrazo] = useState(sug.prazo);
  const [erro, setErro] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    abrir.mutate(
      { nome: nome.trim(), inicio, prazo },
      {
        onSuccess: (c) => toast.success(`Ciclo ${c.nome} aberto.`),
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="cic-abrir-t">
      <div className="panel-head">
        <h2 id="cic-abrir-t">Abrir ciclo</h2>
        <span className="muted cic-sub">Só um ciclo fica aberto por vez</span>
      </div>
      {bloqueado && <p className="muted">Feche o ciclo aberto para abrir o próximo.</p>}
      <form className="cic-form" onSubmit={enviar}>
        <fieldset className="cic-campos" disabled={bloqueado || abrir.isPending}>
          <legend className="cic-sr">Dados do novo ciclo</legend>
          <label className="field" htmlFor="cic-nome">
            Nome
            <input
              id="cic-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="field" htmlFor="cic-inicio">
            Início
            <input
              id="cic-inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </label>
          <label className="field" htmlFor="cic-prazo">
            Prazo
            <input
              id="cic-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn primary">
            {abrir.isPending ? "Abrindo…" : "Abrir ciclo"}
          </button>
        </fieldset>
      </form>
      {erro && (
        <div className="note" role="alert">
          {erro}
        </div>
      )}
    </section>
  );
}

function TabelaCiclos({ itens }: { itens: Ciclo[] }) {
  return (
    <section className="panel" aria-labelledby="cic-hist-t">
      <div className="panel-head">
        <h2 id="cic-hist-t">Histórico de ciclos</h2>
      </div>
      {itens.length === 0 ? (
        <p className="muted">Nenhum ciclo cadastrado.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Início</th>
                <th>Prazo</th>
                <th>Status</th>
                <th className="r">Atletas com score congelado</th>
                <th>Fechado em</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{fmtData(c.inicio)}</td>
                  <td>{fmtData(c.prazo)}</td>
                  <td>
                    <span className={`pill ${c.status === "aberto" ? "st-apto" : "st-lock"}`}>
                      {c.status === "aberto" ? "Aberto" : "Fechado"}
                    </span>
                  </td>
                  <td className="r">{c.status === "aberto" ? "—" : c.atletasComScore}</td>
                  <td>{c.fechadoEm ? fmtData(c.fechadoEm) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
