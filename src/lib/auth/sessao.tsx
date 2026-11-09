import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, paraErroApi } from "@/lib/api/cliente";
import { getSupabase } from "./supabase";

interface ContextoSessao {
  carregando: boolean;
  sessao: Session | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova);
      setCarregando(false);
      if (evento === "SIGNED_OUT") queryClient.clear();
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }, []);

  const sair = useCallback(async () => {
    await getSupabase().auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const valor = useMemo(() => ({ carregando, sessao, entrar, sair }), [carregando, sessao, entrar, sair]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ContextoSessao {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSessao precisa estar dentro de SessaoProvider.");
  return c;
}

/** Dados de `GET /me`: papel, telas liberadas, atleta vinculado e tela inicial. */
export function useMe() {
  const { sessao } = useSessao();
  return useQuery({
    queryKey: ["me"],
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
