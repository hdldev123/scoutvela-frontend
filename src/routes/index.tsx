import { createFileRoute, Navigate } from "@tanstack/react-router";
import { rotaDaTelaInicial } from "@/lib/auth/navegacao";
import { useMe, useSessao } from "@/lib/auth/sessao";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scout Vela · Talent ID da vela olímpica" },
      { name: "description", content: "Talent ID da vela olímpica: ranking, fichas, avaliações e painel de investimento." },
    ],
  }),
  component: Index,
});

function Carregando() {
  return (
    <p role="status" className="muted" style={{ padding: 24 }}>
      Carregando…
    </p>
  );
}

function Index() {
  const { carregando, sessao } = useSessao();
  const me = useMe();

  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/entrar" replace />;
  if (me.data) return <Navigate to={rotaDaTelaInicial(me.data.telaInicial)} replace />;
  // Falha no /me: o layout autenticado mostra o erro ou o aviso de sem acesso.
  if (me.isError) return <Navigate to="/painel" replace />;
  return <Carregando />;
}
