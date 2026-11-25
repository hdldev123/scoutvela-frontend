import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Interruptor } from "./Interruptor";
import { MensagemCampo } from "./MensagemCampo";
import { MSG_SALVO } from "./parametros-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros, type Parametros } from "@/lib/api/parametros";

type Regra = "obrigatoria" | "opcional";
type IndicadorParam = Parametros["pilares"][number]["indicadores"][number];

/** Indicadores com nota lançada por pessoa (os de registro e os calculados não têm evidência própria). */
const comEvidencia = (i: IndicadorParam) => i.tipo !== "R" && !i.calculado;

/** Só indicadores de nota do treinador (tipo T, não calculados) aceitam autoavaliação (D9). */
const aceitaAutoavaliacao = (i: IndicadorParam) => i.tipo === "T" && !i.calculado;

/**
 * Regra de evidência por indicador (D5), que vale para a nota do treinador e para a sugestão do
 * atleta, e liga ou desliga a autoavaliação do atleta (D9). O peso exige anexo (foto da balança)
 * e não tem autoavaliação: é medida, não nota.
 */
export function SecaoEvidencia({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const todos = dados.pilares.flatMap((p) => p.indicadores);
  const [valores, setValores] = useState<Record<string, Regra>>(() =>
    Object.fromEntries(todos.map((i) => [i.id, i.evidencia])),
  );
  const [auto, setAuto] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(todos.map((i) => [i.id, i.autoavaliacao])),
  );
  const mudouEvidencia = (i: IndicadorParam) => comEvidencia(i) && valores[i.id] !== i.evidencia;
  const mudouAuto = (i: IndicadorParam) => aceitaAutoavaliacao(i) && auto[i.id] !== i.autoavaliacao;
  const alterados = todos.filter((i) => mudouEvidencia(i) || mudouAuto(i));
  // Erros do 400: "indicadores.N.evidencia" (ou ".autoavaliacao") aponta para o N-ésimo item enviado.
  const doServidor = errosPorCampo(salvar.error);
  const erroDo = (id: string, campo: "evidencia" | "autoavaliacao") => {
    const n = alterados.findIndex((i) => i.id === id);
    return n < 0
      ? undefined
      : (doServidor[`indicadores.${n}.${campo}`] ?? doServidor[`indicadores.${n}.id`]);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (alterados.length === 0) return;
    salvar.mutate(
      {
        indicadores: alterados.map((i) => ({
          id: i.id,
          ...(mudouEvidencia(i) ? { evidencia: valores[i.id] as Regra } : {}),
          ...(mudouAuto(i) ? { autoavaliacao: auto[i.id] === true } : {}),
        })),
      },
      { onSuccess: () => toast.success(MSG_SALVO) },
    );
  };

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Evidência e autoavaliação por indicador</h2>
        </div>
        <p className="panel-dica">
          Define se a nota exige texto de evidência, tanto na nota do treinador quanto na sugestão
          do atleta. O vídeo entra sempre como link, nunca como arquivo. A autoavaliação define em
          quais indicadores o atleta pode sugerir a nota; a sugestão não entra no score, só a nota
          do treinador.
        </p>
        {dados.pilares
          .filter((p) => p.indicadores.some((i) => comEvidencia(i) || i.exigeAnexo))
          .map((p) => (
            <fieldset key={p.id} className="par-evid-pilar">
              <legend>{p.nome}</legend>
              <ul className="par-evid-lista">
                {p.indicadores
                  .filter((i) => comEvidencia(i) || i.exigeAnexo)
                  .map((i) => (
                    <li key={i.id}>
                      <span className="par-evid-nome">
                        {i.nome}
                        {i.exigeAnexo && (
                          <small className="par-ajuda">
                            Exige anexo: a nota depende de arquivo (foto da balança).
                          </small>
                        )}
                      </span>
                      {comEvidencia(i) ? (
                        <>
                          <select
                            aria-label={`Evidência de ${i.nome}`}
                            value={valores[i.id]}
                            {...atributosDoCampo(`evid-erro-${i.id}`, erroDo(i.id, "evidencia"))}
                            onChange={(e) => {
                              if (salvar.isError) salvar.reset();
                              setValores((v) => ({ ...v, [i.id]: e.target.value as Regra }));
                            }}
                          >
                            <option value="obrigatoria">Obrigatória</option>
                            <option value="opcional">Opcional</option>
                          </select>
                          <MensagemCampo
                            id={`evid-erro-${i.id}`}
                            texto={erroDo(i.id, "evidencia")}
                          />
                        </>
                      ) : (
                        <span className="pill st-neutro">Exige anexo</span>
                      )}
                      <span className="par-evid-auto">
                        <Interruptor
                          id={`auto-${i.id}`}
                          rotulo={`Autoavaliação de ${i.nome}`}
                          ligado={auto[i.id] === true}
                          desabilitado={!aceitaAutoavaliacao(i)}
                          descricao={
                            aceitaAutoavaliacao(i)
                              ? "Autoavaliação"
                              : "Autoavaliação indisponível: o indicador não tem nota do treinador"
                          }
                          aoMudar={(v) => {
                            if (salvar.isError) salvar.reset();
                            setAuto((a) => ({ ...a, [i.id]: v }));
                          }}
                        />
                        <MensagemCampo
                          id={`auto-erro-${i.id}`}
                          texto={erroDo(i.id, "autoavaliacao")}
                        />
                      </span>
                    </li>
                  ))}
              </ul>
            </fieldset>
          ))}
        {salvar.error && (
          <p className="par-erro" role="alert">
            {mensagemDeErro(salvar.error)}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            className="btn primary"
            type="submit"
            disabled={alterados.length === 0 || salvar.isPending}
          >
            {salvar.isPending
              ? "Salvando…"
              : alterados.length > 1
                ? `Salvar ${alterados.length} indicadores`
                : "Salvar alterações"}
          </button>
        </div>
      </form>
    </section>
  );
}
