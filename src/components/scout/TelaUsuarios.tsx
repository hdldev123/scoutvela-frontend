import { useEffect, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtData } from "./formato";
import { useTreinadores } from "@/lib/api/cadastro";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import {
  useAlterarAtivo,
  useAtletasGestao,
  useCriarUsuario,
  useEditarAtleta,
  useReenviarConvite,
  useUsuarios,
  type AtletaGestao,
  type CorpoAtleta,
  type FiltrosAtletas,
  type PapelUsuario,
  type Usuario,
} from "@/lib/api/usuarios";
import { useMe } from "@/lib/auth/sessao";
import "@/styles/contas.css";

const PAPEIS: Record<string, string> = {
  gestor: "Gestor CBVela",
  treinador: "Treinador",
  ibvar: "IBVAR",
  atleta: "Atleta",
  responsavel: "Responsável",
};
const PAPEIS_NOVOS: PapelUsuario[] = ["gestor", "treinador", "ibvar", "atleta"];

/** Contas de acesso e atletas do piloto (gestor). A API decide o que cada papel pode fazer. */
export function TelaUsuarios() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Acesso</div>
          <h1>Contas de acesso</h1>
          <p>
            As contas são criadas pela CBVela: cada pessoa recebe um convite por e-mail para definir
            a própria senha.
          </p>
        </div>
      </div>
      <div className="stack">
        <NovaConta />
        <ListaContas />
        <AtletasDoPiloto />
      </div>
    </>
  );
}

function NovaConta() {
  const idNome = useId();
  const idEmail = useId();
  const idPapel = useId();
  const idAtleta = useId();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<PapelUsuario>("treinador");
  const [atletaId, setAtletaId] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState("");
  const criar = useCriarUsuario();
  // Atletas ativos ainda sem conta, inclusive quem não aceitou o termo (a conta é que permite aceitar).
  const atletas = useAtletasGestao({ ativo: "true" });
  const semConta = (atletas.data ?? []).filter((a) => !a.contaVinculada);

  const ehAtleta = papel === "atleta";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setResultado("");
    criar.mutate(
      {
        nome: nome.trim(),
        email: email.trim(),
        papel,
        ...(ehAtleta ? { atletaId } : {}),
      },
      {
        onSuccess: (r) => {
          setResultado(
            r.convite === "enviado"
              ? `Conta de ${r.usuario.nome} criada. Convite enviado para ${r.usuario.email}.`
              : `Conta de ${r.usuario.nome} criada, mas o convite está indisponível neste ambiente. Use "Reenviar convite" na lista.`,
          );
          setNome("");
          setEmail("");
          setAtletaId("");
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="ct-nova-t">
      <div className="panel-head">
        <h2 id="ct-nova-t">Nova conta</h2>
      </div>
      <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
        <div className={`ct-form${ehAtleta ? " com-atleta" : ""}`}>
          <label className="field" htmlFor={idNome}>
            Nome
            <input
              id={idNome}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              autoComplete="off"
              required
            />
          </label>
          <label className="field" htmlFor={idEmail}>
            E-mail
            <input
              id={idEmail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              autoComplete="off"
              required
            />
          </label>
          <label className="field" htmlFor={idPapel}>
            Papel
            <select
              id={idPapel}
              value={papel}
              onChange={(e) => {
                setPapel(e.target.value as PapelUsuario);
                setAtletaId("");
              }}
            >
              {PAPEIS_NOVOS.map((p) => (
                <option key={p} value={p}>
                  {PAPEIS[p]}
                </option>
              ))}
            </select>
          </label>
          {ehAtleta && (
            <label className="field" htmlFor={idAtleta}>
              Atleta
              <select
                id={idAtleta}
                value={atletaId}
                onChange={(e) => setAtletaId(e.target.value)}
                required
              >
                <option value="">Escolha</option>
                {semConta.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} ({a.velaid}){a.termoAceito ? "" : " · termo pendente"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="ct-form-acao">
            <button
              type="submit"
              className="btn primary"
              disabled={!nome.trim() || !email.trim() || (ehAtleta && !atletaId) || criar.isPending}
            >
              {criar.isPending ? "Criando…" : "Criar conta e enviar convite"}
            </button>
          </div>
        </div>
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        {resultado && (
          <div className="note" role="status">
            {resultado}
          </div>
        )}
      </form>
    </section>
  );
}

function SeloConta({ u }: { u: Usuario }) {
  if (u.contaVinculada) return <span className="pill st-apto">Vinculada</span>;
  if (u.convidadoEm) {
    return (
      <span className="ct-conta">
        <span className="pill st-cond">Convite enviado</span>
        <small className="ct-sub-txt">em {fmtData(u.convidadoEm)}</small>
      </span>
    );
  }
  return <span className="pill st-alerta">Sem convite</span>;
}

function ListaContas() {
  const usuarios = useUsuarios();
  const { data: me } = useMe();
  const reenviar = useReenviarConvite();
  const alterar = useAlterarAtivo();
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  const aoReenviar = (u: Usuario) => {
    setAviso("");
    setErro("");
    reenviar.mutate(u.id, {
      onSuccess: () => {
        setAviso(`Convite reenviado para ${u.email}.`);
        toast.success("Convite reenviado");
      },
      onError: (err) => setErro(mensagemDeErro(err)),
    });
  };

  const aoAlterar = (u: Usuario) => {
    setAviso("");
    setErro("");
    alterar.mutate(
      { id: u.id, ativo: !u.ativo },
      {
        onSuccess: () => setAviso(`Conta de ${u.nome} ${u.ativo ? "desativada" : "ativada"}.`),
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="ct-lista-t">
      <div className="panel-head">
        <h2 id="ct-lista-t">Contas</h2>
      </div>
      {erro && (
        <div className="note" role="alert">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="note" role="status">
          {aviso}
        </div>
      )}
      {usuarios.isPending ? (
        <p className="muted" role="status">
          Carregando contas…
        </p>
      ) : usuarios.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(usuarios.error)}
        </div>
      ) : usuarios.data.length === 0 ? (
        <EstadoVazio icone="users-three" titulo="Nenhuma conta cadastrada" />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de contas, role para ver todas as colunas"
        >
          <table className="data interativa ct-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th className="ct-col-atleta">Atleta</th>
                <th>Conta</th>
                <th>Situação</th>
                <th className="acoes">
                  <span className="ct-sr">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.data.map((u) => {
                const eu = me?.usuario.id === u.id;
                return (
                  <tr key={u.id} className={u.ativo ? undefined : "ct-inativo"}>
                    <td className="ct-nome">
                      <span className="ct-nome-txt">{u.nome}</span>
                      <small className="ct-sub-txt">{u.email}</small>
                      {u.atleta && (
                        <small className="ct-sub-txt ct-vinculo">Atleta: {u.atleta.nome}</small>
                      )}
                    </td>
                    <td className="nw">
                      <span className="pill st-neutro">{PAPEIS[u.papel] ?? u.papel}</span>
                    </td>
                    <td className="nw ct-col-atleta">{u.atleta?.nome ?? "—"}</td>
                    <td className="nw">
                      <SeloConta u={u} />
                    </td>
                    <td className="nw">
                      <span className={`pill ${u.ativo ? "st-apto" : "st-neutro"}`}>
                        {u.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="acoes">
                      <div className="acoes-grupo">
                        {!u.contaVinculada && (
                          <button
                            type="button"
                            className="btn sm"
                            aria-label={`Reenviar convite para ${u.nome}`}
                            aria-disabled={reenviar.isPending ? true : undefined}
                            onClick={() => {
                              if (!reenviar.isPending) aoReenviar(u);
                            }}
                          >
                            Reenviar convite
                          </button>
                        )}
                        <button
                          type="button"
                          className={`btn sm${u.ativo ? " perigo" : ""}`}
                          aria-label={`${u.ativo ? "Desativar" : "Ativar"} conta de ${u.nome}`}
                          disabled={eu && u.ativo}
                          aria-disabled={alterar.isPending ? true : undefined}
                          title={
                            eu && u.ativo ? "Você não pode desativar a própria conta." : undefined
                          }
                          onClick={() => {
                            if (!alterar.isPending) aoAlterar(u);
                          }}
                        >
                          {u.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type Sim = "" | "true" | "false";

/** Espera o usuário parar de digitar antes de buscar. */
function useAtrasado<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

function AtletasDoPiloto() {
  const idBusca = useId();
  const idSituacao = useId();
  const idTermo = useId();
  const idClasse = useId();
  const idTreinador = useId();
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<Sim>("");
  const [termoAceito, setTermoAceito] = useState<Sim>("");
  const [classeId, setClasseId] = useState("");
  const [treinadorId, setTreinadorId] = useState("");
  const buscaAtrasada = useAtrasado(busca.trim());
  const filtros: FiltrosAtletas = {
    ...(buscaAtrasada ? { busca: buscaAtrasada } : {}),
    ...(ativo ? { ativo } : {}),
    ...(termoAceito ? { termoAceito } : {}),
    ...(classeId ? { classeId } : {}),
    ...(treinadorId ? { treinadorId } : {}),
  };
  const atletas = useAtletasGestao(filtros);
  const parametros = useParametros();
  const treinadores = useTreinadores();
  const [alvo, setAlvo] = useState<AtletaGestao | null>(null);

  return (
    <section className="panel" aria-labelledby="ct-atl-t">
      <div className="panel-head">
        <h2 id="ct-atl-t">Atletas do piloto</h2>
        <span className="muted ct-sub">
          Todos os atletas, inclusive inativos e sem termo aceito
        </span>
      </div>
      <div className="ct-filtros" role="search" aria-label="Filtrar atletas">
        <label className="field" htmlFor={idBusca}>
          Buscar
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={80}
            placeholder="Nome ou VelaID"
            autoComplete="off"
          />
        </label>
        <label className="field" htmlFor={idSituacao}>
          Situação
          <select id={idSituacao} value={ativo} onChange={(e) => setAtivo(e.target.value as Sim)}>
            <option value="">Todas</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </label>
        <label className="field" htmlFor={idTermo}>
          Termo
          <select
            id={idTermo}
            value={termoAceito}
            onChange={(e) => setTermoAceito(e.target.value as Sim)}
          >
            <option value="">Todos</option>
            <option value="true">Aceito</option>
            <option value="false">Pendente</option>
          </select>
        </label>
        <label className="field" htmlFor={idClasse}>
          Classe
          <select id={idClasse} value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            <option value="">Todas</option>
            {(parametros.data?.classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={idTreinador}>
          Treinador(a)
          <select
            id={idTreinador}
            value={treinadorId}
            onChange={(e) => setTreinadorId(e.target.value)}
          >
            <option value="">Todos</option>
            {(treinadores.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {atletas.isPending ? (
        <p className="muted" role="status">
          Carregando atletas…
        </p>
      ) : atletas.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(atletas.error)}
        </div>
      ) : atletas.data.length === 0 ? (
        <EstadoVazio
          icone="magnifying-glass"
          titulo="Nenhum atleta encontrado"
          texto="Ajuste a busca ou os filtros."
        />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de atletas do piloto, role para ver todas as colunas"
        >
          <table className="data interativa ct-tabela">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>VelaID</th>
                <th>Classe</th>
                <th className="ct-col-treinador">Treinador(a)</th>
                <th className="ct-col-vela">Nº de vela</th>
                <th>Situação</th>
                <th>Termo</th>
                <th>Conta</th>
                <th className="acoes">
                  <span className="ct-sr">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {atletas.data.map((a) => (
                <tr key={a.id} className={a.ativo ? undefined : "ct-inativo"}>
                  <td className="ct-nome">
                    <span className="ct-nome-txt">{a.nome}</span>
                    {(a.treinador || a.numeroVela) && (
                      <small className="ct-sub-txt ct-vinculo">
                        {[
                          a.treinador ? `Treinador: ${a.treinador.nome}` : null,
                          a.numeroVela ?? null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                  </td>
                  <td className="nw mono">{a.velaid}</td>
                  <td className="nw">{a.classe.nome}</td>
                  <td className="nw ct-col-treinador">{a.treinador?.nome ?? "—"}</td>
                  <td className="nw ct-col-vela">{a.numeroVela ?? "—"}</td>
                  <td className="nw">
                    <span className={`pill ${a.ativo ? "st-apto" : "st-neutro"}`}>
                      {a.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="nw">
                    <span className={`pill ${a.termoAceito ? "st-apto" : "st-cond"}`}>
                      {a.termoAceito ? "Aceito" : "Pendente"}
                    </span>
                  </td>
                  <td className="nw">
                    <span className={`pill ${a.contaVinculada ? "st-apto" : "st-neutro"}`}>
                      {a.contaVinculada ? "Com conta" : "Sem conta"}
                    </span>
                  </td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="btn sm ghost"
                      aria-label={`Editar ${a.nome}`}
                      onClick={() => setAlvo(a)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {alvo && <EditarAtleta atleta={alvo} aoFechar={() => setAlvo(null)} />}
    </section>
  );
}

function EditarAtleta({ atleta: a, aoFechar }: { atleta: AtletaGestao; aoFechar: () => void }) {
  const parametros = useParametros();
  const treinadores = useTreinadores();
  const editar = useEditarAtleta();
  const [classeId, setClasseId] = useState(a.classe.id);
  const [treinadorId, setTreinadorId] = useState("");
  const [numeroVela, setNumeroVela] = useState(a.numeroVela ?? "");
  const [ativo, setAtivo] = useState(a.ativo);
  const [ativoMexido, setAtivoMexido] = useState(false);
  const [erro, setErro] = useState("");

  const classes = (parametros.data?.classes ?? []).filter((c) => c.ativa || c.id === a.classe.id);

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    const corpo: CorpoAtleta = {};
    if (classeId !== a.classe.id) corpo.classeId = classeId;
    if (treinadorId) corpo.treinadorId = treinadorId;
    if (numeroVela.trim() !== (a.numeroVela ?? "")) corpo.numeroVela = numeroVela.trim();
    if (ativoMexido) corpo.ativo = ativo;
    editar.mutate(
      { id: a.id, corpo },
      {
        onSuccess: () => {
          toast.success(`${a.nome} atualizado`);
          aoFechar();
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <Dialogo titulo={`Editar ${a.nome}`} aoFechar={aoFechar}>
      <form className="stack" style={{ gap: 12 }} onSubmit={salvar}>
        <label className="field">
          Classe e função
          <select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            {classes.length === 0 && <option value={a.classe.id}>{a.classe.nome}</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Treinador(a) responsável
          <select value={treinadorId} onChange={(e) => setTreinadorId(e.target.value)}>
            <option value="">Manter o atual</option>
            {(treinadores.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Número de vela
          <input
            className="ct-numvela"
            value={numeroVela}
            onChange={(e) => setNumeroVela(e.target.value)}
            maxLength={20}
            placeholder="BRA 1766"
          />
        </label>
        <label className="painel-opcao">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => {
              setAtivo(e.target.checked);
              setAtivoMexido(true);
            }}
          />
          Atleta ativo no piloto
        </label>
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={editar.isPending}>
            {editar.isPending ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
