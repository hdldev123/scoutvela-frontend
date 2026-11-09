/* Simulated login for the prototype. Not real security: accounts live in code and in this browser only. */
export type Perfil = "gestor" | "treinador" | "atleta" | "ibvar";
export type Conta = { email: string; senha: string; nome: string; perfil: Perfil };

export const CONTAS_DEMO: Conta[] = [
  { email: "gestor@scoutvela.dev", senha: "gestor123", nome: "Gestor CBVela", perfil: "gestor" },
  { email: "treinadora@scoutvela.dev", senha: "treino123", nome: "Ana Ribeiro", perfil: "treinador" },
  { email: "atleta@scoutvela.dev", senha: "atleta123", nome: "Helena Vasques", perfil: "atleta" },
  { email: "ibvar@scoutvela.dev", senha: "ibvar123", nome: "IBVAR", perfil: "ibvar" },
];

const KEY = "scout-contas";

function extras(): Conta[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function entrar(email: string, senha: string, extra: Conta[] = []): Conta | null {
  const e = email.trim().toLowerCase();
  return [...CONTAS_DEMO, ...extra].find((c) => c.email === e && c.senha === senha) ?? null;
}

export function entrarNoNavegador(email: string, senha: string) {
  return entrar(email, senha, extras());
}

export function cadastrar(c: Conta): string | null {
  const email = c.email.trim().toLowerCase();
  if (!c.nome.trim()) return "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido.";
  if (c.senha.length < 6) return "A senha precisa ter ao menos 6 caracteres.";
  const todas = [...CONTAS_DEMO, ...extras()];
  if (todas.some((x) => x.email === email)) return "Este e-mail já tem conta.";
  localStorage.setItem(KEY, JSON.stringify([...extras(), { ...c, email }]));
  return null;
}
