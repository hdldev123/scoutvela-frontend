import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CampoArquivo } from "./CampoArquivo";
import { AbrirEvidencia } from "./EvidenciasSecao";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmtInstante } from "./formato";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  ANO_MIN_CONQUISTA,
  ROTULO_STATUS_CONQUISTA,
  TITULO_CONQUISTA,
  useConquistas,
  useRegistrarConquista,
  type ConquistaManual,
} from "@/lib/api/conquistas";
import { ACEITA_ARQUIVO, validarArquivo } from "@/lib/api/evidencias";
import "@/styles/autoavaliacao.css";

type Erros = Partial<Record<"titulo" | "ano" | "anexoId", string>>;

/**
 * "Minhas conquistas" (atleta, D14): título, ano e comprovante. Os pódios dos resultados validados
 * entram sozinhos no perfil; esta lista é só das conquistas informadas à mão, que dependem da
 * validação do treinador ou do gestor.
 */
export function MinhasConquistas({ atletaId }: { atletaId: string }) {
  const lista = useConquistas(atletaId);
  const registrar = useRegistrarConquista(atletaId);
  const [titulo, setTitulo] = useState("");
  const [ano, setAno] = useState("");
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [geral, setGeral] = useState("");
  const limpar = (k: keyof Erros) => {
    setErros((e) => ({ ...e, [k]: undefined }));
    setGeral("");
  };

  function submeter(ev: FormEvent) {
    ev.preventDefault();
    if (registrar.isPending) return;
    const anoAtual = new Date().getFullYear();
    const e: Erros = {};
    const t = titulo.trim();
    if (t.length < TITULO_CONQUISTA.min || t.length > TITULO_CONQUISTA.max) {
      e.titulo = `O título precisa ter de ${TITULO_CONQUISTA.min} a ${TITULO_CONQUISTA.max} caracteres.`;
    }
    const n = /^\d{4}$/.test(ano.trim()) ? Number(ano.trim()) : null;
    if (n === null || n < ANO_MIN_CONQUISTA || n > anoAtual) {
      e.ano = `Informe o ano, de ${ANO_MIN_CONQUISTA} a ${anoAtual}.`;
    }
    if (!comprovante) e.anexoId = "Anexe o comprovante da conquista.";
    else {
      const recusa = validarArquivo(comprovante);
      if (recusa) e.anexoId = recusa;
    }
    setErros(e);
    if (Object.keys(e).length > 0 || !comprovante || n === null) return;
    registrar.mutate(
      { titulo: t, ano: n, comprovante },
      {
        onSuccess: () => {
          toast.success("Conquista enviada. Seu treinador vai validar o comprovante.");
          setTitulo("");
          setAno("");
          setComprovante(null);
          setErros({});
          setGeral("");
        },
        onError: (err) => {
          const campos = errosPorCampo(err);
          setErros({
            ...(campos["titulo"] ? { titulo: campos["titulo"] } : {}),
            ...(campos["ano"] ? { ano: campos["ano"] } : {}),
            ...(campos["anexoId"] ? { anexoId: campos["anexoId"] } : {}),
          });
          setGeral(
            Object.keys(campos).length === 0
              ? mensagemDeErro(err, "Não foi possível enviar a conquista.")
              : "",
          );
        },
      },
    );
  }

  const manuais = lista.data?.manuais ?? [];
  return (
    <section className="panel" aria-labelledby="conq-titulo">
      <div className="panel-head">
        <h2 id="conq-titulo">Minhas conquistas</h2>
      </div>
      <p className="panel-dica">
        Os pódios dos seus resultados validados entram sozinhos no seu perfil. Para uma conquista
        que não está nos resultados, informe o título, o ano e anexe o comprovante (PDF, JPG ou
        PNG). Ela só aparece no perfil depois que seu treinador validar.
      </p>
      <form className="res-form" onSubmit={submeter} noValidate>
        <div className="res-campos">
          <div>
            <label className="field" htmlFor="conq-titulo-campo">
              Título da conquista
              <input
                id="conq-titulo-campo"
                maxLength={TITULO_CONQUISTA.max}
                autoComplete="off"
                value={titulo}
                disabled={registrar.isPending}
                {...atributosDoCampo("conq-titulo-erro", erros.titulo)}
                onChange={(e) => {
                  limpar("titulo");
                  setTitulo(e.target.value);
                }}
              />
            </label>
            <MensagemCampo id="conq-titulo-erro" texto={erros.titulo} />
          </div>
          <div>
            <label className="field" htmlFor="conq-ano">
              Ano
              <input
                id="conq-ano"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={ano}
                disabled={registrar.isPending}
                {...atributosDoCampo("conq-ano-erro", erros.ano)}
                onChange={(e) => {
                  limpar("ano");
                  setAno(e.target.value);
                }}
              />
            </label>
            <MensagemCampo id="conq-ano-erro" texto={erros.ano} />
          </div>
        </div>
        <div>
          <CampoArquivo
            id="conq-comprovante"
            rotulo="Comprovante da conquista"
            accept={ACEITA_ARQUIVO}
            textoBotao="Anexar comprovante"
            dica="PDF, JPG ou PNG, até 5 MB"
            arquivo={comprovante}
            desabilitado={registrar.isPending}
            aoEscolher={(f) => {
              limpar("anexoId");
              if (!f) return setComprovante(null);
              const recusa = validarArquivo(f);
              if (recusa) {
                setComprovante(null);
                return setErros((x) => ({ ...x, anexoId: recusa }));
              }
              setComprovante(f);
            }}
          />
          <MensagemCampo id="conq-anexoId-erro" texto={erros.anexoId} />
        </div>
        {geral && (
          <div className="note" role="alert">
            {geral}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={registrar.isPending}>
            {registrar.isPending ? "Enviando…" : "Registrar conquista"}
          </button>
        </div>
      </form>
      <ListaManuais itens={manuais} carregando={lista.isPending} erro={lista.error} />
    </section>
  );
}

function ListaManuais({
  itens,
  carregando,
  erro,
}: {
  itens: ConquistaManual[];
  carregando: boolean;
  erro: unknown;
}) {
  if (carregando) {
    return (
      <p className="muted" role="status">
        Carregando conquistas…
      </p>
    );
  }
  if (erro) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(erro, "Não foi possível carregar as conquistas.")}
      </p>
    );
  }
  if (itens.length === 0) return <p className="muted">Você ainda não registrou conquistas.</p>;
  return (
    <>
      <h3 style={{ margin: "14px 0 0", fontSize: "1rem" }}>Conquistas registradas</h3>
      <ul className="pes-lista">
        {itens.map((c) => {
          const st = ROTULO_STATUS_CONQUISTA[c.status];
          return (
            <li key={c.id}>
              <span className="pes-peso">
                {c.titulo} · {c.ano}
              </span>
              <span className={`pill ${st.classe}`}>{st.rotulo}</span>
              {c.decididoPor && c.decididoEm && (
                <span className="muted">
                  por {c.decididoPor.nome} em {fmtInstante(c.decididoEm)}
                </span>
              )}
              <AbrirEvidencia id={c.anexoId} nomeArquivo="comprovante" className="ficha-clipe">
                <i className="ph ph-paperclip" aria-hidden="true" />
                <span>Ver comprovante</span>
              </AbrirEvidencia>
              {c.status === "recusada" && c.motivo && (
                <span className="pes-motivo">Motivo da recusa: {c.motivo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
