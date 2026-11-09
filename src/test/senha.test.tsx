import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const getSession = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/auth/supabase", () => ({
  getSupabase: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail,
      updateUser,
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, to, ...resto }: { children: ReactNode; to: string }) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
}));

import { EntryScreen, MENSAGEM_RECUPERACAO } from "@/components/scout/EntryScreen";
import { TelaRedefinirSenha } from "@/components/scout/TelaRedefinirSenha";
import { SessaoProvider, useSessao } from "@/lib/auth/sessao";

function Login() {
  const { entrar, recuperarSenha } = useSessao();
  return <EntryScreen onEntrar={entrar} onRecuperar={recuperarSenha} />;
}

function montar(filho: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessaoProvider>{filho}</SessaoProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
  getSession.mockResolvedValue({ data: { session: null } });
});

describe("esqueci a senha", () => {
  it("chama resetPasswordForEmail com redirectTo e mostra mensagem neutra", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    montar(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Esqueci a senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@cbvela.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText(MENSAGEM_RECUPERACAO)).toBeTruthy();
    expect(MENSAGEM_RECUPERACAO).toBe("Se o e-mail tiver conta, você vai receber um link.");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("ana@cbvela.org", {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
  });

  it("mostra a mesma mensagem mesmo se o envio falhar", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: new Error("User not found") });
    montar(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Esqueci a senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "x@y.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText(MENSAGEM_RECUPERACAO)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("não carrega vídeo por padrão", () => {
    montar(<Login />);
    expect(document.querySelector("video")).toBeNull();
    expect(document.querySelector("img.entry-photo")).not.toBeNull();
  });
});

describe("redefinir senha", () => {
  const sessao = { data: { session: { access_token: "t", user: { id: "u" } } } };

  function preencher(senha: string, confirmacao: string) {
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: senha } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), {
      target: { value: confirmacao },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar senha/ }));
  }

  it("valida tamanho e confirmação antes de chamar updateUser", async () => {
    getSession.mockResolvedValue(sessao);
    montar(<TelaRedefinirSenha />);
    await screen.findByRole("heading", { name: "Redefinir senha" });
    preencher("curta", "curta");
    expect((await screen.findByRole("alert")).textContent).toMatch(/pelo menos 10 caracteres/);
    preencher("senha-longa-123", "senha-longa-999");
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("As senhas não coincidem."),
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("salva a senha e leva para a raiz", async () => {
    getSession.mockResolvedValue(sessao);
    updateUser.mockResolvedValue({ error: null });
    montar(<TelaRedefinirSenha />);
    await screen.findByRole("heading", { name: "Redefinir senha" });
    preencher("senha-longa-123", "senha-longa-123");
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "senha-longa-123" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
  });

  it("usa o título Definir senha para convite", async () => {
    window.location.hash = "#access_token=abc&type=invite";
    getSession.mockResolvedValue(sessao);
    montar(<TelaRedefinirSenha />);
    expect(await screen.findByRole("heading", { name: "Definir senha" })).toBeTruthy();
  });

  it("sem sessão mostra link inválido e caminho para pedir outro", async () => {
    montar(<TelaRedefinirSenha />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/inválido ou expirou/);
    expect(screen.getByRole("link", { name: "Ir para o login" }).getAttribute("href")).toBe(
      "/entrar",
    );
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });
});
