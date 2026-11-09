import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaFicha } from "@/components/scout/TelaFicha";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/atletas/$id")({
  head: () => ({ meta: [{ title: "Ficha do atleta · Scout Vela" }] }),
  component: RotaFicha,
});

function RotaFicha() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  if (!me) return null;
  // A tela vale para quem tem ranking (gestor, treinador, ibvar) ou a própria ficha (atleta).
  if (!me.telas.includes("ranking") && !me.telas.includes("ficha")) return <SemAcesso />;
  return <TelaFicha key={id} id={id} papel={me.usuario.papel} />;
}
