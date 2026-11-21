import createClient, { type Middleware } from "openapi-fetch";
import { getSupabase } from "@/lib/auth/supabase";
import type { paths } from "./schema";

export interface CampoComErro {
  campo: string;
  mensagem: string;
}

/** Erro devolvido pela API: `{ erro, mensagem }`. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    /** Erros de validação por campo (400): `{ campo: "notas.0.evidencia", mensagem }`. */
    readonly campos: readonly CampoComErro[] = [],
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

/** Extrai `{ erro, mensagem }` do corpo de erro da API (ou usa um texto padrão). */
export function mensagemDeErro(
  erro: unknown,
  padrao = "Não foi possível concluir a operação.",
): string {
  if (erro instanceof Error && erro.message) return erro.message;
  if (erro && typeof erro === "object" && "mensagem" in erro && typeof erro.mensagem === "string") {
    return erro.mensagem;
  }
  return padrao;
}

/** Converte o corpo de erro de uma resposta em `ErroApi`. */
export function paraErroApi(status: number, corpo: unknown): ErroApi {
  const c = (corpo && typeof corpo === "object" ? corpo : {}) as {
    erro?: unknown;
    mensagem?: unknown;
    campos?: unknown;
  };
  const campos = Array.isArray(c.campos)
    ? c.campos.filter(
        (x): x is CampoComErro =>
          !!x &&
          typeof x === "object" &&
          typeof (x as CampoComErro).campo === "string" &&
          typeof (x as CampoComErro).mensagem === "string",
      )
    : [];
  return new ErroApi(
    status,
    typeof c.erro === "string" ? c.erro : "erro_interno",
    mensagemDeErro(c),
    campos,
  );
}

/**
 * Erros de validação por campo de um `ErroApi` (400). A chave é o caminho com ponto, sem prefixo
 * ("notas.0.evidencia"); com vários erros no mesmo campo, vale o primeiro. Outro erro: `{}`.
 */
export function errosPorCampo(erro: unknown): Record<string, string> {
  const saida: Record<string, string> = {};
  if (!(erro instanceof ErroApi)) return saida;
  for (const { campo, mensagem } of erro.campos) {
    if (!(campo in saida)) saida[campo] = mensagem;
  }
  return saida;
}

export interface OpcoesMiddleware {
  /** Devolve o access_token da sessão atual (ou null). */
  obterToken: () => Promise<string | null>;
  /** Chamado em resposta 401 (sessão inválida ou expirada). */
  aoNaoAutenticado: () => void | Promise<void>;
}

/** Põe o Bearer da sessão em cada requisição; 401 encerra a sessão. */
export function criarMiddlewareAuth({
  obterToken,
  aoNaoAutenticado,
}: OpcoesMiddleware): Middleware {
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
  // O SessaoProvider reage ao SIGNED_OUT e o layout autenticado volta ao /entrar. Escopo local:
  // um 401 aqui não derruba a pessoa nos outros aparelhos.
  aoNaoAutenticado: async () => {
    await getSupabase().auth.signOut({ scope: "local" });
  },
});
