import createClient, { type Middleware } from "openapi-fetch";
import { getSupabase } from "@/lib/auth/supabase";
import type { paths } from "./schema";

/** Erro devolvido pela API: `{ erro, mensagem }`. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

/** Extrai `{ erro, mensagem }` do corpo de erro da API (ou usa um texto padrão). */
export function mensagemDeErro(erro: unknown, padrao = "Não foi possível concluir a operação."): string {
  if (erro instanceof Error && erro.message) return erro.message;
  if (erro && typeof erro === "object" && "mensagem" in erro && typeof erro.mensagem === "string") {
    return erro.mensagem;
  }
  return padrao;
}

/** Converte o corpo de erro de uma resposta em `ErroApi`. */
export function paraErroApi(status: number, corpo: unknown): ErroApi {
  const c = (corpo && typeof corpo === "object" ? corpo : {}) as { erro?: unknown; mensagem?: unknown };
  return new ErroApi(
    status,
    typeof c.erro === "string" ? c.erro : "erro_interno",
    mensagemDeErro(c),
  );
}

export interface OpcoesMiddleware {
  /** Devolve o access_token da sessão atual (ou null). */
  obterToken: () => Promise<string | null>;
  /** Chamado em resposta 401 (sessão inválida ou expirada). */
  aoNaoAutenticado: () => void | Promise<void>;
}

/** Põe o Bearer da sessão em cada requisição; 401 encerra a sessão. */
export function criarMiddlewareAuth({ obterToken, aoNaoAutenticado }: OpcoesMiddleware): Middleware {
  return {
    async onRequest({ request }) {
      const token = await obterToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 401) await aoNaoAutenticado();
      return response;
    },
  };
}

export function criarClienteApi(baseUrl: string, opcoes: OpcoesMiddleware) {
  const c = createClient<paths>({ baseUrl });
  c.use(criarMiddlewareAuth(opcoes));
  return c;
}

/** Cliente tipado da API. Só chamar no navegador (usa a sessão do Supabase). */
export const api = criarClienteApi(import.meta.env.VITE_API_URL, {
  obterToken: async () => {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  },
  // O SessaoProvider reage ao SIGNED_OUT e o layout autenticado volta ao /entrar.
  aoNaoAutenticado: async () => {
    await getSupabase().auth.signOut();
  },
});
