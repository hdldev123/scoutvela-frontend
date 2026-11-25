import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CampoArquivo } from "./CampoArquivo";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmt1, fmtInstante } from "./formato";
import { ErroApi, errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { validarArquivo } from "@/lib/api/evidencias";
import { useEnviarPesagem, usePesagens, type Pesagem } from "@/lib/api/pesagens";
import { LIMITES } from "@/lib/validacao";
import "@/styles/autoavaliacao.css";

const STATUS_PESAGEM: Record<Pesagem["status"], { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Aguardando validação", classe: "st-cond" },
  validada: { rotulo: "Validada", classe: "st-apto" },
  recusada: { rotulo: "Recusada", classe: "st-alerta" },
};

const MSG_PENDENTE =
  "Você já tem um peso aguardando validação. Espere seu treinador decidir antes de enviar outro.";

/** Peso em kg com uma casa decimal, de 30 a 160. Vazio ou fora da faixa: mensagem. */
function validarPeso(texto: string): { valor: number | null; erro: string | null } {
  const { min, max } = LIMITES.pesoKg;
  const msg = `Informe o peso em kg, de ${min} a ${max}, com no máximo uma casa decimal.`;
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(t)) return { valor: null, erro: msg };
  const n = Number(t);
  return n < min || n > max ? { valor: null, erro: msg } : { valor: n, erro: null };
}

/** "Informar peso" do atleta: peso e foto do visor da balança; o histórico mostra a decisão. */
export function PesagemAtleta({ atletaId }: { atletaId: string }) {
  const lista = usePesagens(atletaId);
  const enviar = useEnviarPesagem(atletaId);
  const [peso, setPeso] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [erros, setErros] = useState<{ peso?: string | undefined; foto?: string | undefined }>({});

  const itens = lista.data?.itens ?? [];
  const pendente = itens.some((p) => p.status === "pendente");
  const doServidor = errosPorCampo(enviar.error);
  const erroPeso = erros.peso ?? doServidor["pesoKg"];
  const erroFoto = erros.foto ?? doServidor["anexoId"];
  const erroGeral =
    enviar.isError && !doServidor["pesoKg"] && !doServidor["anexoId"]
      ? enviar.error instanceof ErroApi && enviar.error.status === 409
        ? MSG_PENDENTE
        : mensagemDeErro(enviar.error, "Não foi possível enviar o peso.")
      : null;

  function submeter(e: FormEvent) {
    e.preventDefault();
    const { valor, erro } = validarPeso(peso);
    setErros({
      peso: erro ?? undefined,
      foto: foto ? undefined : "Anexe a foto do visor da balança.",
    });
    if (valor === null || !foto) return;
    enviar.mutate(
      { pesoKg: valor, foto },
      {
        onSuccess: () => {
          toast.success("Peso enviado. Seu treinador vai conferir a foto.");
          setPeso("");
          setFoto(null);
        },
      },
    );
  }

  return (
    <section className="panel" aria-labelledby="pes-titulo">
      <div className="panel-head">
        <h2 id="pes-titulo">Informar peso</h2>
      </div>
      <p className="panel-dica">
        Envie seu peso com a foto do visor da balança. Fotografe só o visor, sem o corpo. Seu
        treinador confere o número na foto, e só o peso validado entra no Class Fit. A foto é
        apagada depois da validação.
      </p>
      {pendente ? (
        <div className="note" role="status">
          {MSG_PENDENTE}
        </div>
      ) : (
        <form className="pes-form" onSubmit={submeter} noValidate>
          <div>
            <label className="field" htmlFor="pes-peso">
              Peso (kg)
              <input
                id="pes-peso"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={peso}
                disabled={enviar.isPending}
                {...atributosDoCampo("pes-peso-erro", erroPeso)}
                onChange={(e) => {
                  if (enviar.isError) enviar.reset();
                  setErros((x) => ({ ...x, peso: undefined }));
                  setPeso(e.target.value);
                }}
              />
            </label>
            <MensagemCampo id="pes-peso-erro" texto={erroPeso} />
          </div>
          <div>
            <CampoArquivo
              id="pes-foto"
              rotulo="Foto do visor da balança"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              textoBotao="Foto do visor da balança"
              dica="JPG ou PNG, até 5 MB"
              arquivo={foto}
              desabilitado={enviar.isPending}
              aoEscolher={(f) => {
                if (enviar.isError) enviar.reset();
                if (!f) {
                  setFoto(null);
                  return;
                }
                const recusa = validarArquivo(f);
                setErros((x) => ({ ...x, foto: recusa ?? undefined }));
                if (!recusa) setFoto(f);
              }}
            />
            <MensagemCampo id="pes-foto-erro" texto={erroFoto} />
          </div>
          {erroGeral && (
            <div className="note" role="alert">
              {erroGeral}
            </div>
          )}
          <div className="btn-row">
            <button type="submit" className="btn primary" disabled={enviar.isPending}>
              {enviar.isPending ? "Enviando…" : "Enviar peso"}
            </button>
          </div>
        </form>
      )}
      <ListaPesagens itens={itens} carregando={lista.isPending} erro={lista.error} />
    </section>
  );
}

function ListaPesagens({
  itens,
  carregando,
  erro,
}: {
  itens: Pesagem[];
  carregando: boolean;
  erro: unknown;
}) {
  if (carregando) {
    return (
      <p className="muted" role="status">
        Carregando pesagens…
      </p>
    );
  }
  if (erro) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(erro, "Não foi possível carregar as pesagens.")}
      </p>
    );
  }
  if (itens.length === 0) return <p className="muted">Você ainda não informou nenhum peso.</p>;
  return (
    <>
      <h3 style={{ margin: "14px 0 0", fontSize: "1rem" }}>Pesagens enviadas</h3>
      <ul className="pes-lista">
        {itens.map((p) => {
          const st = STATUS_PESAGEM[p.status];
          return (
            <li key={p.id}>
              <span className="pes-peso">{fmt1(p.pesoKg)} kg</span>
              <span className={`pill ${st.classe}`}>{st.rotulo}</span>
              <span className="muted">enviada em {fmtInstante(p.enviadoEm)}</span>
              {p.decididoPor && p.decididoEm && (
                <span className="muted">
                  decidida por {p.decididoPor.nome} em {fmtInstante(p.decididoEm)}
                </span>
              )}
              {p.status === "recusada" && p.motivo && (
                <span className="pes-motivo">Motivo da recusa: {p.motivo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
