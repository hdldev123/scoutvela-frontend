import { Navigate, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Shell } from "@/components/scout/Shell";
import { ErroApi } from "@/lib/api/cliente";
import { useMe, useSessao } from "@/lib/auth/sessao";

function Aviso({ texto }: { texto: string }) {
  return (
    <p role="status" className="muted" style={{ padding: 24 }}>
      {texto}
    </p>
  );
}

export function LayoutAutenticado() {
  const { carregando, sessao, sair } = useSessao();
  const { data: me, error, isPending, refetch } = useMe();

  if (carregando) return <Aviso texto="Carregando…" />;
  if (!sessao) return <Navigate to="/entrar" replace />;

  if (error instanceof ErroApi && error.codigo === "mfa_obrigatorio") {
    return <Navigate to="/verificacao" replace />;
  }

  if (error) {
    const semAcesso = error instanceof ErroApi && error.status === 403;
    return (
      <Shell me={null} onSair={sair}>
        <section className="panel empty-state">
          <h2>{semAcesso ? "Sem acesso" : "Não foi possível carregar seu perfil"}</h2>
          <p>
            {semAcesso
              ? "Sua conta não tem acesso ao Scout Vela neste piloto. Fale com a CBVela."
              : error.message}
          </p>
          {!semAcesso && (
            <button type="button" className="side-logout" onClick={() => void refetch()}>
              Tentar de novo
            </button>
          )}
        </section>
      </Shell>
    );
  }
  if (isPending || !me) return <Aviso texto="Carregando…" />;

  return (
    <Shell me={me} onSair={sair}>
      <Outlet />
      <Toaster position="bottom-center" />
    </Shell>
  );
}
