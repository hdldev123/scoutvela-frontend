import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@/styles/parametros.css";
import { Abas, PainelAba } from "./Abas";
import { fmt1 } from "./formato";
import { SecaoFaixas, SecaoRubricas } from "./ParametrosFaixasRubricas";
import { SecaoRegras } from "./ParametrosRegras";
import { SecaoTermos } from "./ParametrosTermos";
import { analisarAltura, MSG_SALVO } from "./parametros-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useParametros, useSalvarParametros, type Parametros } from "@/lib/api/parametros";

const POSICAO = { helm: "Timoneiro", crew: "Proeiro", ind: "Individual" } as const;

/** Aceita "82,8" ou "82.8"; devolve null quando não for número finito >= 0. */
function lerKg(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

/** Tela de parâmetros da metodologia (gestor). Pesos e faixas de peso editáveis; o resto é leitura. */
export function TelaParametros({ papel = "gestor" }: { papel?: string }) {
  const consulta = useParametros();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Metodologia</div>
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
        <ConteudoParametros dados={consulta.data} gestor={papel === "gestor"} />
      )}
    </>
  );
}

const ABAS = [
  { id: "pesos", rotulo: "Pesos e faixas" },
  { id: "classes", rotulo: "Class Fit" },
  { id: "rubricas", rotulo: "Rubricas" },
  { id: "regras", rotulo: "Regras provisórias" },
  { id: "termo", rotulo: "Termo de consentimento" },
  { id: "custos", rotulo: "Componentes de custo" },
];

/** Aba ativa guardada no hash da URL (#pesos, #classes...). Lê depois da montagem, para não divergir do SSR. */
function useAbaNoHash(validas: string[]): [string, (id: string) => void] {
  const [ativa, setAtiva] = useState(validas[0] as string);
  useEffect(() => {
    const ler = () => {
      const h = window.location.hash.replace("#", "");
      if (validas.includes(h)) setAtiva(h);
    };
    ler();
    window.addEventListener("hashchange", ler);
    return () => window.removeEventListener("hashchange", ler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validas.join(",")]);
  const mudar = (id: string) => {
    setAtiva(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* sem acesso ao histórico: a aba segue só no estado */
    }
  };
  return [ativa, mudar];
}

function ConteudoParametros({ dados, gestor }: { dados: Parametros; gestor: boolean }) {
  const itens = ABAS.filter((a) => gestor || a.id !== "termo");
  const [ativa, mudar] = useAbaNoHash(itens.map((i) => i.id));
  return (
    <div className="stack">
      <Abas rotulo="Seções dos parâmetros" itens={itens} ativa={ativa} aoMudar={mudar} />
      <PainelAba id="pesos" ativa={ativa === "pesos"} manter>
        <div className="par-duas">
          <SecaoPesos key={dados.pilares.map((p) => p.peso).join(",")} dados={dados} />
          <SecaoFaixas dados={dados} />
        </div>
      </PainelAba>
      <PainelAba id="classes" ativa={ativa === "classes"} manter>
        <SecaoClasses
          key={dados.classes
            .map(
              (c) =>
                `${c.pesoMinKg}/${c.pesoMedioKg}/${c.pesoMaxKg}/${c.alturaMinCm}/${c.alturaMediaCm}/${c.alturaMaxCm}/${c.ativa}`,
            )
            .join(",")}
          dados={dados}
        />
      </PainelAba>
      <PainelAba id="rubricas" ativa={ativa === "rubricas"} manter>
        <SecaoRubricas dados={dados} />
      </PainelAba>
      <PainelAba id="regras" ativa={ativa === "regras"} manter>
        <SecaoRegras dados={dados} />
      </PainelAba>
      {gestor && (
        <PainelAba id="termo" ativa={ativa === "termo"}>
          <SecaoTermos />
        </PainelAba>
      )}
      <PainelAba id="custos" ativa={ativa === "custos"}>
        <SecaoCustos dados={dados} />
      </PainelAba>
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
          <span
            className={`pill par-total ${soma === 100 ? "st-apto" : "st-alerta"}`}
            aria-live="polite"
          >
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
        {!valido && <p className="par-dica">A soma precisa dar 100 para salvar.</p>}
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

type Campo = "min" | "med" | "max" | "aMin" | "aMed" | "aMax";
type Linha = Record<Campo, string> & { ativa: boolean };

const txtAltura = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

function SecaoClasses({ dados }: { dados: Parametros }) {
  const salvar = useSalvarParametros();
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      dados.classes.map((c) => [
        c.id,
        {
          min: fmt1(c.pesoMinKg),
          med: fmt1(c.pesoMedioKg),
          max: fmt1(c.pesoMaxKg),
          aMin: txtAltura(c.alturaMinCm),
          aMed: txtAltura(c.alturaMediaCm),
          aMax: txtAltura(c.alturaMaxCm),
          ativa: c.ativa,
        },
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
    return { min, med, max, erro, h: analisarAltura(l.aMin, l.aMed, l.aMax) };
  };

  const resultado = dados.classes.map((c) => {
    const a = analisar(c.id);
    const pesoAlterado = a.min !== c.pesoMinKg || a.med !== c.pesoMedioKg || a.max !== c.pesoMaxKg;
    const h = a.h;
    const alturaAlterada =
      h.erro !== null ||
      h.min !== c.alturaMinCm ||
      h.med !== c.alturaMediaCm ||
      h.max !== c.alturaMaxCm;
    const ativaAlterada = linhas[c.id]!.ativa !== c.ativa;
    return {
      c,
      a,
      pesoAlterado,
      alturaAlterada,
      ativaAlterada,
      alterada: pesoAlterado || alturaAlterada || ativaAlterada,
    };
  });
  const alteradas = resultado.filter((r) => r.alterada);
  const comErro = alteradas.some(
    (r) => (r.pesoAlterado && r.a.erro) || (r.alturaAlterada && r.a.h.erro),
  );

  const mudar = (id: string, campo: Campo, valor: string) =>
    setLinhas((ls) => ({ ...ls, [id]: { ...ls[id]!, [campo]: valor } }));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (alteradas.length === 0 || comErro) return;
    const classes = alteradas.map(({ c, a, pesoAlterado, alturaAlterada, ativaAlterada }) => ({
      id: c.id,
      ...(pesoAlterado ? { pesoMinKg: a.min!, pesoMedioKg: a.med!, pesoMaxKg: a.max! } : {}),
      ...(alturaAlterada
        ? { alturaMinCm: a.h.min, alturaMediaCm: a.h.med, alturaMaxCm: a.h.max }
        : {}),
      ...(ativaAlterada ? { ativa: linhas[c.id]!.ativa } : {}),
    }));
    salvar.mutate({ classes }, { onSuccess: () => toast.success(MSG_SALVO) });
  };

  const campo = (c: Parametros["classes"][number], k: Campo, rotulo: string, erro: boolean) => (
    <input
      className="par-kg"
      type="text"
      inputMode="decimal"
      aria-label={
        k.startsWith("a")
          ? `Altura ${rotulo} de ${c.nome}, ${POSICAO[c.posicao]} (cm)`
          : `${rotulo} de ${c.nome}, ${POSICAO[c.posicao]} (kg)`
      }
      aria-invalid={erro}
      value={linhas[c.id]![k]}
      onChange={(e) => mudar(c.id, k, e.target.value)}
    />
  );

  return (
    <section className="panel">
      <form onSubmit={enviar} noValidate>
        <div className="panel-head">
          <h2>Class Fit · faixas de peso e altura</h2>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            kg e cm · Word, seção 5
          </span>
        </div>
        <p className="panel-dica">A altura é informativa (não entra no score nem nos gates).</p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de faixas de peso e altura por classe, role para ver todas as colunas"
        >
          <table className="data interativa par-classes">
            <thead>
              <tr>
                <th rowSpan={2}>Classe e posição</th>
                <th className="num par-grupo-col" colSpan={3} scope="colgroup">
                  Peso (kg)
                </th>
                <th className="num par-grupo-col" colSpan={3} scope="colgroup">
                  Altura (cm)
                </th>
                <th className="par-col-ativa" rowSpan={2}>
                  Ativa
                </th>
              </tr>
              <tr>
                <th className="num">Mín.</th>
                <th className="num">Média</th>
                <th className="num">Máx.</th>
                <th className="num">Mín.</th>
                <th className="num">Média</th>
                <th className="num">Máx.</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map(({ c, a, alterada, pesoAlterado, alturaAlterada }) => (
                <tr key={c.id} data-alterada={alterada || undefined}>
                  <td className="nw par-classe">
                    <span className="par-classe-nome">{c.nome}</span>
                    <small className="par-ajuda">
                      {c.evento} · {POSICAO[c.posicao]}
                    </small>
                    {a.erro && pesoAlterado && (
                      <div className="par-erro" role="alert">
                        {a.erro}
                      </div>
                    )}
                    {a.h.erro && alturaAlterada && (
                      <div className="par-erro" role="alert">
                        {a.h.erro}
                      </div>
                    )}
                  </td>
                  <td className="num">{campo(c, "min", "Mínimo", !!a.erro)}</td>
                  <td className="num">{campo(c, "med", "Média", !!a.erro)}</td>
                  <td className="num">{campo(c, "max", "Máximo", !!a.erro)}</td>
                  <td className="num">{campo(c, "aMin", "mínima", !!a.h.erro)}</td>
                  <td className="num">{campo(c, "aMed", "média", !!a.h.erro)}</td>
                  <td className="num">{campo(c, "aMax", "máxima", !!a.h.erro)}</td>
                  <td className="par-col-ativa">
                    <input
                      type="checkbox"
                      role="switch"
                      className="par-ativa"
                      aria-label={`Ativa: ${c.nome}, ${POSICAO[c.posicao]}`}
                      checked={linhas[c.id]!.ativa}
                      onChange={(e) =>
                        setLinhas((ls) => ({
                          ...ls,
                          [c.id]: { ...ls[c.id]!, ativa: e.target.checked },
                        }))
                      }
                    />
                  </td>
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
                : "Salvar faixas da classe"}
          </button>
        </div>
      </form>
    </section>
  );
}

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

function SecaoCustos({ dados }: { dados: Parametros }) {
  return (
    <section className="panel">
      <CabecalhoLeitura titulo="Componentes de custo" />
      <ul className="par-custos">
        {dados.componentesCusto.map((c) => (
          <li key={c.id}>{c.nome}</li>
        ))}
      </ul>
    </section>
  );
}
