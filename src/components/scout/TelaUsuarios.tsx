import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import { useTreinadores } from "@/lib/api/cadastro";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useRanking, type ItemRanking } from "@/lib/api/consultas";
import { useParametros } from "@/lib/api/parametros";
import {
  useAlterarAtivo,
  useCriarUsuario,
  useEditarAtleta,
  useReenviarConvite,
  useUsuarios,
  type CorpoAtleta,
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
          <div className="eyebrow">Gestor CBVela</div>
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
  const ranking = useRanking({});

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
        <div className="ct-form">
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
                {(ranking.data?.itens ?? []).map((i) => (
                  <option key={i.atleta.id} value={i.atleta.id}>
                    {i.atleta.nome} ({i.atleta.velaid})
                  </option>
                ))}
              </select>
            </label>
          )}
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
        <div className="btn-row">
          <button
            type="submit"
            className="btn primary"
            disabled={!nome.trim() || !email.trim() || (ehAtleta && !atletaId) || criar.isPending}
          >
            {criar.isPending ? "Criando…" : "Criar conta e enviar convite"}
          </button>
        </div>
      </form>
    </section>
  );
}

function situacaoConta(u: Usuario): string {
  if (u.contaVinculada) return "Conta vinculada";
  return u.convidadoEm ? `Convite pendente desde ${fmtData(u.convidadoEm)}` : "Sem convite";
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
        <p className="muted">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Atleta</th>
                <th>Conta</th>
                <th>Situação</th>
                <th>
                  <span className="ct-sr">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.data.map((u) => {
                const eu = me?.usuario.id === u.id;
                return (
                  <tr key={u.id} className={u.ativo ? undefined : "ct-inativo"}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{PAPEIS[u.papel] ?? u.papel}</td>
                    <td>{u.atleta?.nome ?? "—"}</td>
                    <td>{situacaoConta(u)}</td>
                    <td>{u.ativo ? "Ativa" : "Inativa"}</td>
                    <td className="r">
                      <div className="ct-acoes">
                        {!u.contaVinculada && (
                          <button
                            type="button"
                            className="btn"
                            aria-label={`Reenviar convite para ${u.nome}`}
                            disabled={reenviar.isPending}
                            onClick={() => aoReenviar(u)}
                          >
                            Reenviar convite
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn"
                          aria-label={`${u.ativo ? "Desativar" : "Ativar"} conta de ${u.nome}`}
                          disabled={alterar.isPending || (eu && u.ativo)}
                          title={
                            eu && u.ativo ? "Você não pode desativar a própria conta." : undefined
                          }
                          onClick={() => aoAlterar(u)}
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

function AtletasDoPiloto() {
  const ranking = useRanking({});
  const [alvo, setAlvo] = useState<ItemRanking | null>(null);
  return (
    <section className="panel" aria-labelledby="ct-atl-t">
      <div className="panel-head">
        <h2 id="ct-atl-t">Atletas do piloto</h2>
        <span className="muted ct-sub">Classe, treinador, número de vela e situação</span>
      </div>
      {ranking.isPending ? (
        <p className="muted" role="status">
          Carregando atletas…
        </p>
      ) : ranking.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(ranking.error)}
        </div>
      ) : ranking.data.itens.length === 0 ? (
        <p className="muted">Nenhum atleta no piloto.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>VelaID</th>
                <th>Classe</th>
                <th>Nº de vela</th>
                <th>
                  <span className="ct-sr">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.data.itens.map((i) => (
                <tr key={i.atleta.id}>
                  <td>{i.atleta.nome}</td>
                  <td>{i.atleta.velaid}</td>
                  <td>{i.atleta.classe.nome}</td>
                  <td>{i.atleta.numeroVela ?? "—"}</td>
                  <td className="r">
                    <button
                      type="button"
                      className="btn"
                      aria-label={`Editar ${i.atleta.nome}`}
                      onClick={() => setAlvo(i)}
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
      {alvo && <EditarAtleta item={alvo} aoFechar={() => setAlvo(null)} />}
    </section>
  );
}

function EditarAtleta({ item, aoFechar }: { item: ItemRanking; aoFechar: () => void }) {
  const a = item.atleta;
  const parametros = useParametros();
  const treinadores = useTreinadores();
  const editar = useEditarAtleta();
  const [classeId, setClasseId] = useState(a.classe.id);
  const [treinadorId, setTreinadorId] = useState("");
  const [numeroVela, setNumeroVela] = useState(a.numeroVela ?? "");
  const [ativo, setAtivo] = useState(true);
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
