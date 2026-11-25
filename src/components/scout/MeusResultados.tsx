import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CampoArquivo } from "./CampoArquivo";
import { AbrirEvidencia } from "./EvidenciasSecao";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmtInstante } from "./formato";
import { rotuloNivelHistorico } from "./niveis";
import { useAutoavaliacao } from "@/lib/api/autoavaliacao";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { ACEITA_ARQUIVO, validarArquivo } from "@/lib/api/evidencias";
import {
  ANO_MIN_RESULTADO,
  NIVEIS_RESULTADO,
  ROTULO_STATUS_RESULTADO,
  useEnviarResultado,
  useResultados,
  type NivelResultado,
  type ResultadoAtleta,
} from "@/lib/api/resultados";
import "@/styles/autoavaliacao.css";

const EVENTO_MAX = 120;

interface Linha {
  chave: number;
  ano: string;
  posicao: string;
  frota: string;
  data: string;
  link: string;
  sumula: File | null;
  erros: Record<string, string>;
  geral: string;
}

const linhaVazia = (chave: number): Linha => ({
  chave,
  ano: "",
  posicao: "",
  frota: "",
  data: "",
  link: "",
  sumula: null,
  erros: {},
  geral: "",
});

const inteiro = (t: string) => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null);

/** Confere a linha como a API confere (a API decide; isto só poupa a viagem). */
function validarLinha(l: Linha, anoAtual: number): Record<string, string> {
  const e: Record<string, string> = {};
  const ano = inteiro(l.ano);
  if (ano === null || ano < ANO_MIN_RESULTADO || ano > anoAtual) {
    e["ano"] = `Informe o ano da edição, de ${ANO_MIN_RESULTADO} a ${anoAtual}.`;
  }
  const pos = inteiro(l.posicao);
  if (pos === null || pos < 1)
    e["posicao"] = "Informe a colocação (número inteiro, a partir de 1).";
  if (l.frota.trim() !== "") {
    const f = inteiro(l.frota);
    if (f === null || f < 1)
      e["tamanhoFrota"] = "A frota precisa ser um número inteiro, a partir de 1.";
    else if (pos !== null && f < pos)
      e["tamanhoFrota"] = "A frota não pode ser menor que a colocação.";
  }
  if (l.data) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (l.data > hoje) e["data"] = "A data não pode ser futura.";
    else if (ano !== null && !l.data.startsWith(`${ano}-`)) {
      e["data"] = "A data precisa estar dentro do ano da edição.";
    }
  }
  const link = l.link.trim();
  if (link && !/^https:\/\/\S+$/i.test(link))
    e["linkOficial"] = "Use um link que comece com https://.";
  if (!l.sumula && !link) {
    e["anexoId"] = "Anexe a súmula ou informe o link oficial do resultado.";
  }
  return e;
}

type ErrosCabecalho = { evento?: string | undefined; nivel?: string | undefined };

/**
 * "Meus resultados" (atleta, D10): evento e nível uma vez, uma linha por edição com o botão "+".
 * Cada linha vira um `POST /me/resultados` (a súmula sobe antes); o resultado entra na nota só
 * depois da validação do treinador ou do gestor.
 */
export function MeusResultados({ atletaId }: { atletaId: string }) {
  const lista = useResultados(atletaId);
  const auto = useAutoavaliacao(atletaId);
  const enviar = useEnviarResultado(atletaId);
  const [evento, setEvento] = useState("");
  const [nivel, setNivel] = useState<NivelResultado | "">("");
  const [errosCab, setErrosCab] = useState<ErrosCabecalho>({});
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia(1)]);
  const [proxima, setProxima] = useState(2);
  const [enviando, setEnviando] = useState(false);

  const itens = lista.data?.itens ?? [];
  const nivelInfo = NIVEIS_RESULTADO.find((n) => n.id === nivel);
  // A orientação só aparece se a API a expuser ao atleta (hoje ela sai na autoavaliação).
  const orientacao = auto.data?.indicadores.find(
    (i) => i.indicadorId === nivelInfo?.indicadorId,
  )?.orientacao;

  const mudarLinha = (chave: number, parte: Partial<Linha>, camposLimpos: string[] = []) =>
    setLinhas((ls) =>
      ls.map((l) => {
        if (l.chave !== chave) return l;
        const erros = { ...l.erros };
        for (const c of camposLimpos) delete erros[c];
        return { ...l, erros, geral: "", ...parte };
      }),
    );

  async function submeter(ev: FormEvent) {
    ev.preventDefault();
    if (enviando) return;
    const anoAtual = new Date().getFullYear();
    const cab: ErrosCabecalho = {};
    if (!evento.trim()) cab.evento = "Informe o nome do evento.";
    if (!nivel) cab.nivel = "Escolha o nível.";
    setErrosCab(cab);
    const validadas = linhas.map((l) => ({ ...l, erros: validarLinha(l, anoAtual), geral: "" }));
    // Edição repetida no próprio formulário: a API também recusa (409), mas aqui poupa o envio.
    const vistos = new Set<string>();
    for (const l of validadas) {
      if (l.erros["ano"]) continue;
      if (vistos.has(l.ano.trim())) l.erros["ano"] = "Esta edição já está em outra linha.";
      vistos.add(l.ano.trim());
    }
    for (const l of validadas) {
      if (l.sumula) {
        const recusa = validarArquivo(l.sumula);
        if (recusa) l.erros["anexoId"] = recusa;
      }
    }
    setLinhas(validadas);
    if (cab.evento || cab.nivel || validadas.some((l) => Object.keys(l.erros).length > 0)) return;

    setEnviando(true);
    const restantes: Linha[] = [];
    let enviadas = 0;
    let erroCab: ErrosCabecalho = {};
    for (const l of validadas) {
      try {
        await enviar.mutateAsync({
          evento: evento.trim(),
          nivel: nivel as NivelResultado,
          ano: Number(l.ano),
          posicao: Number(l.posicao),
          ...(l.frota.trim() ? { tamanhoFrota: Number(l.frota) } : {}),
          ...(l.data ? { data: l.data } : {}),
          ...(l.link.trim() ? { linkOficial: l.link.trim() } : {}),
          sumula: l.sumula,
        });
        enviadas += 1;
      } catch (e) {
        const campos = errosPorCampo(e);
        const { evento: ee, nivel: en, ...doCampo } = campos;
        if (ee) erroCab = { ...erroCab, evento: ee };
        if (en) erroCab = { ...erroCab, nivel: en };
        restantes.push({
          ...l,
          erros: doCampo,
          geral:
            Object.keys(campos).length === 0
              ? mensagemDeErro(e, "Não foi possível enviar esta edição.")
              : "",
        });
      }
    }
    setEnviando(false);
    setErrosCab(erroCab);
    if (enviadas > 0) {
      toast.success(
        enviadas === 1
          ? "Resultado enviado. Seu treinador vai validar a súmula."
          : `${enviadas} resultados enviados. Seu treinador vai validar as súmulas.`,
      );
    }
    if (restantes.length === 0) {
      setLinhas([linhaVazia(proxima)]);
      setProxima(proxima + 1);
    } else setLinhas(restantes);
  }

  return (
    <section className="panel" aria-labelledby="res-titulo">
      <div className="panel-head">
        <h2 id="res-titulo">Meus resultados</h2>
      </div>
      <p className="panel-dica">
        Informe cada edição do evento com a súmula (PDF, JPG ou PNG) ou o link oficial. A nota dos
        indicadores de resultado é calculada pelo sistema, só com os resultados que seu treinador
        validar: vale a melhor colocação dentro do limite de edições.
      </p>
      <form className="res-form" onSubmit={submeter} noValidate>
        <div className="res-cab">
          <div>
            <label className="field" htmlFor="res-evento">
              Evento
              <input
                id="res-evento"
                maxLength={EVENTO_MAX}
                autoComplete="off"
                value={evento}
                disabled={enviando}
                {...atributosDoCampo("res-evento-erro", errosCab.evento)}
                onChange={(e) => {
                  setErrosCab((x) => ({ ...x, evento: undefined }));
                  setEvento(e.target.value);
                }}
              />
            </label>
            <MensagemCampo id="res-evento-erro" texto={errosCab.evento} />
          </div>
          <div>
            <label className="field" htmlFor="res-nivel">
              Nível
              <select
                id="res-nivel"
                value={nivel}
                disabled={enviando}
                {...atributosDoCampo("res-nivel-erro", errosCab.nivel)}
                onChange={(e) => {
                  setErrosCab((x) => ({ ...x, nivel: undefined }));
                  setNivel(e.target.value as NivelResultado | "");
                }}
              >
                <option value="">Escolha</option>
                {NIVEIS_RESULTADO.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <MensagemCampo id="res-nivel-erro" texto={errosCab.nivel} />
          </div>
        </div>
        {orientacao && (
          <p className="res-orientacao" role="note">
            {orientacao}
          </p>
        )}
        {linhas.map((l, i) => (
          <LinhaEdicao
            key={l.chave}
            n={i + 1}
            l={l}
            desabilitado={enviando}
            podeRemover={linhas.length > 1}
            aoMudar={(parte, campos) => mudarLinha(l.chave, parte, campos)}
            aoRemover={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
          />
        ))}
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            disabled={enviando}
            onClick={() => {
              setLinhas((ls) => [...ls, linhaVazia(proxima)]);
              setProxima(proxima + 1);
            }}
          >
            <i className="ph ph-plus" aria-hidden="true" /> Adicionar edição
          </button>
          <button type="submit" className="btn primary" disabled={enviando}>
            {enviando
              ? "Enviando…"
              : linhas.length > 1
                ? `Enviar ${linhas.length} edições`
                : "Enviar resultado"}
          </button>
        </div>
      </form>
      <ListaResultadosEnviados itens={itens} carregando={lista.isPending} erro={lista.error} />
    </section>
  );
}

function LinhaEdicao({
  n,
  l,
  desabilitado,
  podeRemover,
  aoMudar,
  aoRemover,
}: {
  n: number;
  l: Linha;
  desabilitado: boolean;
  podeRemover: boolean;
  aoMudar: (parte: Partial<Linha>, camposLimpos: string[]) => void;
  aoRemover: () => void;
}) {
  const id = `res-${l.chave}`;
  const campo = (
    chave: "ano" | "posicao" | "frota" | "data" | "link",
    erro: string,
    rotulo: string,
    extra: Record<string, unknown> = {},
  ) => (
    <div>
      <label className="field" htmlFor={`${id}-${chave}`}>
        {rotulo}
        <input
          id={`${id}-${chave}`}
          value={l[chave]}
          disabled={desabilitado}
          {...atributosDoCampo(`${id}-${chave}-erro`, l.erros[erro])}
          onChange={(e) => aoMudar({ [chave]: e.target.value }, [erro])}
          {...extra}
        />
      </label>
      <MensagemCampo id={`${id}-${chave}-erro`} texto={l.erros[erro]} />
    </div>
  );
  return (
    <fieldset className="res-linha" aria-label={`Edição ${n}`}>
      <legend>Edição {n}</legend>
      <div className="res-campos">
        {campo("ano", "ano", "Ano", { inputMode: "numeric", autoComplete: "off", maxLength: 4 })}
        {campo("posicao", "posicao", "Colocação", { inputMode: "numeric", autoComplete: "off" })}
        {campo("frota", "tamanhoFrota", "Tamanho da frota (opcional)", {
          inputMode: "numeric",
          autoComplete: "off",
        })}
        {campo("data", "data", "Data (opcional)", { type: "date" })}
      </div>
      <div className="res-prova">
        <div>
          <CampoArquivo
            id={`${id}-sumula`}
            rotulo={`Súmula da edição ${n}`}
            accept={ACEITA_ARQUIVO}
            textoBotao="Anexar súmula"
            contexto={`edição ${n}`}
            dica="PDF, JPG ou PNG, até 5 MB"
            arquivo={l.sumula}
            desabilitado={desabilitado}
            aoEscolher={(f) => {
              if (!f) return aoMudar({ sumula: null }, ["anexoId"]);
              const recusa = validarArquivo(f);
              if (recusa)
                return aoMudar({ sumula: null, erros: { ...l.erros, anexoId: recusa } }, []);
              aoMudar({ sumula: f }, ["anexoId"]);
            }}
          />
          <MensagemCampo id={`${id}-anexoId-erro`} texto={l.erros["anexoId"]} />
        </div>
        {campo("link", "linkOficial", "Ou link oficial do resultado", {
          type: "url",
          inputMode: "url",
          placeholder: "https://",
          autoComplete: "off",
        })}
      </div>
      {l.geral && (
        <div className="note" role="alert">
          {l.geral}
        </div>
      )}
      {podeRemover && (
        <div className="btn-row">
          <button
            type="button"
            className="btn sm ghost"
            disabled={desabilitado}
            onClick={aoRemover}
          >
            Remover edição {n}
          </button>
        </div>
      )}
    </fieldset>
  );
}

function ListaResultadosEnviados({
  itens,
  carregando,
  erro,
}: {
  itens: ResultadoAtleta[];
  carregando: boolean;
  erro: unknown;
}) {
  if (carregando) {
    return (
      <p className="muted" role="status">
        Carregando resultados…
      </p>
    );
  }
  if (erro) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(erro, "Não foi possível carregar os resultados.")}
      </p>
    );
  }
  if (itens.length === 0) return <p className="muted">Você ainda não informou nenhum resultado.</p>;
  return (
    <>
      <h3 style={{ margin: "14px 0 0", fontSize: "1rem" }}>Resultados enviados</h3>
      <ul className="pes-lista">
        {itens.map((r) => {
          const st = ROTULO_STATUS_RESULTADO[r.status];
          return (
            <li key={r.id}>
              <span className="pes-peso">
                {r.posicao}º · {r.evento} {r.edicao}
              </span>
              <span className="muted">{rotuloNivelHistorico(r.nivel)}</span>
              <span className={`pill ${st.classe}`}>{st.rotulo}</span>
              {r.validadoPor && r.validadoEm && (
                <span className="muted">
                  por {r.validadoPor.nome} em {fmtInstante(r.validadoEm)}
                </span>
              )}
              {r.anexo && (
                <AbrirEvidencia
                  id={r.anexo.id}
                  nomeArquivo={r.anexo.nomeArquivo}
                  className="ficha-clipe"
                >
                  <i className="ph ph-paperclip" aria-hidden="true" />
                  <span>{r.anexo.nomeArquivo}</span>
                </AbrirEvidencia>
              )}
              {r.status === "recusado" && r.motivo && (
                <span className="pes-motivo">Motivo da recusa: {r.motivo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
