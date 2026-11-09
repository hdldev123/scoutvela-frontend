import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { useParametros } from "@/lib/api/avaliacao";
import { mensagemDeErro } from "@/lib/api/cliente";
import type { FichaAtleta } from "@/lib/api/consultas";
import { atualizarFinanceiro, type CorpoFinanceiro } from "@/lib/api/mutacoes-ficha";

type Componente = CorpoFinanceiro["componentes"][number];
type Perfil = CorpoFinanceiro["perfilSuporte"];
type Linha = Omit<Componente, "componenteId">;

export const PERFIS: { valor: Perfil; texto: string }[] = [
  { valor: "A", texto: "A · Alta autonomia" },
  { valor: "B", texto: "B · Autonomia parcial" },
  { valor: "C", texto: "C · Alta dependência" },
  { valor: "D", texto: "D · Estrutura insuficiente" },
];
const AUTONOMIA: Componente["autonomia"][] = ["alta", "parcial", "baixa"];
const APOIO: Componente["apoioCbvela"][] = ["baixa", "media", "alta"];
const ROTULO_APOIO: Record<Componente["apoioCbvela"], string> = {
  baixa: "baixo",
  media: "médio",
  alta: "alto",
};

/** A ficha devolve "Baixa", "Média"...; o envio usa minúsculas sem acento. */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function FormFinanceiro({
  atletaId,
  atual,
  custos,
  aoFechar,
}: {
  atletaId: string;
  atual: FichaAtleta["financeiro"];
  custos: { id: string; nome: string }[];
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const completo = atual && "componentes" in atual ? atual : null;
  const [perfil, setPerfil] = useState<Perfil | "">(atual?.perfilSuporte ?? "");
  const [meses, setMeses] = useState(
    completo?.mesesAssegurados == null ? "" : String(completo.mesesAssegurados),
  );
  const [patrocinio, setPatrocinio] = useState<string>(completo?.patrocinioPrivado ?? "");
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      custos.map((c) => {
        const ex = completo?.componentes.find((x) => x.id === c.id);
        const aut = ex ? normalizar(ex.autonomia) : "";
        const apo = ex ? normalizar(ex.apoioCbvela) : "";
        const linha: Linha = {
          autonomia: (AUTONOMIA as string[]).includes(aut)
            ? (aut as Componente["autonomia"])
            : "parcial",
          apoioCbvela: (APOIO as string[]).includes(apo)
            ? (apo as Componente["apoioCbvela"])
            : "media",
        };
        return [c.id, linha];
      }),
    ),
  );
  const [erro, setErro] = useState("");

  const enviar = useMutation({
    mutationFn: (corpo: CorpoFinanceiro) => atualizarFinanceiro(atletaId, corpo),
    onSuccess: async () => {
      toast("Financeiro da campanha atualizado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        queryClient.invalidateQueries({ queryKey: ["ranking"] }),
        queryClient.invalidateQueries({ queryKey: ["investimento"] }),
      ]);
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível atualizar o financeiro.")),
  });

  const mudar = (id: string, parte: Partial<Linha>) =>
    setLinhas((l) => ({ ...l, [id]: { ...(l[id] as Linha), ...parte } }));

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!perfil) return setErro("Escolha o perfil de suporte (A a D).");
    const n = meses.trim() === "" ? null : Number(meses);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 120)) {
      return setErro("Meses assegurados: um número inteiro de 0 a 120.");
    }
    setErro("");
    enviar.mutate({
      perfilSuporte: perfil,
      mesesAssegurados: n,
      patrocinioPrivado: patrocinio === "" ? null : (patrocinio as "sim" | "em_negociacao" | "nao"),
      componentes: custos.map((c) => ({ componenteId: c.id, ...(linhas[c.id] as Linha) })),
    });
  }

  return (
    <form className="stack" onSubmit={submeter} noValidate>
      <p className="muted ficha-dica">
        O financeiro não entra no score. Ele alimenta o gate G4 (Campanha) e o painel de
        investimento. O perfil de suporte é informado pelo gestor (regra provisória P8). Cada
        atualização cria um novo registro.
      </p>
      <label className="field" htmlFor="fin-perfil">
        Perfil de suporte
        <select
          id="fin-perfil"
          autoFocus
          value={perfil}
          onChange={(e) => setPerfil(e.target.value as Perfil | "")}
        >
          <option value="">Escolha o perfil</option>
          {PERFIS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.texto}
            </option>
          ))}
        </select>
      </label>
      <div className="ficha-duas-colunas">
        <label className="field" htmlFor="fin-meses">
          Meses assegurados
          <input
            id="fin-meses"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
          />
        </label>
        <label className="field" htmlFor="fin-patrocinio">
          Patrocínio privado
          <select
            id="fin-patrocinio"
            value={patrocinio}
            onChange={(e) => setPatrocinio(e.target.value)}
          >
            <option value="">Não informado</option>
            <option value="sim">Sim</option>
            <option value="em_negociacao">Em negociação</option>
            <option value="nao">Não</option>
          </select>
        </label>
      </div>
      {custos.length > 0 && (
        <fieldset className="ficha-componentes">
          <legend>Componentes de custo</legend>
          {custos.map((c) => (
            <div key={c.id} className="ficha-componente">
              <b>{c.nome}</b>
              <label className="field" htmlFor={`fin-aut-${c.id}`}>
                Autonomia da família
                <select
                  id={`fin-aut-${c.id}`}
                  value={linhas[c.id]?.autonomia}
                  onChange={(e) =>
                    mudar(c.id, { autonomia: e.target.value as Componente["autonomia"] })
                  }
                >
                  {AUTONOMIA.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor={`fin-apoio-${c.id}`}>
                Apoio necessário da CBVela
                <select
                  id={`fin-apoio-${c.id}`}
                  value={linhas[c.id]?.apoioCbvela}
                  onChange={(e) =>
                    mudar(c.id, { apoioCbvela: e.target.value as Componente["apoioCbvela"] })
                  }
                >
                  {APOIO.map((a) => (
                    <option key={a} value={a}>
                      {ROTULO_APOIO[a]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </fieldset>
      )}
      {erro && (
        <p className="note" role="alert">
          {erro}
        </p>
      )}
      <div className="btn-row">
        <button type="submit" className="btn primary" disabled={enviar.isPending}>
          {enviar.isPending ? "Salvando…" : "Salvar financeiro"}
        </button>
        <button type="button" className="btn" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Diálogo "Atualizar financeiro" (só gestor). Os componentes de custo vêm de `GET /parametros`. */
export function FinanceiroDialog({
  atletaId,
  atual,
  aoFechar,
}: {
  atletaId: string;
  atual: FichaAtleta["financeiro"];
  aoFechar: () => void;
}) {
  const params = useParametros();
  return (
    <Dialogo titulo="Atualizar financeiro da campanha" aoFechar={aoFechar}>
      {params.isPending && <p className="muted">Carregando componentes de custo…</p>}
      {params.isError && (
        <p className="note" role="alert">
          {mensagemDeErro(params.error)}
        </p>
      )}
      {params.data && (
        <FormFinanceiro
          atletaId={atletaId}
          atual={atual}
          custos={params.data.componentesCusto}
          aoFechar={aoFechar}
        />
      )}
    </Dialogo>
  );
}
