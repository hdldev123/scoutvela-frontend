import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
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
import { ErroApi, mensagemDeErro } from "@/lib/api/cliente";
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

function lerTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ""));
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsText(arquivo, "UTF-8");
  });
}

/** Cadastro do atleta a partir do VelaID, termos pendentes e importação de CSV (gestor). */
export function TelaCadastro() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gestor CBVela</div>
          <h1>Cadastrar atleta</h1>
          <p>
            O cadastro parte do VelaID: o sistema não pede CPF nem documento. No piloto, só entram
            atletas de 18 anos ou mais.
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

function NovoAtleta() {
  const [codigo, setCodigo] = useState("");
  const [dados, setDados] = useState<DadosVelaId | null>(null);
  const [erroBusca, setErroBusca] = useState("");
  const [classeId, setClasseId] = useState("");
  const [treinadorId, setTreinadorId] = useState("");
  const [erroCadastro, setErroCadastro] = useState("");
  const [criado, setCriado] = useState<AtletaCadastrado | null>(null);
  const busca = useBuscarVelaId();
  const cadastro = useCadastrarAtleta();
  const classes = useClasses();
  const treinadores = useTreinadores();
  const idCodigo = useId();

  const limpar = () => {
    setDados(null);
    setErroBusca("");
    setErroCadastro("");
    setCriado(null);
    setClasseId("");
    setTreinadorId("");
  };

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    limpar();
    busca.mutate(codigo.trim(), {
      onSuccess: setDados,
      onError: (err) =>
        setErroBusca(
          err instanceof ErroApi && err.status === 404
            ? "Nenhum atleta com esse código no VelaID."
            : mensagemDeErro(err),
        ),
    });
  };

  const cadastrar = (e: FormEvent) => {
    e.preventDefault();
    if (!dados) return;
    setErroCadastro("");
    cadastro.mutate(
      { velaidCodigo: dados.codigo, classeId, treinadorId },
      {
        onSuccess: (r) => {
          setCriado(r);
          setDados(null);
          toast.success(`${r.nome} cadastrado. Termo enviado.`);
        },
        onError: (err) => setErroCadastro(mensagemDeErro(err)),
      },
    );
  };

  return (
    <section className="panel" aria-labelledby="cad-busca-t">
      <div className="panel-head">
        <h2 id="cad-busca-t">Buscar no VelaID</h2>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        <form className="cad-form" onSubmit={buscar}>
          <label className="field" htmlFor={idCodigo}>
            Código VelaID
            <input
              id={idCodigo}
              className="cad-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: MG-T15"
              autoComplete="off"
              maxLength={40}
            />
          </label>
          <button
            type="submit"
            className="btn primary"
            disabled={!codigo.trim() || busca.isPending}
          >
            {busca.isPending ? "Buscando…" : "Buscar no VelaID"}
          </button>
        </form>
        {erroBusca && (
          <div className="note" role="alert">
            {erroBusca}
          </div>
        )}

        {criado && (
          <div className="note" role="status">
            Termo enviado a {criado.nome} ({criado.termo.versao}). O atleta entra no ranking depois
            do aceite.
          </div>
        )}

        {dados && (
          <div className="grid-2">
            <div className="stack" style={{ gap: 12 }}>
              <div className="note">
                Veio do VelaID. Não trazemos CPF nem endereço: só o que o score usa.
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
                <dt>ID World Sailing</dt>
                <dd>{dados.wsId ?? "—"}</dd>
              </dl>
            </div>
            {dados.elegivel ? (
              <form className="stack" style={{ gap: 12 }} onSubmit={cadastrar}>
                <label className="field" htmlFor="cad-classe">
                  Classe e função projetadas
                  <select
                    id="cad-classe"
                    value={classeId}
                    onChange={(e) => setClasseId(e.target.value)}
                  >
                    <option value="">Escolha</option>
                    {(classes.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor="cad-trein">
                  Treinador(a) responsável
                  <select
                    id="cad-trein"
                    value={treinadorId}
                    onChange={(e) => setTreinadorId(e.target.value)}
                  >
                    <option value="">Escolha</option>
                    {(treinadores.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </label>
                {(classes.isError || treinadores.isError) && (
                  <div className="note" role="alert">
                    Não foi possível carregar classes ou treinadores.
                  </div>
                )}
                {erroCadastro && (
                  <div className="note" role="alert">
                    {erroCadastro}
                  </div>
                )}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={!classeId || !treinadorId || cadastro.isPending}
                  >
                    {cadastro.isPending ? "Enviando…" : "Enviar termo de consentimento"}
                  </button>
                  <button type="button" className="btn" onClick={limpar}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="note cad-motivo" role="alert">
                Cadastro bloqueado: {dados.motivo ?? "atleta não elegível ao piloto."}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TermosPendentes() {
  const pendentes = usePendentes();
  const registrar = useRegistrarTermo();
  const [alvo, setAlvo] = useState<AtletaPendente | null>(null);
  const [erro, setErro] = useState("");

  const confirmar = () => {
    if (!alvo) return;
    const atleta = alvo;
    setErro("");
    registrar.mutate(atleta.id, {
      onSuccess: () => {
        setAlvo(null);
        toast.success(`Aceite de ${atleta.nome} registrado. O atleta entra no ranking.`);
      },
      onError: (err) => setErro(mensagemDeErro(err)),
    });
  };

  return (
    <section className="panel" aria-labelledby="cad-pend-t">
      <div className="panel-head">
        <h2 id="cad-pend-t">Termos pendentes</h2>
        <span className="muted cad-sub">Atletas que ainda não aceitaram o termo do piloto</span>
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
        <p className="muted">Nenhum termo pendente.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>VelaID</th>
                <th>Classe</th>
                <th>Cadastrado em</th>
                <th>
                  <span className="cad-sr">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pendentes.data.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.velaid}</td>
                  <td>{p.classe.nome}</td>
                  <td>{fmtData(p.criadoEm)}</td>
                  <td className="r">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setErro("");
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
        <Dialogo titulo="Registrar aceite do termo" aoFechar={() => setAlvo(null)}>
          <div className="stack" style={{ gap: 12 }}>
            <p>
              Confirme que {alvo.nome} ({alvo.velaid}) devolveu o termo do piloto aceito. Depois
              disso o atleta entra no ranking. O compartilhamento com o IBVAR continua sendo decisão
              do atleta.
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
                onClick={confirmar}
                disabled={registrar.isPending}
              >
                {registrar.isPending ? "Registrando…" : "Confirmar aceite"}
              </button>
              <button type="button" className="btn" onClick={() => setAlvo(null)}>
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
    if (!arquivo) return;
    setErro("");
    setResultado(null);
    try {
      const conteudo = await lerTexto(arquivo);
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
        <fieldset className="cad-tipos">
          <legend className="cad-sr">Tipo de importação</legend>
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
        </fieldset>
        <div className="note">
          <b>Colunas esperadas ({formato.nome}):</b>
          <div className="cad-formato">{formato.colunas}</div>
          {formato.nota} Separador ; ou , detectado no cabeçalho.
        </div>
        <div className="note">
          Arquivos com colunas de CPF, RG, documento, endereço ou renda são recusados por inteiro.
        </div>
        <label className="field" htmlFor="cad-arquivo">
          Arquivo CSV
          <input
            key={chave}
            id="cad-arquivo"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          />
        </label>
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={!arquivo || importar.isPending}>
            {importar.isPending ? "Importando…" : "Importar"}
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
            <div className="table-scroll">
              <table className="data">
                <caption className="cad-sr">Erros por linha</caption>
                <thead>
                  <tr>
                    <th className="r">Linha</th>
                    <th>Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.erros.map((e) => (
                    <tr key={`${e.linha}-${e.mensagem}`}>
                      <td className="r">{e.linha}</td>
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
