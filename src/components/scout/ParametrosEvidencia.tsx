import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { MensagemCampo } from "./MensagemCampo";
import { MSG_SALVO } from "./parametros-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros, type Parametros } from "@/lib/api/parametros";

type Regra = "obrigatoria" | "opcional";
type IndicadorParam = Parametros["pilares"][number]["indicadores"][number];

/** Indicadores com nota lançada por pessoa (os de registro e os calculados não têm evidência própria). */
const comEvidencia = (i: IndicadorParam) => i.tipo !== "R" && !i.calculado;

/**
 * Regra de evidência por indicador (D5): vale para a nota do treinador e para a sugestão do atleta.
 * O peso exige anexo (foto da balança): só leitura.
 */
export function SecaoEvidencia({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const todos = dados.pilares.flatMap((p) => p.indicadores);
  const [valores, setValores] = useState<Record<string, Regra>>(() =>
    Object.fromEntries(todos.map((i) => [i.id, i.evidencia])),
  );
  const alterados = todos.filter((i) => comEvidencia(i) && valores[i.id] !== i.evidencia);
  // Erros do 400: "indicadores.N.evidencia" aponta para o N-ésimo item enviado (os alterados).
  const doServidor = errosPorCampo(salvar.error);
  const erroDo = (id: string) => {
    const n = alterados.findIndex((i) => i.id === id);
    return n < 0
      ? undefined
      : (doServidor[`indicadores.${n}.evidencia`] ?? doServidor[`indicadores.${n}.id`]);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (alterados.length === 0) return;
    salvar.mutate(
      { indicadores: alterados.map((i) => ({ id: i.id, evidencia: valores[i.id] as Regra })) },
      { onSuccess: () => toast.success(MSG_SALVO) },
    );
  };

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Evidência por indicador</h2>
        </div>
        <p className="panel-dica">
          Define se a nota exige texto de evidência, tanto na nota do treinador quanto na sugestão
          do atleta. O vídeo entra sempre como link, nunca como arquivo.
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
                            {...atributosDoCampo(`evid-erro-${i.id}`, erroDo(i.id))}
                            onChange={(e) => {
                              if (salvar.isError) salvar.reset();
                              setValores((v) => ({ ...v, [i.id]: e.target.value as Regra }));
                            }}
                          >
                            <option value="obrigatoria">Obrigatória</option>
                            <option value="opcional">Opcional</option>
                          </select>
                          <MensagemCampo id={`evid-erro-${i.id}`} texto={erroDo(i.id)} />
                        </>
                      ) : (
                        <span className="pill st-neutro">Exige anexo</span>
                      )}
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
                : "Salvar evidência"}
          </button>
        </div>
      </form>
    </section>
  );
}
