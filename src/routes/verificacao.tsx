import { createFileRoute } from "@tanstack/react-router";

/** Fora do layout autenticado: cadastro e desafio do segundo fator (TOTP), exigido pela API para gestor e IBVAR. */
export const Route = createFileRoute("/verificacao")({
  head: () => ({ meta: [{ title: "Verificação em duas etapas · Scout Vela" }] }),
  ssr: false,
  component: () => (
    <section className="panel empty-state">
      <h2>Verificação em duas etapas</h2>
      <p>Em construção.</p>
    </section>
  ),
});
