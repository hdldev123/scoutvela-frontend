import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CampoArquivo } from "./CampoArquivo";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtInstante } from "./formato";
import { ErroApi, mensagemDeErro } from "@/lib/api/cliente";
import {
  ACEITA_ARQUIVO,
  CATEGORIAS,
  ROTULO_PAPEL,
  abrirEvidencia,
  enviarEvidencia,
  fmtMb,
  removerAnexo,
  useEvidencias,
  validarArquivo,
  type CategoriaAnexo,
  type ListaEvidencias,
} from "@/lib/api/evidencias";

type Anexo = ListaEvidencias["anexos"][number];

/** Link de vídeo informado na nota: abre em nova aba, sem repassar a origem nem o opener. */
export function VerVideo({ url, className = "ficha-clipe" }: { url: string; className?: string }) {
  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver vídeo (abre em nova aba)"
    >
      <i className="ph ph-video" aria-hidden="true" />
      <span>Ver vídeo</span>
      <i className="ph ph-arrow-square-out" aria-hidden="true" />
    </a>
  );
}

export interface OpcaoIndicador {
  id: string;
  nome: string;
}

/** Botão que abre uma evidência (link assinado da API). */
export function AbrirEvidencia({
  id,
  nomeArquivo,
  className = "btn",
  rotulo,
  children,
}: {
  id: string;
  nomeArquivo: string;
  className?: string;
  rotulo?: string;
  children: React.ReactNode;
}) {
  const [abrindo, setAbrindo] = useState(false);
  async function abrir() {
    setAbrindo(true);
    try {
      await abrirEvidencia(id, nomeArquivo);
    } catch (e) {
      toast.error(mensagemDeErro(e, "Não foi possível abrir a evidência."));
    } finally {
      setAbrindo(false);
    }
  }
  return (
    <button
      type="button"
      className={className}
      disabled={abrindo}
      aria-label={rotulo}
      onClick={() => void abrir()}
    >
      {children}
    </button>
  );
}

function AnexarDialogo({
  atletaId,
  indicadores,
  cotaBytes,
  aoFechar,
}: {
  atletaId: string;
  indicadores: OpcaoIndicador[];
  cotaBytes: number | undefined;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [indicadorId, setIndicadorId] = useState("");
  const [categoria, setCategoria] = useState<CategoriaAnexo>("evidencia");
  const [erro, setErro] = useState("");

  const enviar = useMutation({
    mutationFn: (a: File) => enviarEvidencia(atletaId, a, indicadorId || undefined, categoria),
    onSuccess: async () => {
      toast("Arquivo anexado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] }),
      ]);
      aoFechar();
    },
    onError: (e) =>
      setErro(
        e instanceof ErroApi && (e.status === 413 || e.codigo === "cota_excedida")
          ? `A cota de ${cotaBytes ? fmtMb(cotaBytes) : "200"} MB de anexos foi atingida. Remova um anexo que não esteja ligado a uma nota e tente de novo.`
          : mensagemDeErro(e, "Não foi possível anexar o arquivo."),
      ),
  });

  function escolher(a: File | null) {
    setArquivo(a);
    setErro(a ? (validarArquivo(a) ?? "") : "");
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) return setErro("Escolha um arquivo PDF, JPG ou PNG.");
    const recusa = validarArquivo(arquivo);
    if (recusa) return setErro(recusa);
    setErro("");
    enviar.mutate(arquivo);
  }

  return (
    <Dialogo titulo="Anexar arquivo" aoFechar={aoFechar} bloqueado={enviar.isPending}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted ficha-dica">
          PDF, JPG ou PNG, até 5 MB. O arquivo fica em área privada.
        </p>
        <CampoArquivo
          id="evid-arquivo"
          rotulo="Arquivo"
          accept={ACEITA_ARQUIVO}
          arquivo={arquivo}
          dica="Nenhum arquivo escolhido"
          aoEscolher={(a) => escolher(a ?? null)}
        />
        <label className="field" htmlFor="evid-categoria">
          Categoria
          <select
            id="evid-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaAnexo)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="evid-indicador">
          Indicador (opcional)
          <select
            id="evid-indicador"
            value={indicadorId}
            onChange={(e) => setIndicadorId(e.target.value)}
          >
            <option value="">Sem indicador específico</option>
            {indicadores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={enviar.isPending}>
            {enviar.isPending ? "Enviando…" : "Enviar arquivo"}
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

function RemoverDialogo({
  anexo,
  atletaId,
  aoFechar,
}: {
  anexo: Anexo;
  atletaId: string;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState("");
  const remover = useMutation({
    mutationFn: () => removerAnexo(anexo.id),
    onSuccess: async () => {
      toast("Anexo removido");
      await queryClient.invalidateQueries({ queryKey: ["evidencias", atletaId] });
      aoFechar();
    },
    onError: (e) =>
      setErro(
        e instanceof ErroApi && e.status === 409
          ? "Este anexo está ligado a uma nota e não pode ser removido."
          : mensagemDeErro(e, "Não foi possível remover o anexo."),
      ),
  });
  return (
    <Dialogo titulo="Remover anexo" aoFechar={aoFechar} bloqueado={remover.isPending}>
      <div className="stack">
        <p>
          Remover <b>{anexo.nomeArquivo}</b>? O arquivo é apagado e a ação não pode ser desfeita.
        </p>
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn primary"
            disabled={remover.isPending}
            onClick={() => {
              setErro("");
              remover.mutate();
            }}
          >
            {remover.isPending ? "Removendo…" : "Remover anexo"}
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </div>
    </Dialogo>
  );
}

/** Pasta de documentos do atleta, por categoria. Não deve ser montada para o IBVAR. */
export function EvidenciasSecao({
  atletaId,
  papel,
  indicadores,
  className = "",
}: {
  atletaId: string;
  papel: string;
  indicadores: OpcaoIndicador[];
  className?: string;
}) {
  const [anexando, setAnexando] = useState(false);
  const [removendo, setRemovendo] = useState<Anexo | null>(null);
  const { data, isPending, error } = useEvidencias(atletaId);
  const nomeDe = (id: string | null) => indicadores.find((i) => i.id === id)?.nome ?? "Geral";
  const anexos = (data?.anexos ?? []).filter((a) => a.removidoEm == null);

  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-head">
        <h2>Documentos</h2>
        <button type="button" className="btn sm" onClick={() => setAnexando(true)}>
          Anexar arquivo
        </button>
      </div>
      {data && (
        <p className="muted ficha-dica" aria-live="polite">
          Cota de anexos: {fmtMb(data.usoBytes)} MB de {fmtMb(data.cotaBytes)} MB
        </p>
      )}
      {isPending && <p className="muted">Carregando documentos…</p>}
      {error && (
        <p className="note" role="alert">
          {mensagemDeErro(error)}
        </p>
      )}
      {data && anexos.length === 0 && (
        <div className="vazio-compacto">
          <EstadoVazio icone="paperclip" titulo="Nenhum documento anexado" />
        </div>
      )}
      {CATEGORIAS.map((cat) => {
        const doGrupo = anexos.filter((a) => a.categoria === cat.id);
        if (doGrupo.length === 0) return null;
        return (
          <div key={cat.id} className="ficha-docs-grupo">
            <h3 className="ficha-docs-titulo">
              {cat.rotulo} <span className="muted">({doGrupo.length})</span>
            </h3>
            <ul className="ficha-evidencias">
              {doGrupo.map((a) => (
                <li key={a.id}>
                  <div>
                    <i className="ph ph-paperclip" aria-hidden="true" />{" "}
                    <span>{a.nomeArquivo}</span>
                    <div className="src muted">
                      {nomeDe(a.indicadorId)} · enviado por{" "}
                      {papel === "atleta" && a.enviadoPor.papel === "atleta"
                        ? "você"
                        : ROTULO_PAPEL[a.enviadoPor.papel]}{" "}
                      · {fmtInstante(a.enviadoEm)} · {fmtMb(a.tamanhoBytes)} MB
                    </div>
                  </div>
                  <div className="btn-row">
                    <AbrirEvidencia
                      id={a.id}
                      nomeArquivo={a.nomeArquivo}
                      rotulo={`Abrir ${a.nomeArquivo}`}
                      className="btn sm"
                    >
                      Abrir
                    </AbrirEvidencia>
                    {papel === "atleta" && a.enviadoPor.papel === "atleta" && (
                      <button
                        type="button"
                        className="btn sm"
                        aria-label={`Remover ${a.nomeArquivo}`}
                        onClick={() => setRemovendo(a)}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {anexando && (
        <AnexarDialogo
          atletaId={atletaId}
          indicadores={indicadores}
          cotaBytes={data?.cotaBytes}
          aoFechar={() => setAnexando(false)}
        />
      )}
      {removendo && (
        <RemoverDialogo anexo={removendo} atletaId={atletaId} aoFechar={() => setRemovendo(null)} />
      )}
    </section>
  );
}
