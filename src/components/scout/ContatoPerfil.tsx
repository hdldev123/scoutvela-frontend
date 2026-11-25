import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { estadoPassaporte, AVISO_PASSAPORTE, textoAptidao, type Aptidao } from "./contato-util";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarPerfil } from "@/lib/api/perfil";

type Chave = "telefone" | "passaporteValidoAte";

/** Um campo de contato com o próprio salvar e apagar (`PUT /me/perfil`, erro por campo). */
function CampoContato({
  chave,
  id,
  rotulo,
  tipo,
  inicial,
  dica,
  rotuloSalvar,
  rotuloApagar,
  aviso,
  aoSalvar,
}: {
  chave: Chave;
  id: string;
  rotulo: string;
  tipo: "tel" | "month";
  inicial: string;
  dica: string;
  rotuloSalvar: string;
  rotuloApagar: string;
  aviso?: string | null;
  aoSalvar: string;
}) {
  const salvar = useSalvarPerfil();
  const [valor, setValor] = useState(inicial);
  const [erro, setErro] = useState("");
  const msg = errosPorCampo(salvar.error)[chave];
  const alterado = valor.trim() !== inicial;

  function enviar(novo: string | null) {
    setErro("");
    salvar.mutate(
      { [chave]: novo },
      {
        onSuccess: () => {
          if (novo === null) setValor("");
          toast(novo === null ? `${rotulo} apagado` : aoSalvar);
        },
        onError: (e) =>
          setErro(
            Object.keys(errosPorCampo(e)).length > 0
              ? ""
              : mensagemDeErro(e, "Não foi possível salvar."),
          ),
      },
    );
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    const t = valor.trim();
    if (t === "") return;
    enviar(t);
  }

  return (
    <form className="perfil-item perfil-item-form" onSubmit={submeter} noValidate>
      <label htmlFor={id}>{rotulo}</label>
      <div className="perfil-inline">
        <input
          id={id}
          type={tipo}
          autoComplete={tipo === "tel" ? "tel" : "off"}
          inputMode={tipo === "tel" ? "tel" : undefined}
          value={valor}
          {...atributosDoCampo(`${id}-erro`, msg)}
          aria-describedby={msg ? `${id}-erro` : `${id}-dica`}
          onChange={(e) => {
            if (salvar.isError) salvar.reset();
            setErro("");
            setValor(e.target.value);
          }}
        />
        <button
          type="submit"
          className="btn primary"
          disabled={!alterado || valor.trim() === "" || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : rotuloSalvar}
        </button>
        {inicial !== "" && (
          <button
            type="button"
            className="btn"
            disabled={salvar.isPending}
            onClick={() => enviar(null)}
          >
            {rotuloApagar}
          </button>
        )}
      </div>
      <p className="perfil-desc" id={`${id}-dica`}>
        {dica}
      </p>
      {aviso && (
        <p className="perfil-desc" role="status">
          <span className="pill st-alerta">{aviso}</span>
        </p>
      )}
      <MensagemCampo id={`${id}-erro`} texto={msg} />
      {erro && (
        <p role="alert" className="field-error">
          {erro}
        </p>
      )}
    </form>
  );
}

/** Seção "Contato e viagens" do modal Meu perfil (atleta): telefone, passaporte e aptidão. */
export function ContatoPerfil({
  telefone,
  passaporteValidoAte,
  aptidao,
}: {
  telefone: string | null;
  passaporteValidoAte: string | null;
  aptidao: Aptidao | null;
}) {
  const estado = passaporteValidoAte ? estadoPassaporte(passaporteValidoAte) : "ok";
  return (
    <>
      <CampoContato
        chave="telefone"
        id="perfil-telefone"
        rotulo="Telefone"
        tipo="tel"
        inicial={telefone ?? ""}
        dica="Com DDD, por exemplo +55 21 99999-0000. Só a gestão, o seu treinador e você veem."
        rotuloSalvar="Salvar telefone"
        rotuloApagar="Apagar telefone"
        aoSalvar="Telefone atualizado"
      />
      <CampoContato
        chave="passaporteValidoAte"
        id="perfil-passaporte"
        rotulo="Passaporte válido até"
        tipo="month"
        inicial={passaporteValidoAte ?? ""}
        dica="Mês e ano da validade. Não pedimos o número nem a cópia do passaporte (LGPD): a validade basta para planejar as viagens internacionais."
        rotuloSalvar="Salvar passaporte"
        rotuloApagar="Apagar passaporte"
        aviso={estado === "ok" ? null : AVISO_PASSAPORTE[estado]}
        aoSalvar="Validade do passaporte atualizada"
      />
      <div className="perfil-item">
        <div className="perfil-item-texto">
          <span className="perfil-rotulo">Aptidão para a prática esportiva</span>
          <span className="perfil-desc">
            A gestão confere o atestado fora do sistema. Aqui aparece só o registro.
          </span>
        </div>
        <div className="perfil-item-lado">
          <span className={`pill ${aptidao?.apto ? "st-apto" : "st-neutro"}`}>
            {textoAptidao(aptidao)}
          </span>
        </div>
      </div>
    </>
  );
}
