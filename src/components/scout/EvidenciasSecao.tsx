import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  ACEITA_ARQUIVO,
  abrirEvidencia,
  enviarEvidencia,
  useEvidencias,
  validarArquivo,
} from "@/lib/api/evidencias";

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
  aoFechar,
}: {
  atletaId: string;
  indicadores: OpcaoIndicador[];
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [indicadorId, setIndicadorId] = useState("");
  const [erro, setErro] = useState("");

  const enviar = useMutation({
    mutationFn: (a: File) => enviarEvidencia(atletaId, a, indicadorId || undefined),
    onSuccess: async () => {
      toast("Evidência anexada");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["evidencias", atletaId] }),
        queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] }),
      ]);
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível anexar o arquivo.")),
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
    <Dialogo titulo="Anexar evidência" aoFechar={aoFechar}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted ficha-dica">
          PDF, JPG ou PNG, até 5 MB. O arquivo fica em área privada.
        </p>
        <label className="field" htmlFor="evid-arquivo">
          Arquivo
          <input
            id="evid-arquivo"
            type="file"
            accept={ACEITA_ARQUIVO}
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          />
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

/** Evidências anexadas ao atleta. Não deve ser montada para o IBVAR. */
export function EvidenciasSecao({
  atletaId,
  papel,
  indicadores,
}: {
  atletaId: string;
  papel: string;
  indicadores: OpcaoIndicador[];
}) {
  const [anexando, setAnexando] = useState(false);
  const { data, isPending, error } = useEvidencias(atletaId);
  const podeAnexar = papel === "gestor" || papel === "treinador";
  const nomeDe = (id: string | null) => indicadores.find((i) => i.id === id)?.nome ?? "Geral";

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Evidências anexadas</h2>
        {podeAnexar && (
          <button type="button" className="btn" onClick={() => setAnexando(true)}>
            Anexar arquivo
          </button>
        )}
      </div>
      {isPending && <p className="muted">Carregando evidências…</p>}
      {error && (
        <p className="note" role="alert">
          {mensagemDeErro(error)}
        </p>
      )}
      {data && data.anexos.length === 0 && <p className="muted">Nenhuma evidência anexada.</p>}
      {data && data.anexos.length > 0 && (
        <ul className="ficha-evidencias">
          {data.anexos.map((a) => (
            <li key={a.id}>
              <div>
                <i className="ph ph-paperclip" aria-hidden="true" /> <span>{a.nomeArquivo}</span>
                <div className="src muted">
                  {nomeDe(a.indicadorId)} · {fmtData(a.enviadoEm)}
                </div>
              </div>
              <AbrirEvidencia
                id={a.id}
                nomeArquivo={a.nomeArquivo}
                rotulo={`Abrir ${a.nomeArquivo}`}
              >
                Abrir
              </AbrirEvidencia>
            </li>
          ))}
        </ul>
      )}
      {anexando && (
        <AnexarDialogo
          atletaId={atletaId}
          indicadores={indicadores}
          aoFechar={() => setAnexando(false)}
        />
      )}
    </section>
  );
}
