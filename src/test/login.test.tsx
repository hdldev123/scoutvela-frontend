import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
vi.mock("@/lib/auth/supabase", () => ({
  getSupabase: () => ({
    auth: {
      signInWithPassword,
      signOut: vi.fn(),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

import { EntryScreen } from "@/components/scout/EntryScreen";
import { SessaoProvider, useSessao } from "@/lib/auth/sessao";

function Login() {
  const { entrar } = useSessao();
  return <EntryScreen onEntrar={entrar} />;
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessaoProvider>
        <Login />
      </SessaoProvider>
    </QueryClientProvider>,
  );
}

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
}

describe("login", () => {
  beforeEach(() => signInWithPassword.mockReset());

  it("chama signInWithPassword com e-mail e senha", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    montar();
    preencher("gestor@exemplo.com", "segredo");
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "gestor@exemplo.com", password: "segredo" }),
    );
  });

  it("mostra mensagem genérica em role=alert quando falha", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("Invalid login credentials") });
    montar();
    preencher("a@b.com", "errada");
    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha incorretos.");
  });

  it("não oferece autocadastro nem Google", () => {
    montar();
    expect(screen.queryByText(/cadastrar/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });
});
