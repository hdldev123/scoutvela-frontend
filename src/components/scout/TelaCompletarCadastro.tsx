import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LinkWsId } from "./LinkWsId";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { ehRecusaDeMenor, useCompletarCadastro } from "@/lib/api/cadastro-atleta";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import type { paths } from "@/lib/api/schema";
import "@/styles/cadastro.css";

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;
type MeResposta = Json<paths["/me"]["get"]["responses"][200]>;
export type CadastroPendente = NonNullable<MeResposta["cadastroPendente"]>;

const hoje = () => new Date().toLocaleDateString("sv-SE");

/**
 * Primeiro acesso do atleta: nome, gênero e data de nascimento, antes de qualquer outra tela.
 * Os dados vêm preenchidos com a sugestão do VelaID, quando houver. A API decide a idade: menor
 * de 18 anos encerra o cadastro, e a sessão deixa de valer.
 */
export function TelaCompletarCadastro({
  pendente,
  aoSair,
}: {
  pendente: CadastroPendente;
  aoSair: () => void;
}) {
  const sugestao = pendente.sugestao;
  const [nome, setNome] = useState(sugestao?.nome ?? "");
  const [genero, setGenero] = useState<"F" | "M" | "">(sugestao?.genero ?? "");
  const [nascimento, setNascimento] = useState(sugestao?.dataNascimento ?? "");
  const [tentou, setTentou] = useState(false);
  const [errosApi, setErrosApi] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [recusa, setRecusa] = useState("");
  const completar = useCompletarCadastro();
  const id = useId();
  const idNome = `${id}-nome`;
  const idNasc = `${id}-nasc`;
  const idGenero = `${id}-genero`;

  const locais: Record<string, string | undefined> = tentou
    ? {
        nome:
          nome.trim().length < 2 || nome.trim().length > 120
            ? "O nome precisa ter de 2 a 120 caracteres."
            : undefined,
        genero: genero ? undefined : "Escolha o gênero.",
        dataNascimento: !nascimento
          ? "Informe a data de nascimento."
          : nascimento > hoje()
            ? "A data de nascimento não pode estar no futuro."
            : undefined,
      }
    : {};
  const erro = (c: string) => locais[c] ?? errosApi[c];

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setTentou(true);
    setErrosApi({});
    setErroGeral("");
    if (
      nome.trim().length < 2 ||
      nome.trim().length > 120 ||
      !genero ||
      !nascimento ||
      nascimento > hoje()
    ) {
      return;
    }
    completar.mutate(
      { nome: nome.trim(), genero, dataNascimento: nascimento },
      {
        onSuccess: () => toast.success("Cadastro completo. Bem-vindo ao Scout Vela."),
        onError: (err) => {
          if (ehRecusaDeMenor(err)) return setRecusa(mensagemDeErro(err));
          const campos = errosPorCampo(err);
          setErrosApi(campos);
          if (Object.keys(campos).length === 0) setErroGeral(mensagemDeErro(err));
        },
      },
    );
  };

  if (recusa) {
    return (
      <section
        className="panel stack"
        style={{ gap: 12, maxWidth: 640 }}
        aria-labelledby={`${id}-t`}
      >
        <h1 id={`${id}-t`}>Cadastro encerrado</h1>
        <div className="note cad-motivo" role="alert">
          {recusa}
        </div>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={aoSair}>
            Sair
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack" style={{ gap: 12, maxWidth: 640 }} aria-labelledby={`${id}-t`}>
      <div>
        <div className="eyebrow">Primeiro acesso</div>
        <h1 id={`${id}-t`}>Complete seu cadastro</h1>
        <p className="muted">
          Pedimos só o que o programa usa para identificar você e conferir a elegibilidade: nome,
          gênero e data de nascimento. O piloto é para atletas com 18 anos ou mais.
        </p>
      </div>
      <dl className="kv">
        <dt>ID World Sailing</dt>
        <dd>
          <LinkWsId wsId={pendente.wsId} />
        </dd>
        {pendente.velaid && (
          <>
            <dt>VelaID</dt>
            <dd>
              <code>{pendente.velaid}</code>
            </dd>
          </>
        )}
      </dl>
      {sugestao && (
        <div className="note">
          Preenchemos com os dados do seu cadastro no VelaID. Confira antes de enviar.
        </div>
      )}
      <form className="stack" style={{ gap: 12 }} onSubmit={enviar} noValidate>
        <div>
          <label className="field" htmlFor={idNome}>
            Nome completo
            <input
              id={idNome}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              autoComplete="name"
              required
              {...atributosDoCampo(`${idNome}-erro`, erro("nome"))}
            />
          </label>
          <MensagemCampo id={`${idNome}-erro`} texto={erro("nome")} />
        </div>
        <fieldset className="cad-genero">
          <legend id={idGenero}>Gênero</legend>
          <div
            className="segmentado"
            role="radiogroup"
            aria-labelledby={idGenero}
            aria-describedby={erro("genero") ? `${idGenero}-erro` : undefined}
          >
            <label>
              <input
                type="radio"
                name={idGenero}
                checked={genero === "F"}
                onChange={() => setGenero("F")}
              />
              Feminino
            </label>
            <label>
              <input
                type="radio"
                name={idGenero}
                checked={genero === "M"}
                onChange={() => setGenero("M")}
              />
              Masculino
            </label>
          </div>
          <MensagemCampo id={`${idGenero}-erro`} texto={erro("genero")} />
        </fieldset>
        <div>
          <label className="field" htmlFor={idNasc}>
            Data de nascimento
            <input
              id={idNasc}
              type="date"
              value={nascimento}
              max={hoje()}
              onChange={(e) => setNascimento(e.target.value)}
              autoComplete="bday"
              required
              {...atributosDoCampo(`${idNasc}-erro`, erro("dataNascimento"))}
            />
          </label>
          <MensagemCampo id={`${idNasc}-erro`} texto={erro("dataNascimento")} />
        </div>
        <p className="muted cad-sub">
          Confira a data: depois de enviada, só muda por pedido de correção. Quem informa menos de
          18 anos tem o cadastro encerrado.
        </p>
        {erroGeral && (
          <div className="note" role="alert">
            {erroGeral}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={completar.isPending}>
            {completar.isPending ? "Enviando…" : "Concluir cadastro"}
          </button>
        </div>
      </form>
    </section>
  );
}
