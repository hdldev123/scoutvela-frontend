import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { fmt1 } from "./formato";
import { MensagemCampo } from "./MensagemCampo";
import { lerNumero } from "./parametros-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import {
  MAX_TEXTO_SUGESTAO,
  useEnviarSugestao,
  type CorpoSugestao,
  type TipoSugestao,
} from "@/lib/api/sugestoes";

type Modo = "class_fit" | "geral";

const arredondar = (n: number) => Math.round(n * 10) / 10;

const POSICAO = { helm: "Timoneiro", crew: "Proeiro", ind: "Individual" } as const;

interface ClasseOpcao {
  id: string;
  nome: string;
  posicao: keyof typeof POSICAO;
  pesoMinKg: number;
  pesoMedioKg: number;
  pesoMaxKg: number;
}

/**
 * Diálogo "Sugerir mudança" do treinador. `class_fit`: classe, faixa atual e os três pesos
 * propostos; `geral`: tipo (parâmetro ou sistema) e texto. Nada muda nos parâmetros: o gestor
 * responde a sugestão na tela Sugestões.
 */
export function SugestaoDialog({
  modo,
  classeInicial,
  aoFechar,
}: {
  modo: Modo;
  classeInicial?: string | undefined;
  aoFechar: () => void;
}) {
  return (
    <Dialogo
      titulo={modo === "class_fit" ? "Sugerir mudança no Class Fit" : "Nova sugestão"}
      aoFechar={aoFechar}
    >
      {modo === "class_fit" ? (
        <FormClassFit classeInicial={classeInicial} aoFechar={aoFechar} />
      ) : (
        <FormGeral aoFechar={aoFechar} />
      )}
    </Dialogo>
  );
}

function ErroEnvio({ erro }: { erro: unknown }) {
  if (!erro) return null;
  return (
    <p className="note" role="alert">
      {mensagemDeErro(erro, "Não foi possível enviar a sugestão.")}
    </p>
  );
}

function CampoTexto({
  valor,
  aoMudar,
  erro,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  erro: string | undefined;
}) {
  return (
    <div>
      <label className="field" htmlFor="sug-texto">
        Texto da sugestão
        <textarea
          id="sug-texto"
          rows={5}
          value={valor}
          maxLength={MAX_TEXTO_SUGESTAO}
          aria-describedby={erro ? "sug-texto-erro sug-texto-cont" : "sug-texto-cont"}
          aria-invalid={!!erro}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </label>
      <div className="sug-contador" id="sug-texto-cont">
        {valor.length} de {MAX_TEXTO_SUGESTAO.toLocaleString("pt-BR")} caracteres
      </div>
      <MensagemCampo id="sug-texto-erro" texto={erro} />
    </div>
  );
}

function Botoes({ pendente, aoFechar }: { pendente: boolean; aoFechar: () => void }) {
  return (
    <div className="btn-row">
      <button type="submit" className="btn primary" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar sugestão"}
      </button>
      <button type="button" className="btn" onClick={aoFechar}>
        Cancelar
      </button>
    </div>
  );
}

function FormGeral({ aoFechar }: { aoFechar: () => void }) {
  const enviar = useEnviarSugestao();
  const [tipo, setTipo] = useState<Exclude<TipoSugestao, "class_fit">>("parametro");
  const [texto, setTexto] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const doServidor = errosPorCampo(enviar.error);

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return setLocal("Informe o texto da sugestão.");
    setLocal(undefined);
    enviar.mutate(
      { tipo, texto: texto.trim() },
      {
        onSuccess: () => {
          toast.success("Sugestão enviada ao gestor.");
          aoFechar();
        },
      },
    );
  }

  return (
    <form className="stack" onSubmit={submeter} noValidate>
      <div>
        <label className="field" htmlFor="sug-tipo">
          Sobre o quê
          <select
            id="sug-tipo"
            autoFocus
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
          >
            <option value="parametro">Um parâmetro (pesos, faixas, regras)</option>
            <option value="sistema">O sistema (telas, fluxos, dúvidas)</option>
          </select>
        </label>
        <MensagemCampo id="sug-tipo-erro" texto={doServidor["tipo"]} />
      </div>
      <CampoTexto valor={texto} aoMudar={setTexto} erro={local ?? doServidor["texto"]} />
      <ErroEnvio erro={Object.keys(doServidor).length === 0 ? enviar.error : null} />
      <Botoes pendente={enviar.isPending} aoFechar={aoFechar} />
    </form>
  );
}

function FormClassFit({
  classeInicial,
  aoFechar,
}: {
  classeInicial: string | undefined;
  aoFechar: () => void;
}) {
  const parametros = useParametros();
  if (parametros.isPending) {
    return (
      <p role="status" className="muted">
        Carregando classes…
      </p>
    );
  }
  if (parametros.error) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(parametros.error)}
      </p>
    );
  }
  return (
    <FormClassFitPronto
      classes={parametros.data.classes.filter((c) => c.ativa)}
      classeInicial={classeInicial}
      aoFechar={aoFechar}
    />
  );
}

function FormClassFitPronto({
  classes,
  classeInicial,
  aoFechar,
}: {
  classes: ClasseOpcao[];
  classeInicial: string | undefined;
  aoFechar: () => void;
}) {
  const enviar = useEnviarSugestao();
  const inicial = classes.find((c) => c.id === classeInicial);
  const pesosDe = (c: ClasseOpcao | undefined) =>
    c
      ? { min: fmt1(c.pesoMinKg), med: fmt1(c.pesoMedioKg), max: fmt1(c.pesoMaxKg) }
      : { min: "", med: "", max: "" };
  const [classeId, setClasseId] = useState(inicial?.id ?? "");
  const [pesos, setPesos] = useState(pesosDe(inicial));
  const [texto, setTexto] = useState("");
  const [local, setLocal] = useState<Record<string, string>>({});
  const doServidor = errosPorCampo(enviar.error);
  const erro = (k: string) => local[k] ?? doServidor[k];
  const classe = classes.find((c) => c.id === classeId);

  function escolher(id: string) {
    setClasseId(id);
    // Parte da faixa vigente: o treinador altera só o que quer propor.
    setPesos(pesosDe(classes.find((x) => x.id === id)));
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    const falhas: Record<string, string> = {};
    if (!classeId) falhas["classeId"] = "Escolha a classe.";
    const min = lerNumero(pesos.min);
    const med = lerNumero(pesos.med);
    const max = lerNumero(pesos.max);
    if (min === null) falhas["proposta.pesoMinKg"] = "Informe o peso mínimo em kg.";
    if (med === null) falhas["proposta.pesoMedioKg"] = "Informe o peso médio em kg.";
    if (max === null) falhas["proposta.pesoMaxKg"] = "Informe o peso máximo em kg.";
    if (min !== null && med !== null && max !== null) {
      if (min > med) falhas["proposta.pesoMinKg"] = "O mínimo não pode passar da média.";
      else if (med > max) falhas["proposta.pesoMedioKg"] = "A média não pode passar do máximo.";
    }
    if (!texto.trim()) falhas["texto"] = "Informe o texto da sugestão.";
    setLocal(falhas);
    if (Object.keys(falhas).length > 0) return;
    const corpo: CorpoSugestao = {
      tipo: "class_fit",
      classeId,
      proposta: {
        pesoMinKg: arredondar(min!),
        pesoMedioKg: arredondar(med!),
        pesoMaxKg: arredondar(max!),
      },
      texto: texto.trim(),
    };
    enviar.mutate(corpo, {
      onSuccess: () => {
        toast.success("Sugestão enviada ao gestor.");
        aoFechar();
      },
    });
  }

  const campoPeso = (k: "min" | "med" | "max", rotulo: string, chave: string) => (
    <div>
      <label className="field" htmlFor={`sug-${k}`}>
        {rotulo} (kg)
        <input
          id={`sug-${k}`}
          type="text"
          inputMode="decimal"
          value={pesos[k]}
          {...atributosDoCampo(`sug-${k}-erro`, erro(chave))}
          onChange={(e) => setPesos((p) => ({ ...p, [k]: e.target.value }))}
        />
      </label>
      <MensagemCampo id={`sug-${k}-erro`} texto={erro(chave)} />
    </div>
  );

  return (
    <form className="stack" onSubmit={submeter} noValidate>
      <div>
        <label className="field" htmlFor="sug-classe">
          Classe
          <select
            id="sug-classe"
            autoFocus={!classeInicial}
            value={classeId}
            {...atributosDoCampo("sug-classe-erro", erro("classeId"))}
            onChange={(e) => escolher(e.target.value)}
          >
            <option value="">Escolha a classe</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {POSICAO[c.posicao]}
              </option>
            ))}
          </select>
        </label>
        <MensagemCampo id="sug-classe-erro" texto={erro("classeId")} />
      </div>
      {classe && (
        <p className="sug-atual">
          Faixa atual: {fmt1(classe.pesoMinKg)} / {fmt1(classe.pesoMedioKg)} /{" "}
          {fmt1(classe.pesoMaxKg)} kg (mín. / média / máx.)
        </p>
      )}
      <fieldset className="sug-pesos">
        <legend>Faixa proposta</legend>
        {campoPeso("min", "Mínimo", "proposta.pesoMinKg")}
        {campoPeso("med", "Média", "proposta.pesoMedioKg")}
        {campoPeso("max", "Máximo", "proposta.pesoMaxKg")}
      </fieldset>
      <MensagemCampo id="sug-proposta-erro" texto={erro("proposta")} />
      <CampoTexto valor={texto} aoMudar={setTexto} erro={erro("texto")} />
      <ErroEnvio erro={Object.keys(doServidor).length === 0 ? enviar.error : null} />
      <Botoes pendente={enviar.isPending} aoFechar={aoFechar} />
    </form>
  );
}
