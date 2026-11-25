import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
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
import { prepararFoto, validarFoto, validarRecorte } from "@/lib/foto";
import { mensagemErroSenha, type ErroSenha } from "@/lib/auth/erros-senha";
import { errosPorCampo } from "@/lib/api/cliente";
import { mensagemEmail } from "@/lib/validacao";
import { Avatar } from "./Avatar";
import { ContatoPerfil } from "./ContatoPerfil";
import { Dialogo } from "./Dialogo";
import { fmtInstante } from "./formato";
import { SENHA_MINIMA } from "./TelaRedefinirSenha";
import { atributosDoCampo } from "./campo-util";
import { LinkWsId } from "./LinkWsId";
import { MensagemCampo } from "./MensagemCampo";

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

type Tom = "ok" | "atencao" | "neutro";
const CLASSE_TOM: Record<Tom, string> = { ok: "st-apto", atencao: "st-cond", neutro: "st-neutro" };

function Selo({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={`pill ${CLASSE_TOM[tom]}`}>{children}</span>;
}

/** Bloco com título discreto e um cartão de linhas separadas por fio. */
function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section className="perfil-secao" aria-labelledby={id}>
      <h3 id={id}>{titulo}</h3>
      <div className="perfil-cartao">{children}</div>
    </section>
  );
}

/** Linha só de leitura (rótulo à esquerda, valor à direita). Use dentro de <dl>. */
function Linha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="perfil-item">
      <dt>{rotulo}</dt>
      <dd>{valor === null || valor === undefined || valor === "" ? "—" : valor}</dd>
    </div>
  );
}

interface Previa {
  tipoMime: "image/jpeg" | "image/png";
  conteudoBase64: string;
  url: string;
}

/** Topo do modal: foto (ou iniciais), nome, papel e e-mail, com as ações da foto. */
function Cabecalho({ perfil }: { perfil: Perfil }) {
  const entrada = useRef<HTMLInputElement>(null);
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
      // O limite de 2 MB vale para o recorte que vai à API, não para o arquivo original.
      const grande = validarRecorte(p.conteudoBase64);
      if (grande) {
        setPrevia(null);
        return setErro(grande);
      }
      setErro("");
      setPrevia({ tipoMime: p.tipoMime, conteudoBase64: p.conteudoBase64, url: p.previa });
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  function salvarFoto() {
    if (!previa) return;
    enviar.mutate(
      { tipoMime: previa.tipoMime, conteudoBase64: previa.conteudoBase64 },
      {
        onSuccess: () => {
          setPrevia(null);
          toast("Foto atualizada");
        },
        onError: (e) => setErro(mensagemDeErro(e, "Não foi possível enviar a foto.")),
      },
    );
  }

  function removerFoto() {
    setErro("");
    remover.mutate(undefined, {
      onSuccess: () => toast("Foto removida"),
      onError: (e) => setErro(mensagemDeErro(e, "Não foi possível remover a foto.")),
    });
  }

  return (
    <div className="perfil-cabecalho">
      <div className={previa ? "perfil-foto perfil-foto-previa" : "perfil-foto"}>
        <Avatar nome={perfil.nome} fotoUrl={previa?.url ?? perfil.fotoUrl} grande />
      </div>
      <div className="perfil-identidade">
        <p className="perfil-nome">{perfil.nome}</p>
        <p className="perfil-sub">
          <span className="pill st-neutro">{ROTULO_PAPEL[perfil.papel] ?? perfil.papel}</span>
        </p>
        <input
          ref={entrada}
          id="perfil-arquivo"
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png"
          aria-label="Escolher foto"
          tabIndex={-1}
          onChange={(e) => {
            void escolher(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="perfil-acoes">
          {previa ? (
            <>
              <button
                type="button"
                className="btn primary"
                disabled={enviar.isPending}
                onClick={salvarFoto}
              >
                {enviar.isPending ? "Enviando…" : "Salvar foto"}
              </button>
              <button type="button" className="btn" onClick={() => setPrevia(null)}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => entrada.current?.click()}>
                <i className="ph ph-camera" aria-hidden="true" />{" "}
                {perfil.fotoUrl ? "Trocar foto" : "Enviar foto"}
              </button>
              {perfil.fotoUrl && (
                <button
                  type="button"
                  className="btn btn-discreto"
                  disabled={remover.isPending}
                  onClick={removerFoto}
                >
                  Remover foto
                </button>
              )}
            </>
          )}
        </div>
        <p className="perfil-nota">
          {previa
            ? "Pré-visualização do recorte quadrado. Salve para aplicar."
            : perfil.atleta
              ? "Opcional. JPG ou PNG, até 15 MB (a foto é reduzida antes do envio). Visível para você, a gestão técnica e seu treinador. O IBVAR não vê."
              : "Opcional. JPG ou PNG, até 15 MB (a foto é reduzida antes do envio). Aparece no seu menu lateral."}
        </p>
        <Erro texto={erro} />
      </div>
    </div>
  );
}

/** Campo editável da conta: nome (gestor e treinador) ou e-mail de contato (atleta). */
function CampoEditavel({ perfil }: { perfil: Perfil }) {
  const atleta = perfil.atleta;
  const salvar = useSalvarPerfil();
  const inicial = atleta ? (atleta.emailContato ?? "") : perfil.nome;
  const [valor, setValor] = useState(inicial);
  const [erro, setErro] = useState("");
  const alterado = valor.trim() !== inicial.trim();
  const texto = valor.trim();
  // Erro de validação do cliente (aparece ao digitar) e o do servidor (400, por campo).
  const falha = atleta
    ? mensagemEmail(texto)
    : texto.length > 0 && (texto.length < 2 || texto.length > 120)
      ? "O nome precisa ter de 2 a 120 caracteres."
      : null;
  const doServidor = errosPorCampo(salvar.error)[atleta ? "emailContato" : "nome"];
  const msg = falha ?? doServidor;

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!atleta && (texto.length < 2 || texto.length > 120)) {
      return setErro("O nome precisa ter de 2 a 120 caracteres.");
    }
    if (falha) return;
    setErro("");
    salvar.mutate(atleta ? { emailContato: texto === "" ? null : texto } : { nome: texto }, {
      onSuccess: () => toast(atleta ? "E-mail de contato atualizado" : "Nome atualizado"),
      onError: (err) =>
        setErro(
          Object.keys(errosPorCampo(err)).length > 0
            ? ""
            : mensagemDeErro(err, "Não foi possível salvar o perfil."),
        ),
    });
  }

  return (
    <form className="perfil-item perfil-item-form" onSubmit={submeter} noValidate>
      <label htmlFor="perfil-editavel">{atleta ? "E-mail de contato" : "Nome"}</label>
      <div className="perfil-inline">
        <input
          id="perfil-editavel"
          type={atleta ? "email" : "text"}
          autoComplete={atleta ? "email" : "name"}
          value={valor}
          {...atributosDoCampo("perfil-editavel-erro", msg)}
          onChange={(e) => {
            if (salvar.isError) salvar.reset();
            setErro("");
            setValor(e.target.value);
          }}
        />
        <button
          type="submit"
          className="btn primary"
          disabled={!alterado || !!falha || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {atleta && (
        <p className="perfil-desc">
          Usado pela CBVela para falar com você. O e-mail de login não muda.
        </p>
      )}
      <MensagemCampo id="perfil-editavel-erro" texto={msg} />
      <Erro texto={erro} />
    </form>
  );
}

const MIN_CORRECAO = 10;

function PedidoCorrecao() {
  const criar = useCriarPedidoTitular();
  const [aberto, setAberto] = useState(false);
  // Sem texto pré-preenchido: o mínimo de caracteres vale só para o que a pessoa escreve.
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");

  if (!aberto) {
    return (
      <div className="perfil-item">
        <p className="perfil-desc">
          Esses dados vêm do seu cadastro e não são editados aqui. Algo errado?
        </p>
        <button type="button" className="btn" onClick={() => setAberto(true)}>
          Pedir correção
        </button>
      </div>
    );
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = descricao.trim();
    if (texto.length < MIN_CORRECAO || texto.length > 2000) {
      return setErro(`Descreva a correção com ${MIN_CORRECAO} a 2000 caracteres.`);
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

  const campoServidor = errosPorCampo(criar.error)["descricao"];
  const msg = erro || campoServidor || null;

  return (
    <form className="perfil-item perfil-item-form" onSubmit={submeter} noValidate>
      <label htmlFor="perfil-correcao">O que precisa ser corrigido?</label>
      <textarea
        id="perfil-correcao"
        rows={3}
        placeholder="Ex.: meu clube está errado, o correto é Iate Clube (mínimo de 10 caracteres)"
        value={descricao}
        {...atributosDoCampo("perfil-correcao-erro", msg)}
        onChange={(e) => {
          if (criar.isError) criar.reset();
          setErro("");
          setDescricao(e.target.value);
        }}
      />
      <MensagemCampo id="perfil-correcao-erro" texto={msg} />
      <div className="perfil-acoes">
        <button type="submit" className="btn primary" disabled={criar.isPending}>
          {criar.isPending ? "Enviando…" : "Enviar pedido"}
        </button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Verificação em duas etapas: diz se há app autenticador cadastrado e se a sessão passou por ele. */
function ItemMfa({ mfaAtivo, aoFechar }: { mfaAtivo: boolean; aoFechar: () => void }) {
  const fatores = useQuery({
    queryKey: ["mfa-fatores"],
    queryFn: async () => {
      const { data, error } = await getSupabase().auth.mfa.listFactors();
      if (error) throw error;
      return (data?.totp?.length ?? 0) > 0;
    },
    retry: false,
  });

  let selo: ReactNode;
  let desc: string;
  let acao: string | null = null;
  if (fatores.isPending) {
    selo = <Selo tom="neutro">Carregando…</Selo>;
    desc = "Consultando o app autenticador.";
  } else if (fatores.isError) {
    selo = mfaAtivo ? (
      <Selo tom="ok">Ativa nesta sessão</Selo>
    ) : (
      <Selo tom="neutro">Não verificada nesta sessão</Selo>
    );
    desc = "Não foi possível consultar o app autenticador agora.";
  } else if (!fatores.data) {
    selo = <Selo tom="atencao">Não cadastrada</Selo>;
    desc = "Proteja a conta com um código do app autenticador, além da senha.";
    acao = "Configurar";
  } else if (mfaAtivo) {
    selo = <Selo tom="ok">Ativa</Selo>;
    desc = "App autenticador cadastrado e verificado nesta sessão.";
  } else {
    selo = <Selo tom="atencao">Cadastrada</Selo>;
    desc = "App autenticador cadastrado, mas esta sessão ainda não passou por ele.";
    acao = "Verificar agora";
  }

  return (
    <div className="perfil-item">
      <div className="perfil-item-texto">
        <span className="perfil-rotulo">Verificação em duas etapas</span>
        <span className="perfil-desc">{desc}</span>
      </div>
      <div className="perfil-item-lado">
        {selo}
        {acao && (
          <Link to="/verificacao" className="btn" onClick={aoFechar}>
            {acao}
          </Link>
        )}
      </div>
    </div>
  );
}

function ItemSenha({ aoFechar }: { aoFechar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<ErroSenha | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <div className="perfil-item">
        <div className="perfil-item-texto">
          <span className="perfil-rotulo">Senha</span>
          <span className="perfil-desc">Use ao menos {SENHA_MINIMA} caracteres.</span>
        </div>
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
      return setErro({
        texto: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`,
        pedeVerificacao: false,
      });
    }
    if (senha !== String(f.get("confirmacao"))) {
      return setErro({ texto: "As senhas não coincidem.", pedeVerificacao: false });
    }
    setErro(null);
    setEnviando(true);
    const { error } = await getSupabase().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro(mensagemErroSenha(error));
    toast("Senha alterada");
    setAberto(false);
  }

  return (
    <form className="perfil-item perfil-item-form" onSubmit={(e) => void submeter(e)} noValidate>
      <span className="perfil-rotulo">Trocar senha</span>
      <div className="perfil-senhas">
        <label className="field" htmlFor="perfil-senha">
          Nova senha
          <input id="perfil-senha" name="senha" type="password" autoComplete="new-password" />
        </label>
        <label className="field" htmlFor="perfil-senha2">
          Confirmar nova senha
          <input
            id="perfil-senha2"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
          />
        </label>
      </div>
      <Erro texto={erro?.texto ?? ""} />
      {erro?.pedeVerificacao && (
        <div className="perfil-acoes">
          <Link to="/verificacao" className="btn" onClick={aoFechar}>
            Verificar agora
          </Link>
        </div>
      )}
      <div className="perfil-acoes">
        <button type="submit" className="btn primary" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar senha"}
        </button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Corpo({ perfil, aoFechar }: { perfil: Perfil; aoFechar: () => void }) {
  const a = perfil.atleta;
  return (
    <div className="perfil">
      <Cabecalho perfil={perfil} />

      <Secao id="perfil-conta" titulo="Conta">
        <CampoEditavel perfil={perfil} />
        <dl>
          <Linha rotulo="E-mail de login" valor={perfil.email} />
          {perfil.treinador && (
            <Linha
              rotulo="Atletas sob sua responsabilidade"
              valor={String(perfil.treinador.quantidadeAtletas)}
            />
          )}
        </dl>
      </Secao>

      {a && (
        <>
          <Secao id="perfil-velaid" titulo="Cadastro">
            <dl className="perfil-grade">
              <Linha
                rotulo="ID World Sailing"
                valor={<LinkWsId wsId={a.wsId} nome={perfil.nome} />}
              />
              <Linha rotulo="VelaID" valor={a.velaid ? <code>{a.velaid}</code> : null} />
              <Linha rotulo="Classe" valor={a.classe.nome} />
              <Linha rotulo="Número de vela" valor={a.numeroVela} />
              <Linha
                rotulo="Idade"
                valor={a.dataNascimento ? `${idade(a.dataNascimento)} anos` : null}
              />
              <Linha rotulo="Clube" valor={a.clube} />
              <Linha
                rotulo="Cidade/UF"
                valor={[a.cidade, a.uf].filter(Boolean).join("/") || null}
              />
              <Linha rotulo="Treinador" valor={a.treinador?.nome} />
            </dl>
            <PedidoCorrecao />
          </Secao>

          <Secao id="perfil-contato" titulo="Contato e viagens">
            <ContatoPerfil
              telefone={a.telefone}
              passaporteValidoAte={a.passaporteValidoAte}
              aptidao={a.aptidao}
            />
          </Secao>

          <Secao id="perfil-consentimento" titulo="Termo e consentimento">
            <dl>
              <Linha
                rotulo="Termo do piloto"
                valor={
                  a.termoAceitoEm ? (
                    <Selo tom="ok">Aceito em {fmtInstante(a.termoAceitoEm)}</Selo>
                  ) : (
                    <Selo tom="atencao">Ainda não aceito</Selo>
                  )
                }
              />
              <Linha
                rotulo="Compartilhamento com o IBVAR"
                valor={
                  a.compartilharIbvar ? (
                    <Selo tom="ok">Ativado</Selo>
                  ) : (
                    <Selo tom="neutro">Desativado</Selo>
                  )
                }
              />
            </dl>
            <div className="perfil-item">
              <p className="perfil-desc">O aceite e o consentimento são geridos no seu painel.</p>
              <Link to="/painel" className="btn" onClick={aoFechar}>
                Gerenciar no painel
              </Link>
            </div>
          </Secao>
        </>
      )}

      <Secao id="perfil-seguranca" titulo="Segurança">
        <ItemMfa mfaAtivo={perfil.mfaAtivo} aoFechar={aoFechar} />
        <ItemSenha aoFechar={aoFechar} />
      </Secao>
    </div>
  );
}

/** Modal "Meu perfil" (atleta, treinador e gestor). */
export function PerfilDialog({ aoFechar }: { aoFechar: () => void }) {
  const perfil = usePerfil();
  return (
    <Dialogo titulo="Meu perfil" aoFechar={aoFechar}>
      {perfil.isPending && (
        <p role="status" className="muted">
          Carregando…
        </p>
      )}
      {perfil.error && (
        <Erro texto={mensagemDeErro(perfil.error, "Não foi possível carregar o perfil.")} />
      )}
      {perfil.data && <Corpo perfil={perfil.data} aoFechar={aoFechar} />}
    </Dialogo>
  );
}
