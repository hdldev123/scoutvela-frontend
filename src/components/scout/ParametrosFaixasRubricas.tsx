import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros, type Parametros } from "@/lib/api/parametros";
import { Dialogo } from "./Dialogo";
import { MSG_SALVO } from "./parametros-util";

function ErroApi({ erro }: { erro: unknown }) {
  if (!erro) return null;
  return (
    <p className="par-erro" role="alert">
      {mensagemDeErro(erro)}
    </p>
  );
}

/* ------------------------------ Faixas de score ------------------------------ */

export function SecaoFaixas({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(dados.faixas.map((f) => [f.id, String(f.scoreMin)])),
  );
  const lidos = dados.faixas.map((f) => {
    const t = (valores[f.id] ?? "").trim();
    return /^\d+$/.test(t) ? Number(t) : NaN;
  });

  const avisos: string[] = [];
  if (lidos.some((n) => Number.isNaN(n) || n > 100)) {
    avisos.push("Informe números inteiros de 0 a 100.");
  } else {
    if (lidos.some((n, i) => i > 0 && n >= (lidos[i - 1] as number)))
      avisos.push(
        "O score mínimo precisa ser estritamente decrescente, da primeira à última faixa.",
      );
    if (lidos.length > 0 && lidos[lidos.length - 1] !== 0)
      avisos.push("A última faixa precisa começar em 0.");
  }
  const alterada = dados.faixas.some((f, i) => lidos[i] !== f.scoreMin);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (avisos.length > 0 || !alterada) return;
    const faixas = dados.faixas.map((f, i) => ({ id: f.id, scoreMin: lidos[i] as number }));
    salvar.mutate({ faixas }, { onSuccess: () => toast.success(MSG_SALVO) });
  };

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Faixas de resultado</h2>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            score mínimo (0 a 100)
          </span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {dados.faixas.map((f) => (
            <div className="par-linha" key={f.id}>
              <span>{f.nome}</span>
              <input
                className="par-kg"
                type="text"
                inputMode="numeric"
                aria-label={`Score mínimo de ${f.nome}`}
                aria-invalid={avisos.length > 0}
                value={valores[f.id] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {avisos.map((a) => (
          <p className="par-erro" role="alert" key={a}>
            {a}
          </p>
        ))}
        <ErroApi erro={salvar.error} />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            className="btn primary"
            type="submit"
            disabled={avisos.length > 0 || !alterada || salvar.isPending}
          >
            {salvar.isPending ? "Salvando…" : "Salvar faixas"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* --------------------------------- Rubricas --------------------------------- */

const NOTAS = [5, 4, 3, 2, 1, 0] as const;
const chave = (pilarId: string | null, nota: number) => `${pilarId ?? ""}|${nota}`;
const descricaoValida = (t: string) => t.trim().length >= 3 && t.trim().length <= 300;

export function SecaoRubricas({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const originais: Record<string, string> = Object.fromEntries(
    dados.rubricas.map((r) => [chave(r.pilarId, r.nota), r.descricao]),
  );
  const [valores, setValores] = useState<Record<string, string>>(originais);
  const [novoPilar, setNovoPilar] = useState<string | null>(null); // null = fechado
  const [novas, setNovas] = useState<string[]>(() => NOTAS.map(() => ""));
  const [removendo, setRemovendo] = useState<{ id: string; nome: string } | null>(null);

  const comRubrica = new Set(dados.rubricas.map((r) => r.pilarId).filter((p) => p !== null));
  const grupos = [
    { pilarId: null as string | null, titulo: "Escala geral" },
    ...dados.pilares
      .filter((p) => comRubrica.has(p.id))
      .map((p) => ({ pilarId: p.id as string | null, titulo: p.nome })),
  ];
  const livres = dados.pilares.filter((p) => !comRubrica.has(p.id));

  // Só o que mudou em relação ao que veio da API.
  const alteradas: { pilarId: string | null; nota: number; descricao: string; ok: boolean }[] = [];
  for (const g of grupos) {
    for (const nota of NOTAS) {
      const k = chave(g.pilarId, nota);
      const atual = valores[k] ?? "";
      if (atual.trim() !== (originais[k] ?? "").trim()) {
        alteradas.push({
          pilarId: g.pilarId,
          nota,
          descricao: atual.trim(),
          ok: descricaoValida(atual),
        });
      }
    }
  }
  const novoAberto = novoPilar !== null && novoPilar !== "";
  const novoCompleto = novoAberto && novas.every(descricaoValida);
  const novoIncompleto = novoAberto && !novoCompleto;
  const invalida = alteradas.some((a) => !a.ok) || novoIncompleto;
  const nada = alteradas.length === 0 && !novoCompleto;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (invalida || nada) return;
    const rubricas = alteradas.map(({ pilarId, nota, descricao }) => ({
      pilarId,
      nota,
      descricao,
    }));
    if (novoCompleto) {
      NOTAS.forEach((nota, i) =>
        rubricas.push({ pilarId: novoPilar, nota, descricao: (novas[i] as string).trim() }),
      );
    }
    salvar.mutate({ rubricas }, { onSuccess: () => toast.success(MSG_SALVO) });
  };

  const campo = (pilarId: string | null, nota: number, quem: string) => {
    const k = chave(pilarId, nota);
    const erro = alteradas.some((a) => a.pilarId === pilarId && a.nota === nota && !a.ok);
    return (
      <li key={k}>
        <strong aria-hidden="true">{nota}</strong>
        <textarea
          rows={2}
          maxLength={300}
          aria-label={`Descrição da nota ${nota}, ${quem}`}
          aria-invalid={erro}
          value={valores[k] ?? ""}
          onChange={(e) => setValores((v) => ({ ...v, [k]: e.target.value }))}
        />
      </li>
    );
  };

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Rubricas de 0 a 5</h2>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
          Hoje só Experiência de alto rendimento tem rubrica própria (P1). Os demais pilares usam a
          escala geral. Cada descrição tem de 3 a 300 caracteres.
        </p>
        {grupos.map((g) => (
          <fieldset className="par-grupo" key={g.pilarId ?? "geral"}>
            <legend>{g.titulo}</legend>
            <ul className="par-rubricas par-rubricas-edit">
              {NOTAS.map((n) => campo(g.pilarId, n, g.titulo.toLowerCase()))}
            </ul>
            {g.pilarId !== null && (
              <button
                type="button"
                className="btn"
                aria-label={`Remover rubrica deste pilar (${g.titulo})`}
                onClick={() => {
                  salvar.reset();
                  setRemovendo({ id: g.pilarId!, nome: g.titulo });
                }}
              >
                Remover rubrica deste pilar
              </button>
            )}
          </fieldset>
        ))}
        {novoPilar === null ? (
          livres.length > 0 && (
            <button type="button" className="btn" onClick={() => setNovoPilar("")}>
              Adicionar rubrica para um pilar
            </button>
          )
        ) : (
          <fieldset className="par-grupo">
            <legend>Nova rubrica de pilar</legend>
            <label className="field" htmlFor="rub-novo-pilar">
              Pilar
              <select
                id="rub-novo-pilar"
                value={novoPilar}
                onChange={(e) => setNovoPilar(e.target.value)}
              >
                <option value="">Escolha um pilar</option>
                {livres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            {novoAberto && (
              <ul className="par-rubricas par-rubricas-edit">
                {NOTAS.map((n, i) => (
                  <li key={n}>
                    <strong aria-hidden="true">{n}</strong>
                    <textarea
                      rows={2}
                      maxLength={300}
                      aria-label={`Nova rubrica, descrição da nota ${n}`}
                      value={novas[i]}
                      onChange={(e) =>
                        setNovas((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            {novoIncompleto && (
              <p className="par-erro" role="alert">
                Preencha as 6 notas (3 a 300 caracteres cada) para adicionar.
              </p>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                setNovoPilar(null);
                setNovas(NOTAS.map(() => ""));
              }}
            >
              Cancelar
            </button>
          </fieldset>
        )}
        {alteradas.some((a) => !a.ok) && (
          <p className="par-erro" role="alert">
            Cada descrição editada precisa ter de 3 a 300 caracteres.
          </p>
        )}
        <ErroApi erro={salvar.error} />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            className="btn primary"
            type="submit"
            disabled={invalida || nada || salvar.isPending}
          >
            {salvar.isPending ? "Salvando…" : "Salvar rubricas"}
          </button>
        </div>
      </form>
      {removendo && (
        <Dialogo
          titulo={`Remover rubrica de ${removendo.nome}`}
          aoFechar={() => setRemovendo(null)}
        >
          <div className="stack" style={{ gap: 12 }}>
            <p>
              As notas desse pilar passam a usar a escala geral. A remoção fica registrada na
              auditoria.
            </p>
            <ErroApi erro={salvar.error} />
            <div className="btn-row">
              <button
                type="button"
                className="btn primary"
                disabled={salvar.isPending}
                onClick={() =>
                  salvar.mutate(
                    { rubricasRemover: [removendo.id] },
                    {
                      onSuccess: () => {
                        setRemovendo(null);
                        toast.success(`Rubrica de ${removendo.nome} removida.`);
                      },
                    },
                  )
                }
              >
                {salvar.isPending ? "Removendo…" : "Remover rubrica"}
              </button>
              <button type="button" className="btn" onClick={() => setRemovendo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </section>
  );
}
