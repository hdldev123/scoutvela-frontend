import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { atributosDoCampo } from "./campo-util";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { usePedirRecurso } from "@/lib/api/revisoes";

const MAX = 1000;

/** Diálogo "Discordar da resposta": o recurso leva o pedido à gestão da CBVela (2ª instância). */
export function RecursoRevisaoDialog({
  revisaoId,
  aoFechar,
}: {
  revisaoId: string;
  aoFechar: () => void;
}) {
  const recurso = usePedirRecurso();
  const [texto, setTexto] = useState("");
  const tamanho = texto.trim().length;
  const msg = errosPorCampo(recurso.error)["texto"];
  const erro = recurso.isError && !msg ? mensagemDeErro(recurso.error) : "";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (tamanho === 0 || recurso.isPending) return;
    recurso.mutate(
      { id: revisaoId, texto: texto.trim() },
      {
        onSuccess: () => {
          toast.success("Recurso enviado à gestão da CBVela.");
          aoFechar();
        },
      },
    );
  };

  return (
    <Dialogo titulo="Discordar da resposta" aoFechar={aoFechar} bloqueado={recurso.isPending}>
      <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
        <p className="muted" style={{ margin: 0 }}>
          O pedido vai para a gestão da CBVela, que dá a resposta final. Você pode discordar uma vez
          por pedido.
        </p>
        <div>
          <label className="field" htmlFor="recurso-texto">
            Por que você discorda da resposta?
            <textarea
              id="recurso-texto"
              rows={5}
              value={texto}
              maxLength={MAX}
              required
              autoFocus
              onChange={(e) => setTexto(e.target.value)}
              {...atributosDoCampo("recurso-texto-erro", msg)}
            />
          </label>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: ".82rem" }} aria-live="polite">
            {tamanho} de {MAX} caracteres
          </p>
          <MensagemCampo id="recurso-texto-erro" texto={msg} />
        </div>
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        <div className="btn-row">
          <button
            type="submit"
            className="btn primary"
            disabled={recurso.isPending || tamanho === 0}
          >
            {recurso.isPending ? "Enviando…" : "Enviar recurso"}
          </button>
          <button type="button" className="btn" disabled={recurso.isPending} onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
