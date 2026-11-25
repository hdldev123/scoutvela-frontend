import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PUT = vi.fn();
const sair = vi.fn();
const useMeMock = vi.hoisted(() => vi.fn());
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { PUT: (...a: unknown[]) => PUT(...a) },
}));
vi.mock("sonner", () => ({ toast: toastFn, Toaster: () => null }));
vi.mock("@/lib/auth/sessao", () => ({
  useSessao: () => ({ carregando: false, sessao: { access_token: "t" }, sair }),
  useMe: () => useMeMock(),
}));
vi.mock("@/components/scout/Shell", () => ({
  Shell: ({ me, children }: { me: unknown; children: React.ReactNode }) => (
    <div data-testid="shell" data-com-menu={me ? "sim" : "nao"}>
      {children}
    </div>
  ),
}));
vi.mock("@tanstack/react-router", async (importar) => ({
  ...(await importar<typeof import("@tanstack/react-router")>()),
  Outlet: () => <div data-testid="outlet" />,
  Navigate: ({ to }: { to: string }) => <div data-testid="navegar" data-to={to} />,
}));

import { LayoutAutenticado } from "@/components/scout/LayoutAutenticado";

const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const falha = (status: number, mensagem: string, campos?: unknown[]) => ({
  data: undefined,
  error: { erro: "requisicao_invalida", mensagem, ...(campos ? { campos } : {}) },
  response: { status },
});

const SUGESTAO = { nome: "Bruno Lima", genero: "M", dataNascimento: "2005-03-02" };

function me(cadastroPendente: unknown) {
  return {
    usuario: { id: "u1", nome: "Bruno", email: "b@x.com", papel: "atleta", fotoUrl: null },
    atleta: { id: "a1", nome: null },
    cadastroPendente,
    telas: ["painel", "ficha"],
    telaInicial: "painel",
  };
}

function montar(cadastroPendente: unknown) {
  useMeMock.mockReturnValue({
    data: me(cadastroPendente),
    isPending: false,
    error: null,
    refetch: vi.fn(),
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <LayoutAutenticado />
    </QueryClientProvider>,
  );
  return inv;
}

beforeEach(() => vi.clearAllMocks());

describe("Primeiro acesso do atleta", () => {
  it("sem cadastro pendente segue para as telas normais", () => {
    montar(null);
    expect(screen.getByTestId("outlet")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Complete seu cadastro" })).toBeNull();
  });

  it("com cadastro pendente mostra a tela, sem as outras telas, com a sugestão e o WS ID", () => {
    montar({ wsId: "BRABL05", velaid: "MG-T15", sugestao: SUGESTAO });
    expect(screen.getByRole("heading", { level: 1, name: "Complete seu cadastro" })).toBeTruthy();
    expect(screen.queryByTestId("outlet")).toBeNull();
    expect(screen.getByTestId("shell").getAttribute("data-com-menu")).toBe("nao");
    expect((screen.getByLabelText("Nome completo") as HTMLInputElement).value).toBe("Bruno Lima");
    expect((screen.getByLabelText("Data de nascimento") as HTMLInputElement).value).toBe(
      "2005-03-02",
    );
    expect((screen.getByRole("radio", { name: "Masculino" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByText(/Preenchemos com os dados do seu cadastro no VelaID/)).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "Perfil de BRABL05 no World Sailing (abre em nova aba)",
    });
    expect(link.getAttribute("href")).toBe("https://www.sailing.org/sailor/?ref=BRABL05");
    expect(screen.getByText(/Pedimos só o que o programa usa/)).toBeTruthy();
  });

  it("envia os dados, invalida o ['me'] e agradece", async () => {
    PUT.mockResolvedValue(
      ok({ nome: "Bruno Lima", genero: "M", dataNascimento: "2005-03-02", cadastroCompleto: true }),
    );
    const inv = montar({ wsId: "BRABL05", velaid: "MG-T15", sugestao: SUGESTAO });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "  Bruno Souza Lima " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/cadastro", {
        body: { nome: "Bruno Souza Lima", genero: "M", dataNascimento: "2005-03-02" },
      }),
    );
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    await waitFor(() =>
      expect(inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))).toContain('["me"]'),
    );
  });

  it("sem sugestão os campos começam vazios e a validação aparece embaixo de cada um", () => {
    montar({ wsId: "BRABL05", velaid: null, sugestao: null });
    expect((screen.getByLabelText("Nome completo") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText(/Preenchemos com os dados/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));
    expect(screen.getByText("O nome precisa ter de 2 a 120 caracteres.")).toBeTruthy();
    expect(screen.getByText("Escolha o gênero.")).toBeTruthy();
    expect(screen.getByText("Informe a data de nascimento.")).toBeTruthy();
    expect(screen.getByLabelText("Nome completo").getAttribute("aria-invalid")).toBe("true");
    expect(PUT).not.toHaveBeenCalled();
  });

  it("erro 400 por campo fica embaixo do campo", async () => {
    PUT.mockResolvedValue(
      falha(400, "Requisição inválida.", [
        { campo: "dataNascimento", mensagem: "A data não pode estar no futuro." },
      ]),
    );
    montar({ wsId: "BRABL05", velaid: null, sugestao: SUGESTAO });
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));
    const msg = await screen.findByText("A data não pode estar no futuro.");
    expect(screen.getByLabelText("Data de nascimento").getAttribute("aria-describedby")).toBe(
      msg.id,
    );
  });

  it("menor de 18 anos: mostra a mensagem do piloto e a saída encerra a sessão", async () => {
    const texto =
      "O piloto do Scout Vela aceita só atletas com 18 anos ou mais. Seu cadastro foi encerrado e a CBVela foi avisada.";
    PUT.mockResolvedValue(falha(400, texto));
    const inv = montar({ wsId: "BRABL05", velaid: null, sugestao: SUGESTAO });
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));
    expect(await screen.findByRole("heading", { name: "Cadastro encerrado" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("18 anos ou mais");
    expect(screen.queryByRole("button", { name: "Concluir cadastro" })).toBeNull();
    expect(inv).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(sair).toHaveBeenCalled();
  });
});
