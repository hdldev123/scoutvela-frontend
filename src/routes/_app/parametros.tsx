import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaParametros } from "@/components/scout/TelaParametros";
import { lerProposta, type PropostaClasse } from "@/components/scout/parametros-util";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/parametros")({
  head: () => ({ meta: [{ title: "Parâmetros · Scout Vela" }] }),
  // Proposta de uma sugestão aprovada (D7): `?classe=&min=&med=&max=`, aba #classes.
  validateSearch: (busca: Record<string, unknown>): Partial<PropostaClasse> => {
    const p = lerProposta(busca);
    return p ? { classe: p.classe, min: p.min, med: p.med, max: p.max } : {};
  },
  component: RotaParametros,
});

function RotaParametros() {
  const { data: me } = useMe();
  const busca = Route.useSearch();
  const proposta = lerProposta(busca);
  if (!me) return null;
  if (!me.telas.includes("parametros")) return <SemAcesso />;
  return <TelaParametros papel={me.usuario.papel} {...(proposta ? { proposta } : {})} />;
}
