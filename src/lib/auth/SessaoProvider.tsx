import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Contexto } from "./sessao";
import { getSupabase } from "./supabase";

export function SessaoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Id do usuário do cache atual: se mudar (troca de conta sem SIGNED_OUT), o cache é descartado.
  const idAtual = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      idAtual.current = data.session?.user.id ?? null;
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, nova) => {
      const id = nova?.user.id ?? null;
      const trocou =
        id !== idAtual.current && (idAtual.current !== null || evento === "SIGNED_OUT");
      idAtual.current = id;
      setSessao(nova);
      setCarregando(false);
      if (evento === "SIGNED_OUT" || trocou) queryClient.clear();
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
    try {
      const resultado = await getSupabase().auth.signOut();
      // Sem rede, o logout global falha: sai ao menos neste aparelho.
      if (resultado?.error) await getSupabase().auth.signOut({ scope: "local" });
    } catch {
      await getSupabase().auth.signOut({ scope: "local" });
    } finally {
      queryClient.clear();
    }
  }, [queryClient]);

  const valor = useMemo(
    () => ({ carregando, sessao, entrar, sair, recuperarSenha }),
    [carregando, sessao, entrar, sair, recuperarSenha],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
