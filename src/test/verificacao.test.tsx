import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listFactors = vi.fn();
const enroll = vi.fn();
const unenroll = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();
const navigate = vi.fn();
const sair = vi.fn();
const useMeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/supabase", () => ({
  getSupabase: () => ({ auth: { mfa: { listFactors, enroll, unenroll, challenge, verify } } }),
}));
vi.mock("@/lib/auth/sessao", () => ({
  useSessao: () => ({ carregando: false, sessao: { access_token: "t" }, sair }),
  useMe: () => useMeMock(),
}));
vi.mock("@tanstack/react-router", async (importar) => ({
  ...(await importar<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
  Navigate: ({ to }: { to: string }) => <div data-testid="navegar" data-to={to} />,
}));

import { TelaVerificacao } from "@/components/scout/TelaVerificacao";
import { ErroApi } from "@/lib/api/cliente";
import { LayoutAutenticado } from "@/routes/_app";

function montar(filho: ReactNode) {
  const qc = new QueryClient();
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}>{filho}</QueryClientProvider>);
  return inv;
}

beforeEach(() => {
  vi.clearAllMocks();
  challenge.mockResolvedValue({ data: { id: "ch1" }, error: null });
  verify.mockResolvedValue({ data: {}, error: null });
});

describe("TelaVerificacao", () => {
  it("sem fator verificado cadastra um, mostra QR e segredo e confirma o código", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [], all: [{ id: "velho", factor_type: "totp", status: "unverified" }] },
      error: null,
    });
    enroll.mockResolvedValue({
      data: {
        id: "f1",
        type: "totp",
        totp: { qr_code: "data:image/svg+xml;utf8,<svg/>", secret: "JBSWY3DP" },
      },
      error: null,
    });
    const inv = montar(<TelaVerificacao />);
    expect(await screen.findByAltText("QR code para o app autenticador")).toHaveAttribute(
      "src",
      "data:image/svg+xml;utf8,<svg/>",
    );
    expect(screen.getByText("JBSWY3DP")).toBeTruthy();
    expect(unenroll).toHaveBeenCalledWith({ factorId: "velho" });
    expect(enroll).toHaveBeenCalledWith({ factorType: "totp" });
    expect(screen.getByText(/dados de todos os atletas/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Código de 6 dígitos"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Ativar e entrar/ }));
    await waitFor(() =>
      expect(verify).toHaveBeenCalledWith({ factorId: "f1", challengeId: "ch1", code: "123456" }),
    );
    expect(challenge).toHaveBeenCalledWith({ factorId: "f1" });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
    expect(inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))).toContain('["me"]');
  });

  it("com fator verificado só pede o código", async () => {
    listFactors.mockResolvedValue({ data: { totp: [{ id: "f9" }], all: [] }, error: null });
    montar(<TelaVerificacao />);
    const campo = await screen.findByLabelText("Código de 6 dígitos");
    expect(enroll).not.toHaveBeenCalled();
    expect(screen.queryByAltText("QR code para o app autenticador")).toBeNull();
    fireEvent.change(campo, { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar →" }));
    await waitFor(() =>
      expect(verify).toHaveBeenCalledWith({ factorId: "f9", challengeId: "ch1", code: "654321" }),
    );
  });

  it("mostra erro quando o código está errado e não navega", async () => {
    listFactors.mockResolvedValue({ data: { totp: [{ id: "f9" }], all: [] }, error: null });
    verify.mockResolvedValue({ data: null, error: new Error("invalid") });
    montar(<TelaVerificacao />);
    fireEvent.change(await screen.findByLabelText("Código de 6 dígitos"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar →" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Código incorreto/);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("Sair encerra a sessão", async () => {
    listFactors.mockResolvedValue({ data: { totp: [{ id: "f9" }], all: [] }, error: null });
    montar(<TelaVerificacao />);
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
    await waitFor(() => expect(sair).toHaveBeenCalled());
  });
});

describe("layout autenticado", () => {
  it("redireciona para /verificacao quando a API responde mfa_obrigatorio", () => {
    useMeMock.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ErroApi(403, "mfa_obrigatorio", "Verificação em duas etapas obrigatória."),
      refetch: vi.fn(),
    });
    montar(<LayoutAutenticado />);
    expect(screen.getByTestId("navegar").getAttribute("data-to")).toBe("/verificacao");
  });
});
