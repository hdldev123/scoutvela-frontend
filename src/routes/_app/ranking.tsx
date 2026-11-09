import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaRanking } from "@/components/scout/TelaRanking";
import { useMe } from "@/lib/auth/sessao";
import type { FiltrosRanking } from "@/lib/api/consultas";

const FAIXAS = ["f1", "f2", "f3", "f4"] as const;

/** Search params do ranking: valores desconhecidos são descartados. */
function validarBusca(busca: Record<string, unknown>): FiltrosRanking {
  const { classe, categoria, faixa, ordem } = busca;
  const out: FiltrosRanking = {};
  if (typeof classe === "string" && classe) out.classe = classe;
  if (categoria === "F" || categoria === "M") out.categoria = categoria;
  if (typeof faixa === "string" && (FAIXAS as readonly string[]).includes(faixa)) {
    out.faixa = faixa as NonNullable<FiltrosRanking["faixa"]>;
  }
  if (ordem === "pontos_cbvela") out.ordem = "pontos_cbvela";
  return out;
}

export const Route = createFileRoute("/_app/ranking")({
  head: () => ({ meta: [{ title: "Ranking · Scout Vela" }] }),
  validateSearch: validarBusca,
  component: RotaRanking,
});

function RotaRanking() {
  const { data: me } = useMe();
  const filtros = Route.useSearch();
  const navigate = Route.useNavigate();
  if (!me) return null;
  if (!me.telas.includes("ranking")) return <SemAcesso />;
  return (
    <TelaRanking
      papel={me.usuario.papel}
      filtros={filtros}
      aoMudarFiltros={(novos) => void navigate({ search: validarBusca(novos), replace: true })}
    />
  );
}
