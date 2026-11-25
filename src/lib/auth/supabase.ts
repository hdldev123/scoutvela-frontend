import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { capturarHashDoLink } from "./link-senha";

let cliente: SupabaseClient | null = null;

/** Cliente do Supabase Auth. Só existe no navegador: o app tem SSR e a sessão fica no storage local. */
export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("O cliente Supabase só pode ser usado no navegador.");
  }
  // Antes de criar o cliente: ele consome e limpa o hash do link de convite ou de redefinição.
  if (!cliente) capturarHashDoLink();
  cliente ??= createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: true, autoRefreshToken: true },
    },
  );
  return cliente;
}
