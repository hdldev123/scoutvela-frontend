import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente do Supabase Auth. Só existe no navegador: o app tem SSR e a sessão fica no storage local. */
export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("O cliente Supabase só pode ser usado no navegador.");
  }
  cliente ??= createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cliente;
}
