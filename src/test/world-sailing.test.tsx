import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkWsId } from "@/components/scout/LinkWsId";
import { mensagemWsId, normalizarWsId, urlPerfilWorldSailing } from "@/lib/world-sailing";

describe("urlPerfilWorldSailing", () => {
  it("monta o link do perfil com o ID codificado", () => {
    expect(urlPerfilWorldSailing("GBRHM15")).toBe("https://www.sailing.org/sailor/?ref=GBRHM15");
    expect(urlPerfilWorldSailing("BRA&x=1 #")).toBe(
      "https://www.sailing.org/sailor/?ref=BRA%26x%3D1%20%23",
    );
  });
});

describe("WS ID", () => {
  it("normaliza para maiúsculas e sem espaços", () => {
    expect(normalizarWsId(" bra js 12 ")).toBe("BRAJS12");
  });

  it("valida o formato, depois de normalizar", () => {
    expect(mensagemWsId("braJS12")).toBeNull();
    expect(mensagemWsId("ESPFE")).toBeNull();
    expect(mensagemWsId("")).toMatch(/Informe/);
    expect(mensagemWsId("12ABC")).toMatch(/inválido/);
    expect(mensagemWsId("BR")).toMatch(/inválido/);
    expect(mensagemWsId("BRAJS12345678901")).toMatch(/inválido/);
  });
});

describe("LinkWsId", () => {
  it("abre em nova aba, sem opener, com rótulo acessível e o nome do atleta", () => {
    render(<LinkWsId wsId="BRAJS12" nome="Júlia Souza" />);
    const link = screen.getByRole("link", {
      name: /Perfil de Júlia Souza no World Sailing [(]abre em nova aba[)]/,
    });
    expect(link.getAttribute("href")).toBe("https://www.sailing.org/sailor/?ref=BRAJS12");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.querySelector("code")?.textContent).toBe("BRAJS12");
    expect(link.textContent).toMatch(/^BRAJS12/);
  });

  it("sem nome (cadastro incompleto) usa o próprio ID no rótulo", () => {
    render(<LinkWsId wsId="BRAJS12" nome={null} />);
    expect(
      screen.getByRole("link", {
        name: /Perfil de BRAJS12 no World Sailing [(]abre em nova aba[)]/,
      }),
    ).toBeTruthy();
  });
});
