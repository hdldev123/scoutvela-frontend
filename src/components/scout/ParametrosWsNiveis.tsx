import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MSG_SALVO } from "./parametros-util";
import {
  NIVEIS_DESTINO,
  WS_NIVEIS_MAX,
  WS_NOME_MAX,
  assinaturaWsNiveis,
  lerRegraWsNiveis,
  montarRegraWsNiveis,
  type LinhaWsNivel,
} from "./ws-niveis-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros } from "@/lib/api/parametros";
import "@/styles/world-sailing.css";

/**
 * Editor da regra `WS_NIVEIS` (P13, D19): como o nível de cada regata na World Sailing vira nível
 * no Scout Vela. Vale nas próximas importações; o que já foi importado não muda.
 */
export function FormWsNiveis({ valor, atualizadoEm }: { valor: unknown; atualizadoEm: string }) {
  const salvar = useSalvarParametros();
  const [inicial] = useState(() => lerRegraWsNiveis(valor));
  const [linhas, setLinhas] = useState<LinhaWsNivel[]>(inicial);
  const [proxima, setProxima] = useState(inicial.length + 1);
  const montada = montarRegraWsNiveis(linhas);
  const alterada = assinaturaWsNiveis(linhas) !== assinaturaWsNiveis(inicial);
  const data = new Date(atualizadoEm);

  const mudar = (chave: number, parte: Partial<LinhaWsNivel>) => {
    if (salvar.isError) salvar.reset();
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...parte } : l)));
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if ("erro" in montada || !alterada) return;
    salvar.mutate(
      { regras: { WS_NIVEIS: montada.valor } },
      { onSuccess: () => toast.success(MSG_SALVO) },
    );
  };

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="par-regra par-cartao par-cartao-largo"
      aria-label="WS_NIVEIS · Níveis da World Sailing"
    >
      <h3 className="par-cartao-titulo">
        <code className="par-cod">WS_NIVEIS</code>
        <span>Níveis da World Sailing</span>
      </h3>
      <p className="par-resumo">
        Regra provisória (P13). Diz como o nível de cada regata na World Sailing vira nível no Scout
        Vela. Vale nas próximas importações; os resultados já importados não mudam. Nível da World
        Sailing fora da tabela vale como internacional aberto e não pontua.
      </p>
      <table className="data par-ws-niveis">
        <thead>
          <tr>
            <th scope="col">Nível na World Sailing</th>
            <th scope="col">Nível no Scout Vela</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Nenhum nível na tabela: toda regata importada vale como internacional aberto.
              </td>
            </tr>
          )}
          {linhas.map((l, i) => {
            const nome = `linha ${i + 1}`;
            return (
              <tr key={l.chave}>
                <td>
                  <input
                    type="text"
                    maxLength={WS_NOME_MAX}
                    autoComplete="off"
                    aria-label={`Nível na World Sailing, ${nome}`}
                    value={l.nome}
                    onChange={(e) => mudar(l.chave, { nome: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    aria-label={`Nível no Scout Vela, ${nome}`}
                    value={l.nivel}
                    onChange={(e) =>
                      mudar(l.chave, { nivel: e.target.value as LinhaWsNivel["nivel"] })
                    }
                  >
                    <option value="">Escolha</option>
                    {NIVEIS_DESTINO.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.rotulo}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn sm ghost"
                    aria-label={`Remover ${nome}`}
                    onClick={() => {
                      if (salvar.isError) salvar.reset();
                      setLinhas((ls) => ls.filter((x) => x.chave !== l.chave));
                    }}
                  >
                    <i className="ph ph-trash" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="btn-row">
        <button
          type="button"
          className="btn sm"
          disabled={linhas.length >= WS_NIVEIS_MAX}
          onClick={() => {
            setLinhas((ls) => [...ls, { chave: proxima, nome: "", nivel: "" }]);
            setProxima(proxima + 1);
          }}
        >
          <i className="ph ph-plus" aria-hidden="true" /> Adicionar nível
        </button>
      </div>
      {"erro" in montada && alterada && (
        <p className="par-erro" role="alert">
          {montada.erro}
        </p>
      )}
      {salvar.error && (
        <p className="par-erro" role="alert">
          {mensagemDeErro(salvar.error)}
        </p>
      )}
      <div className="par-regra-rodape">
        <button
          className="btn sm primary"
          type="submit"
          aria-label="Salvar WS_NIVEIS · Níveis da World Sailing"
          disabled={"erro" in montada || !alterada || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </button>
        <span className="par-ajuda">
          Atualizada em{" "}
          {Number.isNaN(data.getTime())
            ? "—"
            : data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </span>
      </div>
    </form>
  );
}
