import { Fragment, useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CampoArquivo } from "./CampoArquivo";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtData, fmtInstante, nomeOuWsId } from "./formato";
import { LinkWsId } from "./LinkWsId";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import {
  LIMITE_CSV_BYTES,
  useBuscarVelaId,
  useCadastrarAtleta,
  useClasses,
  useImportarCsv,
  usePendentes,
  useRegistrarTermo,
  useTreinadores,
  type AtletaCadastrado,
  type AtletaPendente,
  type DadosVelaId,
  type ResultadoImportacao,
  type TipoImportacao,
} from "@/lib/api/cadastro";
import { ErroApi, errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useTermo, useTermoProxima } from "@/lib/api/titular";
import { mensagemEmail } from "@/lib/validacao";
import { mensagemWsId, normalizarWsId } from "@/lib/world-sailing";
import "@/styles/cadastro.css";

const FORMATOS: Record<TipoImportacao, { nome: string; colunas: string; nota: string }> = {
  velaid: {
    nome: "VelaID",
    colunas: "codigo;nome;genero;data_nascimento;clube;cidade;uf;ws_id;email",
    nota: "Cadastro único de atletas da CBVela.",
  },
  ranking_cbvela: {
    nome: "Ranking CBVela",
    colunas: "velaid;nivel;evento;data;posicao;tamanho_frota;pontos",
    nota: "Nível: brasileiro, estadual ou regional.",
  },
};

const MENSAGEM_CONTA: Record<AtletaCadastrado["conta"], string> = {
  convite_enviado: "Conta criada e convite enviado ao e-mail informado.",
  sem_email:
    "Nenhuma conta foi criada: o e-mail já está em uso ou a opção estava desmarcada. Crie a conta em Contas de acesso.",
  indisponivel:
    "Conta criada, mas o convite não pôde ser enviado neste ambiente. Reenvie em Contas de acesso.",
};

function lerTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ""));
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsText(arquivo, "UTF-8");
  });
}

function Aviso({
  icone,
  tom,
  children,
}: {
  icone: string;
  tom: "info" | "alerta";
  children: ReactNode;
}) {
  return (
    <div className={`aviso aviso-${tom}`}>
      <i className={`ph ph-${icone}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Cadastro do atleta a partir do VelaID, termos pendentes e importação de CSV (gestor). */
export function TelaCadastro() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Atletas</div>
          <h1>Cadastrar atleta</h1>
          <p>
            O cadastro parte do ID World Sailing: o sistema não pede CPF nem documento. O VelaID é
            opcional. No piloto, só entram atletas de 18 anos ou mais.
          </p>
        </div>
      </div>
      <div className="stack">
        <NovoAtleta />
        <TermosPendentes />
        <ImportarCsv />
      </div>
    </>
  );
}

/** Campo do formulário a que o erro devolvido pela API se refere. */
type CampoCadastro =
  "wsId" | "email" | "classeId" | "treinadorId" | "velaid" | "confirmaMaioridade";
type ErrosCadastro = Partial<Record<CampoCadastro, string>>;

const CAMPOS_CADASTRO: readonly CampoCadastro[] = [
  "wsId",
  "email",
  "classeId",
  "treinadorId",
  "velaid",
  "confirmaMaioridade",
];

/** Erros 400 (por campo ou só mensagem) e 409 (duplicidade) de `POST /atletas`, por campo. */
function errosDoCadastro(err: unknown): { campos: ErrosCadastro; geral: string } {
  const campos: ErrosCadastro = {};
  const doServidor = errosPorCampo(err);
  for (const c of CAMPOS_CADASTRO) {
    if (doServidor[c]) campos[c] = doServidor[c];
  }
  if (Object.keys(campos).length > 0) return { campos, geral: "" };
  const mensagem = mensagemDeErro(err);
  if (err instanceof ErroApi && (err.status === 409 || err.status === 400)) {
    if (/world sailing/i.test(mensagem)) return { campos: { wsId: mensagem }, geral: "" };
    if (/velaid|código/i.test(mensagem)) return { campos: { velaid: mensagem }, geral: "" };
    if (/18 anos|maioridade/i.test(mensagem)) {
      return { campos: { confirmaMaioridade: mensagem }, geral: "" };
    }
  }
  return { campos, geral: mensagem };
}

function NovoAtleta() {
  const [wsId, setWsId] = useState("");
  const [email, setEmail] = useState("");
  const [classeId, setClasseId] = useState("");
  const [treinadorId, setTreinadorId] = useState("");
  const [velaid, setVelaid] = useState("");
  const [maior, setMaior] = useState(false);
  const [criarConta, setCriarConta] = useState(true);
  const [tentou, setTentou] = useState(false);
  const [dados, setDados] = useState<DadosVelaId | null>(null);
  const [erroBusca, setErroBusca] = useState("");
  const [errosApi, setErrosApi] = useState<ErrosCadastro>({});
  const [erroGeral, setErroGeral] = useState("");
  const [criado, setCriado] = useState<AtletaCadastrado | null>(null);
  const busca = useBuscarVelaId();
  const cadastro = useCadastrarAtleta();
  const classes = useClasses();
  const treinadores = useTreinadores();
  const id = useId();
  const idWs = `${id}-ws`;
  const idEmail = `${id}-email`;
  const idClasse = `${id}-classe`;
  const idTrein = `${id}-trein`;
  const idVelaid = `${id}-velaid`;
  const idMaior = `${id}-maior`;

  // Erros locais só depois da primeira tentativa de envio; o da API vale até o campo mudar.
  const locais: Partial<Record<CampoCadastro, string | undefined>> = tentou
    ? {
        wsId: mensagemWsId(wsId) ?? undefined,
        email:
          email.trim() === "" ? "Informe o e-mail do atleta." : (mensagemEmail(email) ?? undefined),
        classeId: classeId ? undefined : "Escolha a classe e a função.",
        treinadorId: treinadorId ? undefined : "Escolha o treinador responsável.",
        confirmaMaioridade: maior ? undefined : "Confirme que o atleta tem 18 anos ou mais.",
      }
    : {};
  const erro = (c: CampoCadastro) => locais[c] ?? errosApi[c];
  const limparErro = (c: CampoCadastro) =>
    setErrosApi((atual) => {
      const { [c]: _removido, ...resto } = atual;
      return resto;
    });

  const velaidBloqueado = !!dados && !dados.elegivel;

  const buscar = () => {
    setErroBusca("");
    setDados(null);
    busca.mutate(velaid.trim(), {
      onSuccess: setDados,
      onError: (err) =>
        setErroBusca(
          err instanceof ErroApi && err.status === 404
            ? "Nenhum atleta com esse código no VelaID. Se cadastrar assim, o código fica gravado sem dados de referência."
            : mensagemDeErro(err),
        ),
    });
  };

  const aoMudarVelaid = (valor: string) => {
    setVelaid(valor);
    setDados(null);
    setErroBusca("");
    limparErro("velaid");
  };

  const cadastrar = (e: FormEvent) => {
    e.preventDefault();
    setTentou(true);
    setErrosApi({});
    setErroGeral("");
    const invalido =
      !!mensagemWsId(wsId) ||
      email.trim() === "" ||
      !!mensagemEmail(email) ||
      !classeId ||
      !treinadorId ||
      !maior;
    if (invalido || velaidBloqueado) return;
    cadastro.mutate(
      {
        wsId: normalizarWsId(wsId),
        email: email.trim(),
        classeId,
        treinadorId,
        confirmaMaioridade: true,
        criarConta,
        ...(velaid.trim() ? { velaid: velaid.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          setCriado(r);
          setWsId("");
          setEmail("");
          setClasseId("");
          setTreinadorId("");
          setVelaid("");
          setDados(null);
          setErroBusca("");
          setMaior(false);
          setTentou(false);
          toast.success(`Atleta ${r.wsId} cadastrado. Termo enviado.`);
        },
        onError: (err) => {
          const { campos, geral } = errosDoCadastro(err);
          setErrosApi(campos);
          setErroGeral(geral);
        },
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="cad-novo-t">
      <div className="panel-head">
        <h2 id="cad-novo-t">Novo atleta</h2>
        <span className="muted cad-sub">
          O atleta completa nome, gênero e nascimento no primeiro acesso
        </span>
      </div>
      {criado && (
        <div className="note" role="status" style={{ marginBottom: 12 }}>
          Atleta <LinkWsId wsId={criado.wsId} /> cadastrado. Termo enviado ({criado.termo.versao}).
          Ele entra no ranking depois de completar o cadastro e aceitar o termo.{" "}
          {MENSAGEM_CONTA[criado.conta]}
        </div>
      )}
      <form className="stack" style={{ gap: 12 }} onSubmit={cadastrar} noValidate>
        <div className="cad-grade">
          <div>
            <label className="field" htmlFor={idWs}>
              ID World Sailing
              <input
                id={idWs}
                className="cad-codigo"
                value={wsId}
                onChange={(e) => {
                  setWsId(e.target.value.toUpperCase());
                  limparErro("wsId");
                }}
                placeholder="Ex.: BRAJS12"
                autoComplete="off"
                maxLength={40}
                required
                {...atributosDoCampo(`${idWs}-erro`, erro("wsId"))}
              />
            </label>
            <MensagemCampo id={`${idWs}-erro`} texto={erro("wsId")} />
          </div>
          <div>
            <label className="field" htmlFor={idEmail}>
              E-mail do atleta
              <input
                id={idEmail}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  limparErro("email");
                }}
                maxLength={255}
                autoComplete="off"
                required
                {...atributosDoCampo(`${idEmail}-erro`, erro("email"))}
              />
            </label>
            <MensagemCampo id={`${idEmail}-erro`} texto={erro("email")} />
          </div>
          <div>
            <label className="field" htmlFor={idClasse}>
              Classe e função projetadas
              <select
                id={idClasse}
                value={classeId}
                onChange={(e) => {
                  setClasseId(e.target.value);
                  limparErro("classeId");
                }}
                required
                {...atributosDoCampo(`${idClasse}-erro`, erro("classeId"))}
              >
                <option value="">Escolha</option>
                {(classes.data ?? [])
                  .filter((c) => c.ativa)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </label>
            <MensagemCampo id={`${idClasse}-erro`} texto={erro("classeId")} />
          </div>
          <div>
            <label className="field" htmlFor={idTrein}>
              Treinador(a) responsável
              <select
                id={idTrein}
                value={treinadorId}
                onChange={(e) => {
                  setTreinadorId(e.target.value);
                  limparErro("treinadorId");
                }}
                required
                {...atributosDoCampo(`${idTrein}-erro`, erro("treinadorId"))}
              >
                <option value="">Escolha</option>
                {(treinadores.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <MensagemCampo id={`${idTrein}-erro`} texto={erro("treinadorId")} />
          </div>
        </div>
        {(classes.isError || treinadores.isError) && (
          <div className="note" role="alert">
            Não foi possível carregar classes ou treinadores.
          </div>
        )}

        <fieldset className="cad-velaid">
          <legend>VelaID (opcional)</legend>
          <div className="cad-form">
            <div>
              <label className="field" htmlFor={idVelaid}>
                Código VelaID
                <input
                  id={idVelaid}
                  className="cad-codigo"
                  value={velaid}
                  onChange={(e) => aoMudarVelaid(e.target.value)}
                  placeholder="Ex.: MG-T15"
                  autoComplete="off"
                  maxLength={40}
                  {...atributosDoCampo(`${idVelaid}-erro`, erro("velaid"))}
                />
              </label>
              <MensagemCampo id={`${idVelaid}-erro`} texto={erro("velaid")} />
            </div>
            <button
              type="button"
              className="btn"
              onClick={buscar}
              disabled={!velaid.trim() || busca.isPending}
            >
              {busca.isPending ? "Buscando…" : "Buscar no VelaID"}
            </button>
          </div>
          {erroBusca && (
            <div className="note" role="alert">
              {erroBusca}
            </div>
          )}
          {dados && (
            <div className="stack" style={{ gap: 8 }} role="status">
              <div className="note">
                Dados do VelaID, só como referência: o atleta confirma os dele no primeiro acesso.
              </div>
              <dl className="kv">
                <dt>Nome</dt>
                <dd>{dados.nome}</dd>
                <dt>Nascimento</dt>
                <dd>
                  {fmtData(dados.dataNascimento)} · {dados.idade} anos
                </dd>
                <dt>Categoria</dt>
                <dd>{dados.genero === "F" ? "Feminino" : "Masculino"}</dd>
                <dt>Clube</dt>
                <dd>{dados.clube ?? "—"}</dd>
                <dt>Cidade</dt>
                <dd>{dados.cidade ? `${dados.cidade}/${dados.uf ?? "—"}` : "—"}</dd>
                <dt>ID World Sailing no VelaID</dt>
                <dd>{dados.wsId ?? "—"}</dd>
              </dl>
              {velaidBloqueado && (
                <div className="note cad-motivo" role="alert">
                  Cadastro bloqueado com este código: {dados.motivo ?? "atleta não elegível."}
                </div>
              )}
            </div>
          )}
        </fieldset>

        <div>
          <label className="painel-opcao" htmlFor={idMaior}>
            <input
              id={idMaior}
              type="checkbox"
              checked={maior}
              onChange={(e) => {
                setMaior(e.target.checked);
                limparErro("confirmaMaioridade");
              }}
              required
              {...atributosDoCampo(`${idMaior}-erro`, erro("confirmaMaioridade"))}
            />
            Confirmo que o atleta tem 18 anos ou mais
          </label>
          <MensagemCampo id={`${idMaior}-erro`} texto={erro("confirmaMaioridade")} />
        </div>
        <label className="painel-opcao">
          <input
            type="checkbox"
            checked={criarConta}
            onChange={(e) => setCriarConta(e.target.checked)}
          />
          Criar conta e enviar convite ao atleta
        </label>
        {erroGeral && (
          <div className="note" role="alert">
            {erroGeral}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={cadastro.isPending}>
            {cadastro.isPending ? "Enviando…" : "Enviar termo de consentimento"}
          </button>
        </div>
      </form>
    </section>
  );
}

function TermosPendentes() {
  const pendentes = usePendentes();
  const registrar = useRegistrarTermo();
  const termo = useTermo();
  // Com uma versão futura já publicada, o gestor pode registrar o aceite dela (aceite antecipado).
  const proxima = useTermoProxima();
  const [alvo, setAlvo] = useState<AtletaPendente | null>(null);
  const [erro, setErro] = useState("");
  const [qual, setQual] = useState<"vigente" | "proxima">("vigente");

  const escolhida = qual === "proxima" && proxima.data ? proxima.data : termo.data;

  const confirmar = () => {
    if (!alvo) return;
    const atleta = alvo;
    setErro("");
    if (!escolhida) return;
    registrar.mutate(
      { id: atleta.id, versao: escolhida.versao },
      {
        onSuccess: () => {
          setAlvo(null);
          toast.success(`Aceite de ${nomeOuWsId(atleta)} registrado. O atleta entra no ranking.`);
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="cad-pend-t">
      <div className="panel-head">
        <h2 id="cad-pend-t">Termos pendentes</h2>
        <span className="muted cad-sub">
          Atletas sem aceite da versão vigente do termo do piloto
        </span>
      </div>
      {pendentes.isPending ? (
        <p className="muted" role="status">
          Carregando termos pendentes…
        </p>
      ) : pendentes.isError ? (
        <div className="note" role="alert">
          {mensagemDeErro(pendentes.error)}
        </div>
      ) : pendentes.data.length === 0 ? (
        <div className="vazio-compacto">
          <EstadoVazio icone="seal-check" titulo="Nenhum termo pendente" />
        </div>
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de termos pendentes, role para ver todas as colunas"
        >
          <table className="data">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>ID World Sailing</th>
                <th>VelaID</th>
                <th>Classe</th>
                <th>Cadastrado em</th>
                <th>Termo</th>
                <th className="acoes">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pendentes.data.map((p) => (
                <tr key={p.id}>
                  <td>{nomeOuWsId(p)}</td>
                  <td className="nw">
                    <LinkWsId wsId={p.wsId} nome={p.nome} />
                  </td>
                  <td className="nw">{p.velaid ? <code>{p.velaid}</code> : "—"}</td>
                  <td className="nw">{p.classe.nome}</td>
                  <td className="nw">{fmtInstante(p.criadoEm)}</td>
                  <td>
                    {p.termoAceitoVersao ? (
                      <span className="pill st-cond cad-termo">
                        Aceitou a versão {p.termoAceitoVersao}; falta a vigente
                      </span>
                    ) : (
                      <span className="pill st-alerta cad-termo">Nunca aceitou</span>
                    )}
                  </td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        setErro("");
                        setQual("vigente");
                        setAlvo(p);
                      }}
                    >
                      Registrar aceite recebido
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {alvo && (
        <Dialogo
          titulo="Registrar aceite do termo"
          aoFechar={() => setAlvo(null)}
          bloqueado={registrar.isPending}
        >
          <div className="stack" style={{ gap: 12 }}>
            <p>
              Confirme que {alvo.nome ? `${alvo.nome} (${alvo.wsId})` : alvo.wsId} devolveu aceito o
              termo {qual === "proxima" ? "da próxima versão" : "vigente"}
              {escolhida ? ` (${escolhida.versao})` : ""}. Depois disso o atleta entra no ranking. O
              compartilhamento com o IBVAR continua sendo decisão do atleta.
            </p>
            {proxima.data && (
              <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
                <legend>Versão aceita</legend>
                <label>
                  <input
                    type="radio"
                    name="cad-versao-termo"
                    checked={qual === "vigente"}
                    onChange={() => setQual("vigente")}
                  />{" "}
                  Vigente{termo.data ? ` (${termo.data.versao})` : ""}
                </label>
                <label>
                  <input
                    type="radio"
                    name="cad-versao-termo"
                    checked={qual === "proxima"}
                    onChange={() => setQual("proxima")}
                  />{" "}
                  Próxima, a valer em {fmtInstante(proxima.data.vigenteDesde)} (
                  {proxima.data.versao})
                </label>
              </fieldset>
            )}
            {(erro || termo.isError) && (
              <div className="note" role="alert">
                {erro || "Não foi possível carregar o termo vigente."}
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn primary"
                onClick={confirmar}
                disabled={registrar.isPending || !escolhida}
              >
                {registrar.isPending ? "Registrando…" : "Confirmar aceite"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={registrar.isPending}
                onClick={() => setAlvo(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </section>
  );
}

function ImportarCsv() {
  const [tipo, setTipo] = useState<TipoImportacao>("velaid");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [chave, setChave] = useState(0);
  const importar = useImportarCsv();
  const [lendo, setLendo] = useState(false);
  const formato = FORMATOS[tipo];

  const escolher = (f: File | null) => {
    setResultado(null);
    setErro("");
    if (f && f.size > LIMITE_CSV_BYTES) {
      setArquivo(null);
      setChave((k) => k + 1);
      setErro("Arquivo acima de 512 KB. Divida o CSV em partes menores.");
      return;
    }
    setArquivo(f);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!arquivo || lendo || importar.isPending) return;
    setErro("");
    setResultado(null);
    // Marca "enviando" antes de ler o arquivo: um segundo clique durante a leitura não duplica.
    setLendo(true);
    try {
      const conteudo = await lerTexto(arquivo);
      setLendo(false);
      if (!conteudo.trim()) {
        setErro("O arquivo está vazio.");
        return;
      }
      importar.mutate(
        { tipo, arquivoNome: arquivo.name.slice(0, 200), conteudo },
        {
          onSuccess: (r) => {
            setResultado(r);
            toast.success(`Importação concluída: ${r.linhasOk} linhas ok.`);
          },
          onError: (err) => setErro(mensagemDeErro(err)),
        },
      );
    } catch (err) {
      setLendo(false);
      setErro(mensagemDeErro(err));
    }
  };

  return (
    <section className="panel" aria-labelledby="cad-imp-t">
      <div className="panel-head">
        <h2 id="cad-imp-t">Importar CSV</h2>
        <span className="muted cad-sub">VelaID ou Ranking CBVela (até 512 KB)</span>
      </div>
      <form className="stack" style={{ gap: 12 }} onSubmit={(e) => void enviar(e)}>
        <div className="segmentado" role="radiogroup" aria-label="Tipo de importação">
          {(Object.keys(FORMATOS) as TipoImportacao[]).map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="tipo-importacao"
                checked={tipo === t}
                onChange={() => {
                  setTipo(t);
                  setResultado(null);
                  setErro("");
                }}
              />
              {FORMATOS[t].nome}
            </label>
          ))}
        </div>
        <Aviso icone="info" tom="info">
          <b>Colunas esperadas ({formato.nome}):</b>
          <code className="cad-formato">
            {formato.colunas.split(";").map((c, i) => (
              <Fragment key={c}>
                {i > 0 && ";"}
                {i > 0 && <wbr />}
                {c}
              </Fragment>
            ))}
          </code>
          <span>{formato.nota} Separador ; ou , detectado no cabeçalho.</span>
        </Aviso>
        <Aviso icone="warning" tom="alerta">
          Arquivos com colunas de CPF, RG, documento, endereço ou renda são recusados por inteiro.
        </Aviso>
        <CampoArquivo
          key={chave}
          id="cad-arquivo"
          rotulo="Arquivo CSV"
          accept=".csv,text/csv"
          textoBotao="Escolher CSV"
          dica="CSV, até 512 KB"
          arquivo={arquivo}
          aoEscolher={(f) => escolher(f ?? null)}
        />
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        <div className="btn-row cad-importar">
          <button
            type="submit"
            className="btn primary"
            disabled={!arquivo || lendo || importar.isPending}
          >
            {lendo || importar.isPending ? "Importando…" : "Importar"}
          </button>
        </div>
      </form>
      {resultado && (
        <div className="stack" style={{ gap: 12, marginTop: 12 }} role="status">
          <div className="cad-resumo">
            <span className="pill st-apto">{resultado.linhasOk} linhas ok</span>
            <span className={`pill ${resultado.linhasErro ? "st-alerta" : "st-lock"}`}>
              {resultado.linhasErro} linhas com erro
            </span>
          </div>
          {resultado.erros.length > 0 && (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Tabela de erros por linha da importação, role para ver todas as colunas"
            >
              <table className="data">
                <caption className="sr-only">Erros por linha</caption>
                <thead>
                  <tr>
                    <th className="num">Linha</th>
                    <th>Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.erros.map((e) => (
                    <tr key={`${e.linha}-${e.mensagem}`}>
                      <td className="num">{e.linha}</td>
                      <td>{e.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
