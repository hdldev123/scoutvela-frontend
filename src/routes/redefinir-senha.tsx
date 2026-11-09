import { createFileRoute } from "@tanstack/react-router";

/** Fora do layout autenticado: a pessoa chega aqui pelo link do e-mail de redefinição ou de convite. */
export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir senha · Scout Vela" }] }),
  ssr: false,
  component: () => (
    <section className="panel empty-state">
      <h2>Redefinir senha</h2>
      <p>Em construção.</p>
    </section>
  ),
});
