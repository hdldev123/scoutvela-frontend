/**
 * Link de convite ou de redefinição de senha (Supabase Auth, fluxo implícito).
 *
 * O supabase-js lê o hash da URL (`#access_token=…&type=invite|recovery`), cria a sessão e limpa
 * o hash. Se o link vier com erro (inválido, expirado ou já usado), ele não cria sessão nenhuma e
 * a sessão que já estava aberta no navegador continua valendo. Por isso a tela de senha não pode
 * confiar em "existe uma sessão": ela só aceita a sessão da conta que o próprio link autenticou
 * (auditoria de 25/11/2026, A7: o link de convite já usado trocava a senha do gestor logado).
 */

let hashCapturado: string | null = null;

/** Guarda o hash do carregamento da página antes de o supabase-js consumir o link. */
export function capturarHashDoLink(): void {
  if (hashCapturado === null && typeof window !== "undefined") {
    hashCapturado = window.location.hash;
  }
}

export interface LinkDeSenha {
  tipo: "convite" | "recuperacao";
  /** Conta autenticada pelo link (claim `sub` do token); nulo sem token no link. */
  sub: string | null;
  /** O link veio com erro (inválido, expirado ou já usado). */
  erro: boolean;
}

function subDoToken(token: string): string | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub !== "" ? sub : null;
  } catch {
    return null;
  }
}

/** Lê o link do hash capturado no carregamento (ou do hash atual, se ainda não foi capturado). */
export function lerLinkDeSenha(): LinkDeSenha {
  const hash = hashCapturado ?? (typeof window === "undefined" ? "" : window.location.hash);
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const token = q.get("access_token");
  return {
    tipo: q.get("type") === "invite" ? "convite" : "recuperacao",
    sub: token ? subDoToken(token) : null,
    erro: q.has("error") || q.has("error_code"),
  };
}
