import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { mensagemDeErro } from "@/lib/api/cliente";
import { localParaIso, usePublicarTermo, useTermos, type VersaoTermo } from "@/lib/api/termos";

const MIN_TEXTO = 50;

const fmtDia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function situacao(v: VersaoTermo): string {
  if (v.vigente) return "Vigente";
  if (v.futura) return `Agendada para ${fmtDia(v.vigenteDesde)}`;
  return "Anterior";
}

/** Versões do termo de consentimento e publicação de nova versão (gestor). */
export function SecaoTermos() {
  const q = useTermos();
  const [aberto, setAberto] = useState(false);

  return (
    <section className="panel" aria-labelledby="par-termo-t">
      <div className="panel-head">
        <h2 id="par-termo-t">Termo de consentimento</h2>
        <button type="button" className="btn primary" onClick={() => setAberto(true)}>
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
        <p className="muted">Nenhuma versão publicada.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Título</th>
                <th>Vigente desde</th>
                <th>Situação</th>
                <th className="r">Aceites</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((v) => (
                <tr key={v.versao}>
                  <td>{v.versao}</td>
                  <td>{v.titulo}</td>
                  <td>{fmtDia(v.vigenteDesde)}</td>
                  <td>{situacao(v)}</td>
                  <td className="r">{v.aceites}</td>
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
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");

  const valido =
    versao.trim() !== "" &&
    titulo.trim() !== "" &&
    texto.trim().length >= MIN_TEXTO &&
    vigencia !== "";

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
          <label className="field" htmlFor="termo-versao">
            Versão
            <input
              id="termo-versao"
              type="text"
              maxLength={40}
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
              required
            />
          </label>
          <label className="field" htmlFor="termo-titulo">
            Título
            <input
              id="termo-titulo"
              type="text"
              maxLength={200}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </label>
          <label className="field" htmlFor="termo-texto">
            Texto
            <textarea
              id="termo-texto"
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-describedby="termo-texto-ajuda"
              required
            />
          </label>
          <p id="termo-texto-ajuda" className="muted" style={{ margin: 0 }}>
            Mínimo de {MIN_TEXTO} caracteres ({texto.trim().length} agora).
          </p>
          <label className="field" htmlFor="termo-vigencia">
            Vigente a partir de
            <input
              id="termo-vigencia"
              type="datetime-local"
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
              required
            />
          </label>
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
