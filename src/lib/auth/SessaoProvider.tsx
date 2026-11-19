import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Contexto } from "./sessao";
import { getSupabase } from "./supabase";

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

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/redefinir-senha",
    });
    if (error) throw error;
  }, []);

  const sair = useCallback(async () => {
    await getSupabase().auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const valor = useMemo(
    () => ({ carregando, sessao, entrar, sair, recuperarSenha }),
    [carregando, sessao, entrar, sair, recuperarSenha],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
