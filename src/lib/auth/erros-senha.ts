/** Mensagem para o usuário quando o Supabase recusa a troca de senha. */
export interface ErroSenha {
  texto: string;
  /** A troca exige a verificação em duas etapas (AAL2): oferecer o link para /verificacao. */
  pedeVerificacao: boolean;
}

interface ErroSupabase {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
  name?: string | undefined;
  weak_password?: { reasons?: string[] | undefined } | undefined;
}

const MOTIVOS_FRACA: Record<string, string> = {
  length: "é curta demais",
  characters: "precisa misturar letras maiúsculas, minúsculas, números e símbolos",
  pwned: "já apareceu em vazamentos de dados",
};

/** Traduz o erro de `auth.updateUser({ password })` em texto útil, sem expor mensagem técnica. */
export function mensagemErroSenha(erro: unknown): ErroSenha {
  const e = (erro ?? {}) as ErroSupabase;
  const codigo = e.code ?? "";
  const msg = (e.message ?? "").toLowerCase();

  if (codigo === "insufficient_aal" || msg.includes("aal2") || msg.includes("insufficient_aal")) {
    return {
      texto:
        "Para trocar a senha, confirme sua identidade com o código do app autenticador (verificação em duas etapas).",
      pedeVerificacao: true,
    };
  }
  if (codigo === "same_password" || msg.includes("different from the old password")) {
    return { texto: "A nova senha precisa ser diferente da atual.", pedeVerificacao: false };
  }
  if (codigo === "weak_password" || msg.includes("weak")) {
    const motivos = (e.weak_password?.reasons ?? [])
      .map((r) => MOTIVOS_FRACA[r])
      .filter((r): r is string => !!r);
    return {
      texto: motivos.length
        ? `A senha é fraca: ${motivos.join("; ")}.`
        : "A senha é fraca demais. Use letras, números e símbolos, sem sequências óbvias.",
      pedeVerificacao: false,
    };
  }
  if (codigo === "reauthentication_needed" || codigo === "reauthentication_not_valid") {
    return {
      texto: "Por segurança, saia e entre de novo para poder trocar a senha.",
      pedeVerificacao: false,
    };
  }
  if (
    codigo === "session_not_found" ||
    codigo === "session_expired" ||
    codigo === "not_authenticated" ||
    codigo === "user_not_found" ||
    e.status === 401
  ) {
    return {
      texto: "Sua sessão expirou. Entre de novo e tente outra vez.",
      pedeVerificacao: false,
    };
  }
  if (codigo === "over_request_rate_limit" || e.status === 429) {
    return {
      texto: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.",
      pedeVerificacao: false,
    };
  }
  if (
    e.name === "AuthRetryableFetchError" ||
    e.status === 0 ||
    msg.includes("failed to fetch") ||
    msg.includes("network")
  ) {
    return {
      texto: "Sem conexão com o servidor. Verifique a internet e tente de novo.",
      pedeVerificacao: false,
    };
  }
  return { texto: "Não foi possível trocar a senha. Tente de novo.", pedeVerificacao: false };
}
