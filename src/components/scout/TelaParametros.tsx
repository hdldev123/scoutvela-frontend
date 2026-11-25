import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@/styles/parametros.css";
import { Abas, PainelAba } from "./Abas";
import { atributosDoCampo } from "./campo-util";
import { MensagemCampo } from "./MensagemCampo";
import { fmt1 } from "./formato";
import { SecaoEvidencia } from "./ParametrosEvidencia";
import { SecaoFaixas, SecaoRubricas } from "./ParametrosFaixasRubricas";
import { SecaoRegras } from "./ParametrosRegras";
import { SecaoTermos } from "./ParametrosTermos";
import { SugestaoDialog } from "./SugestaoDialog";
import { analisarAltura, MSG_SALVO, type PropostaClasse } from "./parametros-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
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
export function TelaParametros({
  papel = "gestor",
  proposta,
}: {
  papel?: string;
  /** Faixa proposta por uma sugestão aprovada (D7): preenche o Class Fit, sem salvar. */
  proposta?: PropostaClasse;
}) {
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
        <ConteudoParametros dados={consulta.data} gestor={papel === "gestor"} proposta={proposta} />
      )}
    </>
  );
}

const ABAS = [
  { id: "pesos", rotulo: "Pesos e faixas" },
  { id: "classes", rotulo: "Class Fit" },
  { id: "rubricas", rotulo: "Rubricas" },
  { id: "evidencia", rotulo: "Evidência" },
  { id: "regras", rotulo: "Regras provisórias" },
  { id: "termo", rotulo: "Termo de consentimento" },
  { id: "custos", rotulo: "Componentes de custo" },
];

/** Aba ativa guardada no hash da URL (#pesos, #classes...). Lê depois da montagem, para não divergir do SSR. */
function useAbaNoHash(validas: string[]): [string, (id: string) => void] {
  const [ativa, setAtiva] = useState(validas[0] as string);
  const router = useRouter({ warn: false });
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
      // Pelo roteador: `history.replaceState(null, ...)` apagaria o estado que ele guarda.
      if (router) {
        void router.navigate({ hash: id, replace: true, hashScrollIntoView: false });
      } else {
        window.history.replaceState(window.history.state, "", `#${id}`);
      }
    } catch {
      /* sem acesso ao histórico: a aba segue só no estado */
    }
  };
  return [ativa, mudar];
}

function ConteudoParametros({
  dados,
  gestor,
  proposta,
}: {
  dados: Parametros;
  gestor: boolean;
  proposta: PropostaClasse | undefined;
}) {
  const itens = ABAS.filter((a) => gestor || a.id !== "termo");
  const [ativa, mudar] = useAbaNoHash(itens.map((i) => i.id));
  return (
    <div className="stack">
      <Abas rotulo="Seções dos parâmetros" itens={itens} ativa={ativa} aoMudar={mudar} />
      <PainelAba id="pesos" ativa={ativa === "pesos"} manter>
        <div className="par-duas">
          <SecaoPesos key={dados.pilares.map((p) => p.peso).join(",")} dados={dados} />
          <SecaoFaixas key={JSON.stringify(dados.faixas)} dados={dados} />
        </div>
      </PainelAba>
      <PainelAba id="classes" ativa={ativa === "classes"} manter>
        <SecaoClasses
          key={`${proposta ? JSON.stringify(proposta) : ""}|${dados.classes
            .map(
              (c) =>
                `${c.pesoMinKg}/${c.pesoMedioKg}/${c.pesoMaxKg}/${c.alturaMinCm}/${c.alturaMediaCm}/${c.alturaMaxCm}/${c.ativa}/${JSON.stringify(c.fonte)}`,
            )
            .join(",")}`}
          dados={dados}
          gestor={gestor}
          proposta={proposta}
        />
      </PainelAba>
      <PainelAba id="rubricas" ativa={ativa === "rubricas"} manter>
        <SecaoRubricas
          key={JSON.stringify([dados.rubricas, dados.pilares.map((p) => p.id)])}
          dados={dados}
        />
      </PainelAba>
      <PainelAba id="evidencia" ativa={ativa === "evidencia"} manter>
        <SecaoEvidencia
          key={JSON.stringify(
            dados.pilares.flatMap((p) => p.indicadores.map((i) => [i.id, i.evidencia])),
          )}
          dados={dados}
        />
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
  // Erros do 400: "pesos.<id do pilar>".
  const doServidor = errosPorCampo(salvar.error);
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
            <div key={p.id}>
              <label className="field" htmlFor={`peso-${p.id}`}>
                {p.nomeCurto}
                <input
                  id={`peso-${p.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={valores[p.id] ?? ""}
                  {...atributosDoCampo(`peso-erro-${p.id}`, doServidor[`pesos.${p.id}`])}
                  onChange={(e) => {
                    if (salvar.isError) salvar.reset();
                    setValores((v) => ({ ...v, [p.id]: e.target.value }));
                  }}
                />
              </label>
              <MensagemCampo id={`peso-erro-${p.id}`} texto={doServidor[`pesos.${p.id}`]} />
            </div>
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
type CampoFonte = "fDoc" | "fVer" | "fData";
type Linha = Record<Campo | CampoFonte, string> & { ativa: boolean };

const DOC_MAX = 200;
const VERSAO_MAX = 40;

/** Fonte da faixa como a API espera: tudo vazio limpa (`null`); com algo, o documento é obrigatório. */
function analisarFonte(l: Pick<Linha, CampoFonte>) {
  const documento = l.fDoc.trim();
  const versao = l.fVer.trim();
  const data = l.fData.trim();
  if (!documento && !versao && !data) return { fonte: null, erro: null };
  if (!documento) return { fonte: null, erro: "Informe o documento que traz a faixa." };
  if (documento.length > DOC_MAX) {
    return { fonte: null, erro: `O documento pode ter até ${DOC_MAX} caracteres.` };
  }
  if (versao.length > VERSAO_MAX) {
    return { fonte: null, erro: `A versão pode ter até ${VERSAO_MAX} caracteres.` };
  }
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { fonte: null, erro: "Informe a data do documento no formato AAAA-MM-DD." };
  }
  return { fonte: { documento, versao: versao || null, data: data || null }, erro: null };
}

const mesmaFonte = (
  a: { documento: string | null; versao: string | null; data: string | null } | null,
  b: { documento: string | null; versao: string | null; data: string | null } | null,
) =>
  (a?.documento ?? null) === (b?.documento ?? null) &&
  (a?.versao ?? null) === (b?.versao ?? null) &&
  (a?.data ?? null) === (b?.data ?? null);

const txtAltura = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

function SecaoClasses({
  dados,
  gestor,
  proposta,
}: {
  dados: Parametros;
  gestor: boolean;
  proposta: PropostaClasse | undefined;
}) {
  const salvar = useSalvarParametros();
  const [sugerindo, setSugerindo] = useState<string | null>(null);
  const classeDaProposta = proposta
    ? dados.classes.find((c) => c.id === proposta.classe)
    : undefined;
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      dados.classes.map((c) => [
        c.id,
        {
          min: fmt1(proposta && c.id === proposta.classe ? proposta.min : c.pesoMinKg),
          med: fmt1(proposta && c.id === proposta.classe ? proposta.med : c.pesoMedioKg),
          max: fmt1(proposta && c.id === proposta.classe ? proposta.max : c.pesoMaxKg),
          aMin: txtAltura(c.alturaMinCm),
          aMed: txtAltura(c.alturaMediaCm),
          aMax: txtAltura(c.alturaMaxCm),
          fDoc: c.fonte?.documento ?? "",
          fVer: c.fonte?.versao ?? "",
          fData: c.fonte?.data ?? "",
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
    return { min, med, max, erro, h: analisarAltura(l.aMin, l.aMed, l.aMax), f: analisarFonte(l) };
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
    const fonteAlterada = a.f.erro !== null || !mesmaFonte(a.f.fonte, c.fonte);
    return {
      c,
      a,
      pesoAlterado,
      alturaAlterada,
      ativaAlterada,
      fonteAlterada,
      alterada: pesoAlterado || alturaAlterada || ativaAlterada || fonteAlterada,
    };
  });
  const alteradas = resultado.filter((r) => r.alterada);
  const comErro = alteradas.some(
    (r) =>
      (r.pesoAlterado && r.a.erro) ||
      (r.alturaAlterada && r.a.h.erro) ||
      (r.fonteAlterada && r.a.f.erro),
  );

  // Erros do 400: "classes.N.<campo>" aponta para a N-ésima classe enviada (as alteradas).
  const doServidor = errosPorCampo(salvar.error);
  const erroServidorDaClasse = (id: string, campos: string[]): string | undefined => {
    const i = alteradas.findIndex((r) => r.c.id === id);
    if (i < 0) return undefined;
    for (const k of campos) {
      const m = doServidor[`classes.${i}.${k}`];
      if (m) return m;
    }
    return undefined;
  };
  const CAMPOS_API: Record<Campo, string> = {
    min: "pesoMinKg",
    med: "pesoMedioKg",
    max: "pesoMaxKg",
    aMin: "alturaMinCm",
    aMed: "alturaMediaCm",
    aMax: "alturaMaxCm",
  };
  const CAMPOS_FONTE_API = ["fonte", "fonte.documento", "fonte.versao", "fonte.data"];

  const mudar = (id: string, campo: Campo | CampoFonte, valor: string) => {
    if (salvar.isError) salvar.reset();
    setLinhas((ls) => ({ ...ls, [id]: { ...ls[id]!, [campo]: valor } }));
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (alteradas.length === 0 || comErro) return;
    const classes = alteradas.map(
      ({ c, a, pesoAlterado, alturaAlterada, ativaAlterada, fonteAlterada }) => ({
        id: c.id,
        ...(pesoAlterado ? { pesoMinKg: a.min!, pesoMedioKg: a.med!, pesoMaxKg: a.max! } : {}),
        ...(alturaAlterada
          ? { alturaMinCm: a.h.min, alturaMediaCm: a.h.med, alturaMaxCm: a.h.max }
          : {}),
        ...(ativaAlterada ? { ativa: linhas[c.id]!.ativa } : {}),
        ...(fonteAlterada ? { fonte: a.f.fonte } : {}),
      }),
    );
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
      {...(erroServidorDaClasse(c.id, [CAMPOS_API[k]])
        ? atributosDoCampo(`classe-erro-${c.id}`, erroServidorDaClasse(c.id, [CAMPOS_API[k]]))
        : { "aria-invalid": erro })}
      value={linhas[c.id]![k]}
      readOnly={!gestor}
      onChange={(e) => mudar(c.id, k, e.target.value)}
    />
  );

  const campoFonte = (
    c: Parametros["classes"][number],
    k: CampoFonte,
    rotulo: string,
    max?: number,
    tipo: "text" | "date" = "text",
  ) => (
    <input
      className={`par-fonte par-fonte-${k}`}
      type={tipo}
      aria-label={`Fonte da faixa, ${rotulo.toLowerCase()}: ${c.nome}, ${POSICAO[c.posicao]}`}
      {...(max ? { maxLength: max } : {})}
      {...(erroServidorDaClasse(c.id, CAMPOS_FONTE_API)
        ? atributosDoCampo(`classe-erro-${c.id}`, erroServidorDaClasse(c.id, CAMPOS_FONTE_API))
        : {})}
      value={linhas[c.id]![k]}
      readOnly={!gestor}
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
        <p className="panel-dica">
          As faixas de peso devem seguir o documento oficial de cada classe. Registre em "Fonte da
          faixa" o documento, a versão e a data de onde a faixa foi tirada; a ficha do atleta mostra
          essa fonte abaixo do gráfico de Class Fit. A fonte é só informativa e não muda o cálculo.
        </p>
        {classeDaProposta && proposta && (
          <p className="par-proposta" role="note">
            <i className="ph ph-lightbulb" aria-hidden="true" />
            <span>
              Proposta de uma sugestão aprovada preenchida em {classeDaProposta.nome}:{" "}
              {fmt1(proposta.min)} / {fmt1(proposta.med)} / {fmt1(proposta.max)} kg. A faixa só muda
              quando você salvar; se não concordar, ajuste os valores ou saia sem salvar.
            </span>
          </p>
        )}
        {!gestor && (
          <p className="panel-dica">
            Você vê as faixas em leitura. Para propor uma mudança, use "Sugerir mudança": o gestor
            aprova ou recusa.
          </p>
        )}
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
                <th className="par-grupo-col" colSpan={3} scope="colgroup">
                  Fonte da faixa
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
                <th>Documento</th>
                <th>Versão</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map(({ c, a, alterada, pesoAlterado, alturaAlterada, fonteAlterada }) => (
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
                    {a.f.erro && fonteAlterada && (
                      <div className="par-erro" role="alert">
                        {a.f.erro}
                      </div>
                    )}
                    <MensagemCampo
                      id={`classe-erro-${c.id}`}
                      texto={erroServidorDaClasse(c.id, [
                        ...Object.values(CAMPOS_API),
                        ...CAMPOS_FONTE_API,
                      ])}
                    />
                    {!gestor && (
                      <button type="button" className="btn sm" onClick={() => setSugerindo(c.id)}>
                        Sugerir mudança{" "}
                        <span className="sr-only">
                          em {c.nome}, {POSICAO[c.posicao]}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="num">{campo(c, "min", "Mínimo", !!a.erro)}</td>
                  <td className="num">{campo(c, "med", "Média", !!a.erro)}</td>
                  <td className="num">{campo(c, "max", "Máximo", !!a.erro)}</td>
                  <td className="num">{campo(c, "aMin", "mínima", !!a.h.erro)}</td>
                  <td className="num">{campo(c, "aMed", "média", !!a.h.erro)}</td>
                  <td className="num">{campo(c, "aMax", "máxima", !!a.h.erro)}</td>
                  <td>{campoFonte(c, "fDoc", "Documento", DOC_MAX)}</td>
                  <td>{campoFonte(c, "fVer", "Versão", VERSAO_MAX)}</td>
                  <td>{campoFonte(c, "fData", "Data", undefined, "date")}</td>
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
        {gestor && (
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
        )}
      </form>
      {sugerindo && (
        <SugestaoDialog
          modo="class_fit"
          classeInicial={sugerindo}
          aoFechar={() => setSugerindo(null)}
        />
      )}
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
