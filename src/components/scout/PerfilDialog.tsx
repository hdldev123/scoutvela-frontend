import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  useEnviarFoto,
  usePerfil,
  useRemoverFoto,
  useSalvarPerfil,
  type Perfil,
} from "@/lib/api/perfil";
import { useCriarPedidoTitular } from "@/lib/api/titular";
import { ROTULO_PAPEL } from "@/lib/auth/navegacao";
import { getSupabase } from "@/lib/auth/supabase";
import { prepararFoto, validarFoto } from "@/lib/foto";
import { Avatar } from "./Avatar";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import { SENHA_MINIMA } from "./TelaRedefinirSenha";

function idade(nascimento: string, hoje = new Date()): number {
  const [a, m, d] = nascimento.split("-").map(Number) as [number, number, number];
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos -= 1;
  return anos;
}

function Erro({ texto }: { texto: string }) {
  return texto ? (
    <p role="alert" className="field-error">
      {texto}
    </p>
  ) : null;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="perfil-linha">
      <dt>{rotulo}</dt>
      <dd>{valor || "—"}</dd>
    </div>
  );
}

interface Previa {
  tipoMime: "image/jpeg" | "image/png";
  conteudoBase64: string;
  url: string;
}

function SecaoFoto({ perfil }: { perfil: Perfil }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState("");
  const enviar = useEnviarFoto();
  const remover = useRemoverFoto();

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    const problema = validarFoto(arquivo);
    if (problema) {
      setPrevia(null);
      return setErro(problema);
    }
    try {
      const p = await prepararFoto(arquivo);
      setErro("");
      setPrevia({ tipoMime: p.tipoMime, conteudoBase64: p.conteudoBase64, url: p.previa });
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <section className="stack" style={{ gap: 8 }} aria-labelledby="perfil-foto">
      <h3 id="perfil-foto">Foto</h3>
      <div className="perfil-foto">
        <Avatar nome={perfil.nome} fotoUrl={previa?.url ?? perfil.fotoUrl} grande />
        <div className="stack" style={{ gap: 6 }}>
          <label className="field" htmlFor="perfil-arquivo">
            Escolher foto
            <input
              id="perfil-arquivo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => {
                void escolher(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {previa && (
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn primary"
                disabled={enviar.isPending}
                onClick={() =>
                  enviar.mutate(
                    { tipoMime: previa.tipoMime, conteudoBase64: previa.conteudoBase64 },
                    {
                      onSuccess: () => {
                        setPrevia(null);
                        toast("Foto atualizada");
                      },
                      onError: (e) => setErro(mensagemDeErro(e, "Não foi possível enviar a foto.")),
                    },
                  )
                }
              >
                Salvar foto
              </button>
              <button type="button" className="btn" onClick={() => setPrevia(null)}>
                Cancelar
              </button>
            </div>
          )}
          {perfil.fotoUrl && !previa && (
            <div>
              <button
                type="button"
                className="btn"
                disabled={remover.isPending}
                onClick={() =>
                  remover.mutate(undefined, {
                    onSuccess: () => toast("Foto removida"),
                    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível remover a foto.")),
                  })
                }
              >
                Remover foto
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        A foto é opcional (JPG ou PNG, até 2 MB, recortada em quadrado). Ela aparece para você, para
        a gestão técnica da CBVela e, no caso de atletas, para o treinador do atleta. O IBVAR não a
        vê.
      </p>
      <Erro texto={erro} />
    </section>
  );
}

function SecaoEdicao({ perfil }: { perfil: Perfil }) {
  const atleta = perfil.atleta;
  const salvar = useSalvarPerfil();
  const [valor, setValor] = useState(atleta ? (atleta.emailContato ?? "") : perfil.nome);
  const [erro, setErro] = useState("");

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = valor.trim();
    if (!atleta && (texto.length < 2 || texto.length > 120)) {
      return setErro("O nome precisa ter de 2 a 120 caracteres.");
    }
    setErro("");
    salvar.mutate(atleta ? { emailContato: texto === "" ? null : texto } : { nome: texto }, {
      onSuccess: () => toast("Perfil atualizado"),
      onError: (err) => setErro(mensagemDeErro(err, "Não foi possível salvar o perfil.")),
    });
  }

  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={submeter} noValidate>
      <label className="field" htmlFor="perfil-editavel">
        {atleta ? "E-mail de contato" : "Nome"}
        <input
          id="perfil-editavel"
          type={atleta ? "email" : "text"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </label>
      <Erro texto={erro} />
      <div>
        <button type="submit" className="btn primary" disabled={salvar.isPending}>
          Salvar
        </button>
      </div>
    </form>
  );
}

function SecaoCorrecao() {
  const criar = useCriarPedidoTitular();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("Corrigir no meu cadastro: ");
  const [erro, setErro] = useState("");

  if (!aberto) {
    return (
      <div>
        <button type="button" className="btn" onClick={() => setAberto(true)}>
          Pedir correção dos dados do VelaID
        </button>
      </div>
    );
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = descricao.trim();
    if (texto.length < 10 || texto.length > 2000) {
      return setErro("Descreva a correção com 10 a 2000 caracteres.");
    }
    setErro("");
    criar.mutate(
      { tipo: "correcao", descricao: texto },
      {
        onSuccess: () => {
          toast("Pedido de correção enviado");
          setAberto(false);
        },
        onError: (err) => setErro(mensagemDeErro(err, "Não foi possível enviar o pedido.")),
      },
    );
  }

  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={submeter} noValidate>
      <label className="field" htmlFor="perfil-correcao">
        O que precisa ser corrigido?
        <textarea
          id="perfil-correcao"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </label>
      <Erro texto={erro} />
      <div className="row" style={{ gap: 6 }}>
        <button type="submit" className="btn primary" disabled={criar.isPending}>
          Enviar pedido
        </button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SecaoSenha() {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <div>
        <button type="button" className="btn" onClick={() => setAberto(true)}>
          Trocar senha
        </button>
      </div>
    );
  }

  async function submeter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const senha = String(f.get("senha"));
    if (senha.length < SENHA_MINIMA) {
      return setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    }
    if (senha !== String(f.get("confirmacao"))) return setErro("As senhas não coincidem.");
    setErro("");
    setEnviando(true);
    const { error } = await getSupabase().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro("Não foi possível trocar a senha. Tente de novo.");
    toast("Senha alterada");
    setAberto(false);
  }

  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={(e) => void submeter(e)} noValidate>
      <label className="field" htmlFor="perfil-senha">
        Nova senha
        <input id="perfil-senha" name="senha" type="password" autoComplete="new-password" />
      </label>
      <label className="field" htmlFor="perfil-senha2">
        Confirmar nova senha
        <input id="perfil-senha2" name="confirmacao" type="password" autoComplete="new-password" />
      </label>
      <Erro texto={erro} />
      <div className="row" style={{ gap: 6 }}>
        <button type="submit" className="btn primary" disabled={enviando}>
          Salvar senha
        </button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Linha da verificação em duas etapas: diz se há app autenticador cadastrado, além do estado da sessão. */
function LinhaMfa({ mfaAtivo }: { mfaAtivo: boolean }) {
  const fatores = useQuery({
    queryKey: ["mfa-fatores"],
    queryFn: async () => {
      const { data, error } = await getSupabase().auth.mfa.listFactors();
      if (error) throw error;
      return (data?.totp?.length ?? 0) > 0;
    },
    retry: false,
  });
  let valor: string;
  if (fatores.isPending) valor = "Carregando…";
  else if (fatores.isError) valor = mfaAtivo ? "Ativa nesta sessão" : "Não verificada nesta sessão";
  else if (!fatores.data) valor = "Não cadastrada";
  else
    valor = mfaAtivo
      ? "Cadastrada · verificada nesta sessão"
      : "Cadastrada · não verificada nesta sessão";
  return <Linha rotulo="Verificação em duas etapas" valor={valor} />;
}

function Corpo({ perfil, aoFechar }: { perfil: Perfil; aoFechar: () => void }) {
  const a = perfil.atleta;
  return (
    <div className="stack perfil">
      <div className="perfil-id">
        <Avatar nome={perfil.nome} fotoUrl={perfil.fotoUrl} grande />
        <div>
          <b>{perfil.nome}</b>
          <div className="muted">{ROTULO_PAPEL[perfil.papel] ?? perfil.papel}</div>
        </div>
      </div>
      <dl className="perfil-dados">
        <Linha rotulo="E-mail de login" valor={perfil.email} />
        <LinhaMfa mfaAtivo={perfil.mfaAtivo} />
        {perfil.treinador && (
          <Linha
            rotulo="Atletas sob sua responsabilidade"
            valor={String(perfil.treinador.quantidadeAtletas)}
          />
        )}
      </dl>
      {a && (
        <>
          <h3>Dados do VelaID</h3>
          <dl className="perfil-dados">
            <Linha rotulo="VelaID" valor={a.velaid} />
            <Linha rotulo="Classe" valor={a.classe.nome} />
            <Linha rotulo="Número de vela" valor={a.numeroVela} />
            <Linha rotulo="Idade" valor={`${idade(a.dataNascimento)} anos`} />
            <Linha rotulo="Clube" valor={a.clube} />
            <Linha rotulo="Cidade/UF" valor={[a.cidade, a.uf].filter(Boolean).join("/") || null} />
            <Linha rotulo="Treinador" valor={a.treinador?.nome} />
          </dl>
          <SecaoCorrecao />
          <h3>Termo e consentimento</h3>
          <dl className="perfil-dados">
            <Linha
              rotulo="Aceite do termo"
              valor={a.termoAceitoEm ? `Aceito em ${fmtData(a.termoAceitoEm)}` : "Ainda não aceito"}
            />
            <Linha
              rotulo="Compartilhamento com o IBVAR"
              valor={a.compartilharIbvar ? "Ativado" : "Desativado"}
            />
          </dl>
          <div>
            <Link to="/painel" className="btn" onClick={aoFechar}>
              Gerenciar no painel
            </Link>
          </div>
        </>
      )}
      <SecaoFoto perfil={perfil} />
      <h3>Editar</h3>
      <SecaoEdicao perfil={perfil} />
      <h3>Senha</h3>
      <SecaoSenha />
    </div>
  );
}

/** Modal "Meu perfil" (atleta, treinador e gestor). */
export function PerfilDialog({ aoFechar }: { aoFechar: () => void }) {
  const perfil = usePerfil();
  return (
    <Dialogo titulo="Meu perfil" aoFechar={aoFechar}>
      {perfil.isPending && <p role="status">Carregando…</p>}
      {perfil.error && (
        <Erro texto={mensagemDeErro(perfil.error, "Não foi possível carregar o perfil.")} />
      )}
      {perfil.data && <Corpo perfil={perfil.data} aoFechar={aoFechar} />}
    </Dialogo>
  );
}
