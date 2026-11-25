import { useState } from "react";
import { toast } from "sonner";
import { AbrirEvidencia, VerVideo } from "./EvidenciasSecao";
import { CampoArquivo } from "./CampoArquivo";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmtInstante } from "./formato";
import {
  useAutoavaliacao,
  useEnviarAutoavaliacao,
  type IndicadorAutoavaliacao,
  type ItemAutoavaliacao,
} from "@/lib/api/autoavaliacao";
import { ErroApi, errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { ACEITA_ARQUIVO, validarArquivo } from "@/lib/api/evidencias";
import { mensagemEvidenciaNota, mensagemLinkVideo } from "@/lib/validacao";
import "@/styles/avaliar.css";
import "@/styles/autoavaliacao.css";

const MSG_SEM_CICLO =
  "Não há ciclo de avaliação aberto. Você poderá enviar sua autoavaliação quando o gestor abrir um novo ciclo.";
const EVID_MAX = 500;

interface Rascunho {
  valor?: number;
  evidencia: string;
  link: string;
  arquivo: File | null;
}

export interface PilarSimples {
  id: string;
  nome: string;
}

/**
 * "Minha autoavaliação" (atleta): sugere a nota de 0 a 5 por indicador. A sugestão não entra no
 * score; o treinador aprova ou corrige, e a justificativa dele aparece aqui, com o atalho para
 * pedir revisão. A regra de evidência de cada indicador é conferida pela API (o atleta não lê os
 * parâmetros): o campo vira "obrigatória" quando ela recusa a falta.
 */
export function MinhaAutoavaliacao({
  atletaId,
  pilares,
  aoPedirRevisao,
}: {
  atletaId: string;
  pilares: PilarSimples[];
  aoPedirRevisao: () => void;
}) {
  const consulta = useAutoavaliacao(atletaId);
  const enviar = useEnviarAutoavaliacao(atletaId);
  const [rasc, setRasc] = useState<Record<string, Rascunho>>({});
  const [locais, setLocais] = useState<Record<string, string>>({});
  const [enviados, setEnviados] = useState<string[]>([]);

  if (consulta.isPending) {
    return (
      <section className="panel" aria-labelledby="auto-titulo">
        <h2 id="auto-titulo">Minha autoavaliação</h2>
        <p className="muted" role="status">
          Carregando sua autoavaliação…
        </p>
      </section>
    );
  }
  if (consulta.isError) {
    return (
      <section className="panel" aria-labelledby="auto-titulo">
        <h2 id="auto-titulo">Minha autoavaliação</h2>
        <p className="note" role="alert">
          {mensagemDeErro(consulta.error, "Não foi possível carregar a autoavaliação.")}
        </p>
      </section>
    );
  }

  const { ciclo, indicadores, rubricas } = consulta.data;
  // Escala do pilar, se tiver rubrica própria; senão a geral (`pilarId` nulo).
  const escalaDe = (pilarId: string) =>
    (rubricas.find((r) => r.pilarId === pilarId) ?? rubricas.find((r) => r.pilarId === null))
      ?.notas ?? [];
  const aberto = ciclo?.status === "aberto";
  const nomePilar = (id: string) => pilares.find((p) => p.id === id)?.nome ?? id;
  const grupos: { pilarId: string; itens: IndicadorAutoavaliacao[] }[] = [];
  for (const ind of indicadores) {
    const g = grupos.find((x) => x.pilarId === ind.pilarId);
    if (g) g.itens.push(ind);
    else grupos.push({ pilarId: ind.pilarId, itens: [ind] });
  }

  const valorDe = (ind: IndicadorAutoavaliacao) =>
    rasc[ind.indicadorId]?.valor ?? ind.sugestao?.valor;
  const mudar = (ind: IndicadorAutoavaliacao, parte: Partial<Rascunho>) => {
    if (enviar.isError) enviar.reset();
    setLocais((l) => {
      const resto = { ...l };
      delete resto[ind.indicadorId];
      delete resto[`${ind.indicadorId}:link`];
      return resto;
    });
    setRasc((r) => ({
      ...r,
      [ind.indicadorId]: {
        evidencia: ind.sugestao?.evidencia ?? "",
        link: ind.sugestao?.link ?? "",
        arquivo: null,
        ...r[ind.indicadorId],
        ...parte,
      },
    }));
  };

  // Erros do 400 por campo: "notas.N.campo" aponta para o N-ésimo item enviado.
  const doServidor: Record<string, string> = {};
  if (enviar.isError) {
    for (const [campo, mensagem] of Object.entries(errosPorCampo(enviar.error))) {
      const [raiz, n, resto] = campo.split(".");
      const id = raiz === "notas" && n !== undefined ? enviados[Number(n)] : undefined;
      if (!id) continue;
      const chave = resto === "link" ? `${id}:link` : id;
      if (!(chave in doServidor)) doServidor[chave] = mensagem;
    }
  }
  const erros = { ...doServidor, ...locais };
  const erroGeral =
    enviar.isError && Object.keys(doServidor).length === 0
      ? enviar.error instanceof ErroApi && enviar.error.status === 409
        ? MSG_SEM_CICLO
        : mensagemDeErro(enviar.error, "Não foi possível enviar a autoavaliação.")
      : null;

  const pendentes = indicadores.filter((i) => rasc[i.indicadorId]);

  function enviarTudo() {
    const novosErros: Record<string, string> = {};
    const itens: ItemAutoavaliacao[] = [];
    for (const ind of pendentes) {
      const r = rasc[ind.indicadorId];
      const valor = valorDe(ind);
      if (!r) continue;
      if (valor === undefined) {
        novosErros[ind.indicadorId] = "Escolha a nota, de 0 a 5.";
        continue;
      }
      const evidencia = r.evidencia.trim();
      const falhaEv =
        evidencia === ""
          ? ind.evidencia === "obrigatoria"
            ? "Informe a evidência da nota: este indicador a exige."
            : null
          : mensagemEvidenciaNota(evidencia);
      const falhaLink = mensagemLinkVideo(r.link.trim());
      if (falhaEv) novosErros[ind.indicadorId] = falhaEv;
      if (falhaLink) novosErros[`${ind.indicadorId}:link`] = falhaLink;
      if (!falhaEv && !falhaLink) {
        itens.push({
          indicadorId: ind.indicadorId,
          valor,
          evidencia: r.evidencia,
          link: r.link,
          arquivo: r.arquivo,
        });
      }
    }
    setLocais(novosErros);
    if (Object.keys(novosErros).length > 0 || itens.length === 0) return;
    setEnviados(itens.map((i) => i.indicadorId));
    enviar.mutate(itens, {
      onSuccess: (r) => {
        toast.success(
          `Autoavaliação enviada: ${r.enviadas} ${r.enviadas === 1 ? "indicador" : "indicadores"}.`,
        );
        setRasc({});
      },
    });
  }

  return (
    <section className="panel" aria-labelledby="auto-titulo">
      <div className="panel-head">
        <h2 id="auto-titulo">Minha autoavaliação</h2>
        {ciclo && <span className="muted panel-info">Ciclo {ciclo.nome}</span>}
      </div>
      <p className="panel-dica">
        Sugira a nota de 0 a 5 de cada indicador. Sua sugestão não entra no score: o treinador
        aprova ou corrige, e explica quando a nota muda.
      </p>
      {!aberto && (
        <div className="note" role="status">
          {ciclo
            ? `O ciclo ${ciclo.nome} está fechado. Você poderá enviar uma nova autoavaliação quando o gestor abrir um ciclo.`
            : MSG_SEM_CICLO}
        </div>
      )}
      {indicadores.length === 0 && (
        <p className="muted">Nenhum indicador está liberado para autoavaliação neste momento.</p>
      )}
      {grupos.map((g) => (
        <section key={g.pilarId} className="auto-pilar" aria-labelledby={`auto-p-${g.pilarId}`}>
          <h3 id={`auto-p-${g.pilarId}`}>{nomePilar(g.pilarId)}</h3>
          <EscalaDoPilar nome={nomePilar(g.pilarId)} notas={escalaDe(g.pilarId)} />
          {g.itens.map((ind) => (
            <LinhaAutoavaliacao
              key={ind.indicadorId}
              ind={ind}
              valor={valorDe(ind)}
              rascunho={rasc[ind.indicadorId]}
              editavel={aberto && !enviar.isPending}
              escala={escalaDe(ind.pilarId)}
              erro={erros[ind.indicadorId]}
              erroLink={erros[`${ind.indicadorId}:link`]}
              aoMudar={(parte) => mudar(ind, parte)}
              aoPedirRevisao={aoPedirRevisao}
            />
          ))}
        </section>
      ))}
      {erroGeral && (
        <div className="note" role="alert" style={{ marginTop: 12 }}>
          {erroGeral}
        </div>
      )}
      {aberto && indicadores.length > 0 && (
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn primary"
            disabled={pendentes.length === 0 || enviar.isPending}
            onClick={enviarTudo}
          >
            {enviar.isPending
              ? "Enviando…"
              : pendentes.length > 1
                ? `Enviar ${pendentes.length} sugestões`
                : "Enviar autoavaliação"}
          </button>
        </div>
      )}
    </section>
  );
}

function LinhaAutoavaliacao({
  ind,
  valor,
  rascunho,
  editavel,
  escala,
  erro,
  erroLink,
  aoMudar,
  aoPedirRevisao,
}: {
  ind: IndicadorAutoavaliacao;
  valor: number | undefined;
  rascunho: Rascunho | undefined;
  editavel: boolean;
  escala: { nota: number; descricao: string }[];
  erro: string | undefined;
  erroLink: string | undefined;
  aoMudar: (p: Partial<Rascunho>) => void;
  aoPedirRevisao: () => void;
}) {
  const [erroArquivo, setErroArquivo] = useState("");
  const id = ind.indicadorId;
  const { sugestao, treinador } = ind;
  const corrigida = !!treinador && !!sugestao && treinador.valor !== sugestao.valor;
  const obrigatoria = ind.evidencia === "obrigatoria";
  const descricaoNota =
    valor === undefined ? undefined : escala.find((r) => r.nota === valor)?.descricao;

  return (
    <div className="ed-row auto-linha">
      <div className="lbl">
        {ind.nome}
        {ind.orientacao && (
          <small className="auto-orientacao" id={`auto-orient-${id}`}>
            {ind.orientacao}
          </small>
        )}
        {sugestao ? (
          <small>
            Sua sugestão: {sugestao.valor} · enviada em {fmtInstante(sugestao.em)}
          </small>
        ) : (
          <small>Ainda sem sugestão sua neste ciclo</small>
        )}
        {sugestao && (sugestao.evidencia || sugestao.link || sugestao.anexo) && (
          <div className="auto-enviado">
            {sugestao.evidencia && <span>Evidência: {sugestao.evidencia}</span>}
            {sugestao.link && <VerVideo url={sugestao.link} />}
            {sugestao.anexo && (
              <AbrirEvidencia
                id={sugestao.anexo.id}
                nomeArquivo={sugestao.anexo.nomeArquivo}
                className="ficha-clipe"
              >
                <i className="ph ph-paperclip" aria-hidden="true" />
                <span>{sugestao.anexo.nomeArquivo}</span>
              </AbrirEvidencia>
            )}
          </div>
        )}
        {treinador && (
          <div className="auto-treinador">
            <span>
              <b>Nota do treinador: {treinador.valor}</b>
              {sugestao
                ? corrigida
                  ? ` · corrigiu sua sugestão de ${sugestao.valor}`
                  : " · aprovou sua sugestão"
                : ""}
              {treinador.avaliador ? ` · ${treinador.avaliador.nome}` : ""}
            </span>
            {treinador.justificativa && <span>Justificativa: {treinador.justificativa}</span>}
            {corrigida && (
              <button
                type="button"
                className="btn sm ghost"
                aria-label={`Pedir revisão da nota de ${ind.nome}`}
                onClick={aoPedirRevisao}
              >
                Pedir revisão
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className="seg seg-radio"
        role="radiogroup"
        aria-label={`Sua nota para ${ind.nome}`}
        {...(ind.orientacao ? { "aria-describedby": `auto-orient-${id}` } : {})}
      >
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name={`auto-${id}`}
              value={n}
              checked={valor === n}
              disabled={!editavel}
              onChange={() => aoMudar({ valor: n })}
            />
            {n}
          </label>
        ))}
      </div>
      {descricaoNota && (
        <div className="lbl" style={{ gridColumn: "1 / -1" }}>
          <small>
            Nota {valor}: {descricaoNota}
          </small>
        </div>
      )}
      <MensagemCampo id={`auto-erro-${id}`} texto={erro} />
      {rascunho && (
        <div className="avaliar-evidencia ev">
          <label className="field ev" htmlFor={`auto-ev-${id}`}>
            {obrigatoria ? "Evidência (obrigatória)" : "Evidência (opcional)"}
            <input
              id={`auto-ev-${id}`}
              maxLength={EVID_MAX}
              value={rascunho.evidencia}
              disabled={!editavel}
              {...atributosDoCampo(`auto-erro-${id}`, erro)}
              onChange={(e) => aoMudar({ evidencia: e.target.value })}
            />
          </label>
          <label className="field ev" htmlFor={`auto-link-${id}`}>
            Link do vídeo (opcional)
            <input
              id={`auto-link-${id}`}
              type="url"
              inputMode="url"
              maxLength={EVID_MAX}
              placeholder="https://"
              autoComplete="off"
              value={rascunho.link}
              disabled={!editavel}
              {...atributosDoCampo(`auto-link-erro-${id}`, erroLink)}
              onChange={(e) => aoMudar({ link: e.target.value })}
            />
          </label>
          <MensagemCampo id={`auto-link-erro-${id}`} texto={erroLink} />
          <CampoArquivo
            id={`auto-anexo-${id}`}
            rotulo={`Anexar evidência de ${ind.nome} (opcional)`}
            accept={ACEITA_ARQUIVO}
            textoBotao="Anexar evidência"
            contexto={ind.nome}
            dica="Opcional · PDF, JPG ou PNG, até 5 MB"
            arquivo={rascunho.arquivo}
            desabilitado={!editavel}
            aoEscolher={(f) => {
              if (!f) {
                setErroArquivo("");
                return aoMudar({ arquivo: null });
              }
              const recusa = validarArquivo(f);
              setErroArquivo(recusa ?? "");
              if (!recusa) aoMudar({ arquivo: f });
            }}
          />
          {erroArquivo && (
            <span className="avaliar-erro-campo" role="alert">
              {erroArquivo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Escala de 0 a 5 do pilar (rubrica própria ou a geral), para o atleta saber o que cada nota quer dizer. */
function EscalaDoPilar({
  nome,
  notas,
}: {
  nome: string;
  notas: { nota: number; descricao: string }[];
}) {
  if (notas.length === 0) return null;
  return (
    <details className="auto-escala">
      <summary>Escala de notas de {nome}</summary>
      <dl>
        {[...notas]
          .sort((a, b) => a.nota - b.nota)
          .map((r) => (
            <div key={r.nota}>
              <dt>Nota {r.nota}</dt>
              <dd>{r.descricao}</dd>
            </div>
          ))}
      </dl>
    </details>
  );
}
