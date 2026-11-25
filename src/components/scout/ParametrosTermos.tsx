import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtInstante } from "./formato";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { LIMITES } from "@/lib/validacao";
import { localParaIso, usePublicarTermo, useTermos, type VersaoTermo } from "@/lib/api/termos";

const MIN_TEXTO = 50;
const MIN_TITULO = LIMITES.termoTitulo.min;
const ANTECEDENCIA_MIN = 5;

const fmtDia = fmtInstante;

const dois = (n: number) => String(n).padStart(2, "0");

/** Data local no formato do `datetime-local` ("2026-12-01T09:05"), a partir de um instante. */
function paraLocal(d: Date): string {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

function situacao(v: VersaoTermo): { texto: string; tom: string } {
  if (v.vigente) return { texto: "Vigente", tom: "st-apto" };
  if (v.futura) return { texto: `Agendada para ${fmtDia(v.vigenteDesde)}`, tom: "st-info" };
  return { texto: "Anterior", tom: "st-neutro" };
}

/** Versões do termo de consentimento e publicação de nova versão (gestor). */
export function SecaoTermos() {
  const q = useTermos();
  const [aberto, setAberto] = useState(false);

  return (
    <section className="panel" aria-labelledby="par-termo-t">
      <div className="panel-head">
        <h2 id="par-termo-t">Termo de consentimento</h2>
        <button type="button" className="btn sm primary" onClick={() => setAberto(true)}>
          Publicar nova versão
        </button>
      </div>
      {q.isPending ? (
        <p className="muted" role="status">
          Carregando versões do termo…
        </p>
      ) : q.isError ? (
        <p className="par-erro" role="alert">
          {mensagemDeErro(q.error)}
        </p>
      ) : q.data.length === 0 ? (
        <EstadoVazio icone="file-text" titulo="Nenhuma versão publicada" />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de versões do termo, role para ver todas as colunas"
        >
          <table className="data interativa">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Título</th>
                <th>Vigente desde</th>
                <th>Situação</th>
                <th>Foto e mini bio</th>
                <th className="num">Aceites</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((v) => (
                <tr key={v.versao}>
                  <td className="nw">{v.versao}</td>
                  <td>{v.titulo}</td>
                  <td className="nw">{fmtDia(v.vigenteDesde)}</td>
                  <td className="nw">
                    <span className={`pill ${situacao(v).tom}`}>{situacao(v).texto}</span>
                  </td>
                  <td className="nw">{v.incluiFotoBio ? "Inclui" : "Não inclui"}</td>
                  <td className="num">{v.aceites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {aberto && <DialogoNovoTermo aoFechar={() => setAberto(false)} />}
    </section>
  );
}

function DialogoNovoTermo({ aoFechar }: { aoFechar: () => void }) {
  const publicar = usePublicarTermo();
  const [versao, setVersao] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [incluiFotoBio, setIncluiFotoBio] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const doServidor = errosPorCampo(publicar.error);
  // Instante de referência da montagem: o servidor recusa vigência no passado.
  const [agora] = useState(() => new Date());
  const minimoLocal = paraLocal(agora);

  const tamanhoTexto = texto.trim().length;
  const falhaTitulo =
    titulo.trim() !== "" && titulo.trim().length < MIN_TITULO
      ? `O título precisa ter ao menos ${MIN_TITULO} caracteres.`
      : null;
  const falhaTexto =
    tamanhoTexto > LIMITES.termoTextoMax
      ? `O texto pode ter no máximo ${LIMITES.termoTextoMax.toLocaleString("pt-BR")} caracteres.`
      : null;
  const falhaVigencia =
    vigencia !== "" && new Date(vigencia).getTime() < Date.now() - 60_000
      ? "A vigência não pode estar no passado."
      : null;
  const msgTitulo = falhaTitulo ?? doServidor["titulo"];
  const msgTexto = falhaTexto ?? doServidor["texto"];
  const msgVigencia = falhaVigencia ?? doServidor["vigenteDesde"];
  const msgVersao = doServidor["versao"];

  const valido =
    versao.trim() !== "" &&
    titulo.trim().length >= MIN_TITULO &&
    tamanhoTexto >= MIN_TEXTO &&
    tamanhoTexto <= LIMITES.termoTextoMax &&
    vigencia !== "" &&
    !falhaVigencia;

  const limparErro = () => {
    if (publicar.isError) publicar.reset();
    setErro("");
  };

  const revisar = (e: FormEvent) => {
    e.preventDefault();
    if (valido) setConfirmando(true);
  };

  const enviar = () => {
    setErro("");
    publicar.mutate(
      {
        versao: versao.trim(),
        titulo: titulo.trim(),
        texto: texto.trim(),
        vigenteDesde: localParaIso(vigencia),
        incluiFotoBio,
      },
      {
        onSuccess: () => {
          toast.success(`Versão ${versao.trim()} do termo publicada.`);
          aoFechar();
        },
        onError: (err) => {
          setErro(mensagemDeErro(err));
          setConfirmando(false);
        },
      },
    );
  };

  return (
    <Dialogo titulo="Publicar nova versão do termo" aoFechar={aoFechar}>
      {confirmando ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="note" role="note">
            Quando esta versão entrar em vigor, os atletas que aceitaram só a versão anterior passam
            a ter aceite pendente. Se a regra TERMO_EXIGE_REACEITE estiver ativa, eles saem do
            ranking até aceitar.
          </div>
          {incluiFotoBio && (
            <div className="note" role="note">
              Esta versão inclui foto e mini bio para o IBVAR. O investidor só vê foto e mini bio de
              quem consentiu com o IBVAR e aceitou esta versão (ou outra que as inclua).
            </div>
          )}
          <p>
            Versão <strong>{versao.trim()}</strong>, vigente a partir de{" "}
            {new Date(vigencia).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            .
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              onClick={enviar}
              disabled={publicar.isPending}
            >
              {publicar.isPending ? "Publicando…" : "Confirmar e publicar"}
            </button>
            <button type="button" className="btn" onClick={() => setConfirmando(false)}>
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <form className="stack" style={{ gap: 12 }} onSubmit={revisar} noValidate>
          <div>
            <label className="field" htmlFor="termo-versao">
              Versão
              <input
                id="termo-versao"
                type="text"
                maxLength={40}
                value={versao}
                {...atributosDoCampo("termo-versao-erro", msgVersao)}
                onChange={(e) => {
                  limparErro();
                  setVersao(e.target.value);
                }}
                required
              />
            </label>
            <MensagemCampo id="termo-versao-erro" texto={msgVersao} />
          </div>
          <div>
            <label className="field" htmlFor="termo-titulo">
              Título
              <input
                id="termo-titulo"
                type="text"
                maxLength={200}
                value={titulo}
                {...atributosDoCampo("termo-titulo-erro", msgTitulo)}
                onChange={(e) => {
                  limparErro();
                  setTitulo(e.target.value);
                }}
                required
              />
            </label>
            <MensagemCampo id="termo-titulo-erro" texto={msgTitulo} />
          </div>
          <div>
            <label className="field" htmlFor="termo-texto">
              Texto
              <textarea
                id="termo-texto"
                rows={8}
                value={texto}
                onChange={(e) => {
                  limparErro();
                  setTexto(e.target.value);
                }}
                aria-invalid={!!msgTexto}
                aria-describedby={
                  msgTexto ? "termo-texto-erro termo-texto-ajuda" : "termo-texto-ajuda"
                }
                required
              />
            </label>
            <MensagemCampo id="termo-texto-erro" texto={msgTexto} />
          </div>
          <p id="termo-texto-ajuda" className="muted" style={{ margin: 0 }}>
            De {MIN_TEXTO} a {LIMITES.termoTextoMax.toLocaleString("pt-BR")} caracteres (
            {tamanhoTexto.toLocaleString("pt-BR")} agora).
          </p>
          <div>
            <label className="field" htmlFor="termo-vigencia">
              Vigente a partir de
              <input
                id="termo-vigencia"
                type="datetime-local"
                min={minimoLocal}
                value={vigencia}
                {...atributosDoCampo("termo-vigencia-erro", msgVigencia)}
                onChange={(e) => {
                  limparErro();
                  setVigencia(e.target.value);
                }}
                required
              />
            </label>
            <MensagemCampo id="termo-vigencia-erro" texto={msgVigencia} />
            <button
              type="button"
              className="btn sm ghost"
              style={{ marginTop: 6 }}
              onClick={() => {
                limparErro();
                setVigencia(paraLocal(new Date(Date.now() + ANTECEDENCIA_MIN * 60_000)));
              }}
            >
              A partir de agora (em {ANTECEDENCIA_MIN} minutos)
            </button>
          </div>
          <div>
            <label className="par-check" htmlFor="termo-foto-bio">
              <input
                id="termo-foto-bio"
                type="checkbox"
                checked={incluiFotoBio}
                aria-describedby="termo-foto-bio-ajuda"
                onChange={(e) => {
                  limparErro();
                  setIncluiFotoBio(e.target.checked);
                }}
              />{" "}
              Este termo inclui foto e mini bio para o IBVAR
            </label>
            <p id="termo-foto-bio-ajuda" className="muted" style={{ margin: "4px 0 0" }}>
              Marque só se o texto acima cita foto e mini bio entre o que vai ao IBVAR. O IBVAR
              passa a ver foto e mini bio apenas de quem consentiu com ele e aceitou uma versão
              marcada assim. Quem não aceitar esta versão continua sem foto e sem mini bio para o
              IBVAR.
            </p>
          </div>
          {erro && (
            <div className="note" role="alert">
              {erro}
            </div>
          )}
          <div className="btn-row">
            <button type="submit" className="btn primary" disabled={!valido}>
              Revisar e publicar
            </button>
            <button type="button" className="btn" onClick={aoFechar}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Dialogo>
  );
}
