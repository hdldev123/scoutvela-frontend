import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@/styles/parametros.css";
import { fmt1 } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useParametros, useSalvarParametros, type Parametros } from "@/lib/api/parametros";

const MSG_SALVO = "Parâmetros salvos. O ranking já usa os novos valores.";
const POSICAO = { helm: "Timoneiro", crew: "Proeiro", ind: "Individual" } as const;

/** Aceita "82,8" ou "82.8"; devolve null quando não for número finito >= 0. */
export function lerKg(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

/** Valor de regra em texto legível (números, booleanos, listas e objetos simples). */
export function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(formatarValor).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${formatarValor(val)}`)
      .join("; ");
  }
  return String(v);
}

/** Tela de parâmetros da metodologia (gestor). Pesos e faixas de peso editáveis; o resto é leitura. */
export function TelaParametros() {
  const consulta = useParametros();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gestor CBVela</div>
          <h1>Parâmetros</h1>
          <p>
            Regras da metodologia ficam aqui, não no código. Mudou um peso, o ranking inteiro é
            recalculado.
          </p>
        </div>
      </div>
      <div className="par-aviso" role="note">
        <i className="ph ph-warning" aria-hidden="true" />
        <span>
          Mudanças valem para todo o ranking e ficam na trilha de auditoria, com os valores antes e
          depois.
        </span>
      </div>
      {consulta.isPending ? (
        <p role="status" className="muted">
          Carregando parâmetros…
        </p>
      ) : consulta.error ? (
        <div className="panel empty-state" role="alert">
          {mensagemDeErro(consulta.error)}
        </div>
      ) : (
        <ConteudoParametros dados={consulta.data} />
      )}
    </>
  );
}

function ConteudoParametros({ dados }: { dados: Parametros }) {
  return (
    <div className="grid-2">
      <div className="stack">
        <SecaoPesos key={dados.pilares.map((p) => p.peso).join(",")} dados={dados} />
        <SecaoFaixas dados={dados} />
        <SecaoRegras dados={dados} />
      </div>
      <div className="stack">
        <SecaoClasses
          key={dados.classes.map((c) => `${c.pesoMinKg}/${c.pesoMedioKg}/${c.pesoMaxKg}`).join(",")}
          dados={dados}
        />
        <SecaoRubricas dados={dados} />
        <SecaoCustos dados={dados} />
      </div>
    </div>
  );
}

function SecaoPesos({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(dados.pilares.map((p) => [p.id, String(p.peso)])),
  );
  const num = (id: string) => (/^\d+$/.test(valores[id] ?? "") ? Number(valores[id]) : NaN);
  const soma = dados.pilares.reduce((t, p) => t + (Number.isNaN(num(p.id)) ? 0 : num(p.id)), 0);
  const valido = dados.pilares.every((p) => !Number.isNaN(num(p.id))) && soma === 100;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    const pesos = Object.fromEntries(dados.pilares.map((p) => [p.id, num(p.id)]));
    salvar.mutate({ pesos }, { onSuccess: () => toast.success(MSG_SALVO) });
  };

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Pesos dos pilares</h2>
          <span className={`num ${soma === 100 ? "" : "down"}`} aria-live="polite">
            <b>{soma}</b> de 100 pts
          </span>
        </div>
        <div className="par-pesos">
          {dados.pilares.map((p) => (
            <label className="field" key={p.id} htmlFor={`peso-${p.id}`}>
              {p.nomeCurto}
              <input
                id={`peso-${p.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={valores[p.id] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        {!valido && <p className="muted">A soma precisa dar 100 para salvar.</p>}
        {salvar.error && (
          <p className="par-erro" role="alert">
            {mensagemDeErro(salvar.error)}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn primary" type="submit" disabled={!valido || salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar pesos"}
          </button>
        </div>
      </form>
    </section>
  );
}

type Linha = { min: string; med: string; max: string };

function SecaoClasses({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      dados.classes.map((c) => [
        c.id,
        { min: fmt1(c.pesoMinKg), med: fmt1(c.pesoMedioKg), max: fmt1(c.pesoMaxKg) },
      ]),
    ),
  );

  const analisar = (id: string) => {
    const l = linhas[id]!;
    const min = lerKg(l.min);
    const med = lerKg(l.med);
    const max = lerKg(l.max);
    let erro: string | null = null;
    if (min === null || med === null || max === null) erro = "Informe os três valores em kg.";
    else if (min > med) erro = "O mínimo não pode passar da média.";
    else if (med > max) erro = "A média não pode passar do máximo.";
    return { min, med, max, erro };
  };

  const resultado = dados.classes.map((c) => {
    const a = analisar(c.id);
    const alterada = a.min !== c.pesoMinKg || a.med !== c.pesoMedioKg || a.max !== c.pesoMaxKg;
    return { c, a, alterada };
  });
  const alteradas = resultado.filter((r) => r.alterada);
  const comErro = alteradas.some((r) => r.a.erro);

  const mudar = (id: string, campo: keyof Linha, valor: string) =>
    setLinhas((ls) => ({ ...ls, [id]: { ...ls[id]!, [campo]: valor } }));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (alteradas.length === 0 || comErro) return;
    const classes = alteradas.map(({ c, a }) => ({
      id: c.id,
      pesoMinKg: a.min!,
      pesoMedioKg: a.med!,
      pesoMaxKg: a.max!,
    }));
    salvar.mutate({ classes }, { onSuccess: () => toast.success(MSG_SALVO) });
  };

  const campo = (
    c: Parametros["classes"][number],
    k: keyof Linha,
    rotulo: string,
    erro: boolean,
  ) => (
    <input
      className="par-kg"
      type="text"
      inputMode="decimal"
      aria-label={`${rotulo} de ${c.nome}, ${POSICAO[c.posicao]} (kg)`}
      aria-invalid={erro}
      value={linhas[c.id]![k]}
      onChange={(e) => mudar(c.id, k, e.target.value)}
    />
  );

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Class Fit · faixas de peso</h2>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            kg · Word, seção 5
          </span>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Classe e posição</th>
                <th className="r">Mín.</th>
                <th className="r">Média</th>
                <th className="r">Máx.</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map(({ c, a, alterada }) => (
                <tr key={c.id} data-alterada={alterada || undefined}>
                  <td>
                    {c.nome}
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {c.evento} · {POSICAO[c.posicao]}
                    </div>
                    {a.erro && alterada && (
                      <div className="par-erro" role="alert">
                        {a.erro}
                      </div>
                    )}
                  </td>
                  <td className="r">{campo(c, "min", "Mínimo", !!a.erro)}</td>
                  <td className="r">{campo(c, "med", "Média", !!a.erro)}</td>
                  <td className="r">{campo(c, "max", "Máximo", !!a.erro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {salvar.error && (
          <p className="par-erro" role="alert">
            {mensagemDeErro(salvar.error)}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            className="btn primary"
            type="submit"
            disabled={alteradas.length === 0 || comErro || salvar.isPending}
          >
            {salvar.isPending
              ? "Salvando…"
              : alteradas.length > 1
                ? `Salvar ${alteradas.length} classes`
                : "Salvar faixas de peso"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* Somente leitura por enquanto. Cada seção recebe `dados` e pode ganhar edição depois. */

function CabecalhoLeitura({ titulo }: { titulo: string }) {
  return (
    <div className="panel-head">
      <h2>{titulo}</h2>
      <span className="muted" style={{ fontSize: "0.85rem" }}>
        somente leitura
      </span>
    </div>
  );
}

function SecaoFaixas({ dados }: { dados: Parametros }) {
  const faixas = [...dados.faixas].sort((a, b) => b.scoreMin - a.scoreMin);
  return (
    <section className="panel">
      <CabecalhoLeitura titulo="Faixas de resultado" />
      <div className="stack" style={{ gap: 8 }}>
        {faixas.map((f, i) => {
          const acima = faixas[i - 1];
          const intervalo = acima ? `${f.scoreMin} a ${acima.scoreMin - 1}` : `${f.scoreMin} a 100`;
          return (
            <div className="par-linha" key={f.id}>
              <span>{f.nome}</span>
              <span className="num muted">
                {f.scoreMin === 0 && acima ? `abaixo de ${acima.scoreMin}` : intervalo}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SecaoRegras({ dados }: { dados: Parametros }) {
  return (
    <section className="panel">
      <CabecalhoLeitura titulo="Regras provisórias" />
      <ul className="par-lista">
        {dados.regras.map((r) => (
          <li key={r.codigo}>
            <b>{r.codigo}</b> · {r.descricao}{" "}
            <span className="muted">({formatarValor(r.valor)})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecaoRubricas({ dados }: { dados: Parametros }) {
  const geral = dados.rubricas.filter((r) => r.pilarId === null).sort((a, b) => b.nota - a.nota);
  const porPilar = dados.pilares
    .map((p) => ({
      pilar: p,
      itens: dados.rubricas.filter((r) => r.pilarId === p.id).sort((a, b) => b.nota - a.nota),
    }))
    .filter((g) => g.itens.length > 0);
  return (
    <section className="panel">
      <CabecalhoLeitura titulo="Rubricas de 0 a 5" />
      <h3 style={{ fontSize: "0.95rem" }}>Escala geral</h3>
      <ul className="par-rubricas">
        {geral.map((r) => (
          <li key={r.nota}>
            <strong>{r.nota}</strong> {r.descricao}
          </li>
        ))}
      </ul>
      {porPilar.map(({ pilar, itens }) => (
        <div key={pilar.id}>
          <h3 style={{ fontSize: "0.95rem" }}>{pilar.nome}</h3>
          <ul className="par-rubricas">
            {itens.map((r) => (
              <li key={r.nota}>
                <strong>{r.nota}</strong> {r.descricao}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function SecaoCustos({ dados }: { dados: Parametros }) {
  return (
    <section className="panel">
      <CabecalhoLeitura titulo="Componentes de custo" />
      <ul className="par-lista">
        {dados.componentesCusto.map((c) => (
          <li key={c.id}>{c.nome}</li>
        ))}
      </ul>
    </section>
  );
}
