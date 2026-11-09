import { beforeAll, describe, expect, it } from "vitest";
import { createScout } from "@/lib/scout/engine.js";

let S: any;
beforeAll(() => {
  document.body.innerHTML = `<select id="perfil"><option value="gestor">g</option></select><nav id="tabs"></nav><main id="app"></main><div id="toast"></div>`;
  S = createScout(document.body);
});

describe("Scout Vela rules", () => {
  it("default weights sum to 100", () => {
    expect(Object.values(S.PESOS_PADRAO).reduce((a: number, b: any) => a + b, 0)).toBe(100);
  });
  it("score bands", () => {
    expect(S.faixa(85).nome).toBe("Prioridade de programa");
    expect(S.faixa(84.9).nome).toBe("Alto potencial");
    expect(S.faixa(65).nome).toBe("Em desenvolvimento");
    expect(S.faixa(64.9).nome).toBe("No radar");
  });
  it("class fit grade by relative distance", () => {
    expect([0.5, 1, 1.5, 2, 3, 3.1].map(S.notaPeso)).toEqual([5, 4, 3, 2, 1, 0]);
  });
});
