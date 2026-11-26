import { useState } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmt0, fmt1, fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import {
  useDecidirMedidaWorldSailing,
  useSecaoWorldSailing,
  type DecisaoMedida,
} from "@/lib/api/world-sailing";

const TEXTO_CONFIRMA: Record<DecisaoMedida, { titulo: string; corpo: string; botao: string }> = {
  usar: {
    titulo: "Usar como medida",
    corpo:
      "O peso e a altura informados na World Sailing viram uma medida validada e entram no Class Fit e no gate G1. Isso pode mudar a nota e o score.",
    botao: "Usar como medida",
  },
  dispensar: {
    titulo: "Dispensar sugestão",
    corpo:
      "A sugestão da World Sailing fica de lado e não vira medida. Ela volta a aparecer se o velejador atualizar o perfil.",
    botao: "Dispensar",
  },
};

/**
 * Sugestão de medida do perfil World Sailing (D20), dentro do cartão Class Fit. Peso e altura são
 * autodeclarados: gestor e treinador decidem; o atleta só vê. O IBVAR nunca chega aqui (403).
 */
export function MedidaWorldSailing({
  atletaId,
  comMedida,
}: {
  atletaId: string;
  /** Já existe medida no Class Fit: o bloco ganha título e fica abaixo dos medidores. */
  comMedida: boolean;
}) {
  const secao = useSecaoWorldSailing(atletaId);
  const decidir = useDecidirMedidaWorldSailing(atletaId);
  const [confirmando, setConfirmando] = useState<DecisaoMedida | null>(null);
  const sugestao = secao.data?.medidaSugerida;
  if (!sugestao) return null;

  const valores = [
    sugestao.pesoKg != null ? `${fmt1(sugestao.pesoKg)} kg` : null,
    sugestao.alturaCm != null ? `${fmt0(sugestao.alturaCm)} cm` : null,
  ].filter(Boolean);
  const quando = sugestao.informadoEm ? `em ${fmtData(sugestao.informadoEm)}` : "sem data";

  function confirmar(decisao: DecisaoMedida) {
    decidir.mutate(decisao, {
      onSuccess: () =>
        toast.success(
          decisao === "usar" ? "Medida da World Sailing registrada." : "Sugestão dispensada.",
        ),
      onError: (e) => toast.error(mensagemDeErro(e, "Não foi possível registrar a decisão.")),
      onSettled: () => setConfirmando(null),
    });
  }

  return (
    <section className="medida-ws" aria-labelledby="medida-ws-t">
      <h3 id="medida-ws-t" className="medida-ws-titulo">
        {comMedida ? "Medida informada na World Sailing" : "Sugestão da World Sailing"}
      </h3>
      <p className="medida-ws-valores">
        Informado na World Sailing {quando}: <b>{valores.join(" · ") || "sem valores"}</b>{" "}
        (autodeclarado)
      </p>
      {sugestao.podeDecidir ? (
        <>
          <p className="panel-dica">
            “Usar como medida” vira medida validada e entra no Class Fit e no gate G1.
          </p>
          <div className="btn-row">
            <button type="button" className="btn sm primary" onClick={() => setConfirmando("usar")}>
              Usar como medida
            </button>
            <button type="button" className="btn sm" onClick={() => setConfirmando("dispensar")}>
              Dispensar
            </button>
          </div>
        </>
      ) : (
        <p className="panel-dica">Aguardando o treinador confirmar.</p>
      )}
      {confirmando && (
        <Dialogo
          titulo={TEXTO_CONFIRMA[confirmando].titulo}
          aoFechar={() => setConfirmando(null)}
          bloqueado={decidir.isPending}
        >
          <p style={{ margin: 0 }}>
            {valores.length > 0 ? `${valores.join(" · ")}. ` : ""}
            {TEXTO_CONFIRMA[confirmando].corpo}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              disabled={decidir.isPending}
              onClick={() => setConfirmando(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn primary"
              autoFocus
              disabled={decidir.isPending}
              onClick={() => confirmar(confirmando)}
            >
              {TEXTO_CONFIRMA[confirmando].botao}
            </button>
          </div>
        </Dialogo>
      )}
    </section>
  );
}
