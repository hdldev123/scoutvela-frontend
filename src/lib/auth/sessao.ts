import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import { api, paraErroApi } from "@/lib/api/cliente";

export interface ContextoSessao {
  carregando: boolean;
  sessao: Session | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  /** Envia o link de redefinição de senha (o Supabase não revela se o e-mail tem conta). */
  recuperarSenha: (email: string) => Promise<void>;
}

export const Contexto = createContext<ContextoSessao | null>(null);

export function useSessao(): ContextoSessao {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSessao precisa estar dentro de SessaoProvider.");
  return c;
}

/** Dados de `GET /me`: papel, telas liberadas, atleta vinculado e tela inicial. */
export function useMe() {
  const { sessao } = useSessao();
  return useQuery({
    queryKey: ["me", sessao?.user.id ?? null],
    enabled: !!sessao,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/me");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}
