import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { MAX_MENSAGEM_AJUSTE, useCriarPedidoAjuste } from "@/lib/api/avisos";

export interface OpcaoPilarAjuste {
  id: string;
  nome: string;
  indicadores: { id: string; nome: string }[];
}

/**
 * "Pedir ajuste" (gestor e treinador do atleta): indicador opcional e mensagem de até 300
 * caracteres. O atleta recebe o aviso no sino e no painel; sem conta de login, o pedido fica só
 * registrado e a tela avisa.
 */
export function PedirAjusteDialog({
  atletaId,
  atletaNome,
  pilares,
  aoFechar,
}: {
  atletaId: string;
  atletaNome: string;
  pilares: OpcaoPilarAjuste[];
  aoFechar: () => void;
}) {
  const criar = useCriarPedidoAjuste(atletaId);
  const [indicadorId, setIndicadorId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const [semConta, setSemConta] = useState(false);
  const doServidor = errosPorCampo(criar.error);
  const erroMensagem = local ?? doServidor["mensagem"];
  const erroIndicador = doServidor["indicadorId"];
  const outroErro =
    criar.error && !erroMensagem && !erroIndicador ? mensagemDeErro(criar.error) : null;

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = mensagem.trim();
    if (!texto) return setLocal("Informe a mensagem.");
    setLocal(undefined);
    criar.mutate(
      { mensagem: texto, ...(indicadorId ? { indicadorId } : {}) },
      {
        onSuccess: (r) => {
          if (r.avisoEnviado) {
            toast.success(`Pedido de ajuste enviado a ${atletaNome}.`);
            aoFechar();
          } else {
            setSemConta(true);
          }
        },
      },
    );
  }

  if (semConta) {
    return (
      <Dialogo titulo="Pedido de ajuste registrado" aoFechar={aoFechar}>
        <p className="note" role="status">
          O atleta ainda não tem conta; o pedido ficou registrado e ele não recebeu aviso.
        </p>
        <div className="btn-row">
          <button type="button" className="btn primary" autoFocus onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </Dialogo>
    );
  }

  return (
    <Dialogo titulo="Pedir ajuste" aoFechar={aoFechar} bloqueado={criar.isPending}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted" style={{ margin: 0 }}>
          {atletaNome} recebe o pedido no sino e no painel.
        </p>
        <div>
          <label className="field" htmlFor="aj-indicador">
            Indicador (opcional)
            <select
              id="aj-indicador"
              autoFocus
              value={indicadorId}
              {...atributosDoCampo("aj-indicador-erro", erroIndicador)}
              onChange={(e) => setIndicadorId(e.target.value)}
            >
              <option value="">Perfil ou algo geral</option>
              {pilares
                .filter((p) => p.indicadores.length > 0)
                .map((p) => (
                  <optgroup key={p.id} label={p.nome}>
                    {p.indicadores.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>
          <MensagemCampo id="aj-indicador-erro" texto={erroIndicador} />
        </div>
        <div>
          <label className="field" htmlFor="aj-mensagem">
            Mensagem
            <textarea
              id="aj-mensagem"
              rows={4}
              maxLength={MAX_MENSAGEM_AJUSTE}
              value={mensagem}
              placeholder="Ex.: você preencheu tática diferente do que o treino mostrou, revise."
              aria-describedby={
                erroMensagem ? "aj-mensagem-erro aj-mensagem-cont" : "aj-mensagem-cont"
              }
              aria-invalid={!!erroMensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </label>
          <div className="aj-contador" id="aj-mensagem-cont">
            {mensagem.length} de {MAX_MENSAGEM_AJUSTE} caracteres
          </div>
          <MensagemCampo id="aj-mensagem-erro" texto={erroMensagem} />
        </div>
        {outroErro && (
          <p className="note" role="alert">
            {outroErro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={criar.isPending}>
            {criar.isPending ? "Enviando…" : "Enviar pedido"}
          </button>
          <button type="button" className="btn" onClick={aoFechar} disabled={criar.isPending}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
