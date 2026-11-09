import { useMe } from "@/lib/auth/sessao";
import { SemAcesso } from "./SemAcesso";

/** Placeholder das telas ainda não implementadas. Respeita `me.telas`. */
export function EmConstrucao({ tela, titulo }: { tela: string; titulo: string }) {
  const { data: me } = useMe();
  if (me && !me.telas.includes(tela)) return <SemAcesso />;
  return (
    <section className="panel empty-state">
      <h2>{titulo}</h2>
      <p>Em construção.</p>
    </section>
  );
}
