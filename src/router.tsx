import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Não repete erro 4xx (a resposta não muda); rede e 5xx têm até 2 novas tentativas. */
export function repetirConsulta(tentativas: number, erro: unknown): boolean {
  const status = (erro as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return tentativas < 2;
}

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: repetirConsulta } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
