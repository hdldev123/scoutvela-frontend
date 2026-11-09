import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { fmtData } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import type { FichaAtleta } from "@/lib/api/consultas";
import { registrarPlano, type CorpoPlano } from "@/lib/api/mutacoes-ficha";

const CAMPOS: { chave: keyof CorpoPlano; rotulo: string }[] = [
  { chave: "forcas", rotulo: "Forças" },
  { chave: "lacunas", rotulo: "Lacunas" },
  { chave: "meta12m", rotulo: "Meta 12 meses" },
  { chave: "meta24m", rotulo: "Meta 24 meses" },
  { chave: "recomendacao", rotulo: "Recomendação" },
];
const MAX = 1000;

function PlanoDialogo({
  atletaId,
  inicial,
  aoFechar,
}: {
  atletaId: string;
  inicial: CorpoPlano | null;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [valores, setValores] = useState<CorpoPlano>({
    forcas: inicial?.forcas ?? "",
    lacunas: inicial?.lacunas ?? "",
    meta12m: inicial?.meta12m ?? "",
    meta24m: inicial?.meta24m ?? "",
    recomendacao: inicial?.recomendacao ?? "",
  });
  const [erro, setErro] = useState("");

  const enviar = useMutation({
    mutationFn: (corpo: CorpoPlano) => registrarPlano(atletaId, corpo),
    onSuccess: async () => {
      toast("Plano individual registrado");
      await queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] });
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível registrar o plano.")),
  });

  function submeter(e: FormEvent) {
    e.preventDefault();
    const corpo = Object.fromEntries(
      CAMPOS.map(({ chave }) => [chave, valores[chave].trim()]),
    ) as CorpoPlano;
    const vazio = CAMPOS.find(({ chave }) => corpo[chave] === "");
    if (vazio) return setErro(`Preencha o campo “${vazio.rotulo}”.`);
    setErro("");
    enviar.mutate(corpo);
  }

  return (
    <Dialogo titulo="Registrar plano individual" aoFechar={aoFechar}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted ficha-dica">
          O plano é uma decisão de pessoa e fica registrado com autor e data. Cada registro cria uma
          nova versão; as anteriores não são apagadas.
        </p>
        {CAMPOS.map(({ chave, rotulo }, i) => (
          <label key={chave} className="field" htmlFor={`plano-${chave}`}>
            {rotulo}
            <textarea
              id={`plano-${chave}`}
              autoFocus={i === 0}
              rows={3}
              maxLength={MAX}
              value={valores[chave]}
              onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
            />
          </label>
        ))}
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={enviar.isPending}>
            {enviar.isPending ? "Registrando…" : "Salvar plano"}
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

/**
 * Plano individual: mostra o plano registrado por uma pessoa ou, na falta dele, a sugestão da API.
 * Não calcula nada no navegador. Some quando a API não devolve plano nem sugestão (IBVAR).
 */
export function PlanoIndividual({ ficha, papel }: { ficha: FichaAtleta; papel: string }) {
  const [editando, setEditando] = useState(false);
  const { plano, sugestaoPlano } = ficha;
  const podeRegistrar = papel === "gestor" || papel === "treinador";
  if (!plano && !sugestaoPlano && !podeRegistrar) return null;

  const exibido = plano ?? sugestaoPlano;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Plano individual</h2>
        {podeRegistrar && (
          <button type="button" className="btn" onClick={() => setEditando(true)}>
            Registrar plano
          </button>
        )}
      </div>
      {exibido ? (
        <>
          <p className="muted ficha-dica">
            {plano
              ? `Registrado por ${plano.registradoPor.nome} em ${fmtData(plano.registradoEm)}`
              : "Sugestão da API, ainda não registrada"}
          </p>
          <dl className="kv">
            <dt>Forças</dt>
            <dd>{exibido.forcas}</dd>
            <dt>Lacunas</dt>
            <dd>{exibido.lacunas}</dd>
            <dt>Meta 12 meses</dt>
            <dd>{exibido.meta12m}</dd>
            <dt>Meta 24 meses</dt>
            <dd>{exibido.meta24m}</dd>
            <dt>Recomendação</dt>
            <dd>{exibido.recomendacao}</dd>
          </dl>
        </>
      ) : (
        <p className="muted">Ainda não há plano registrado para este atleta.</p>
      )}
      {editando && (
        <PlanoDialogo
          atletaId={ficha.atleta.id}
          inicial={exibido ?? null}
          aoFechar={() => setEditando(false)}
        />
      )}
    </section>
  );
}
