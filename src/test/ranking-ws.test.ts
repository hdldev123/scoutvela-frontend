import { describe, expect, it } from "vitest";
import { eixoPosicao, rotuloMes } from "@/components/scout/ranking-ws-util";
import { resumoDaBusca, seriesDoRanking, type PontoRanking } from "@/lib/api/world-sailing";

const p = (data: string, classe: string, tipo: string | null, posicao: number): PontoRanking => ({
  data,
  classe,
  tipo,
  posicao,
  pontos: null,
});

describe("seriesDoRanking", () => {
  it("agrupa por classe e tipo, em ordem cronológica, a maior série primeiro", () => {
    const series = seriesDoRanking([
      p("2026-09-01", "ILCA 6", "Senior", 12),
      p("2026-09-01", "ILCA 7", null, 80),
      p("2026-03-01", "ILCA 6", "Senior", 31),
    ]);
    expect(series.map((s) => s.rotulo)).toEqual(["ILCA 6 · Senior", "ILCA 7"]);
    expect(series[0]!.pontos.map((x) => x.data)).toEqual(["2026-03-01", "2026-09-01"]);
  });

  it("separa o mesmo barco com tipos diferentes", () => {
    const series = seriesDoRanking([
      p("2026-09-01", "ILCA 6", "Senior", 12),
      p("2026-09-01", "ILCA 6", "Youth", 3),
    ]);
    expect(series).toHaveLength(2);
  });
});

describe("eixoPosicao", () => {
  it("começa perto do 1 e termina depois da pior posição, com marcas inteiras", () => {
    const e = eixoPosicao([12, 20, 31]);
    expect(e.topo).toBeGreaterThanOrEqual(1);
    expect(e.topo).toBeLessThan(12);
    expect(e.base).toBeGreaterThan(31);
    expect(e.marcas.every(Number.isInteger)).toBe(true);
  });

  it("com uma só posição, ainda tem altura", () => {
    const e = eixoPosicao([1]);
    expect(e.topo).toBe(1);
    expect(e.base).toBeGreaterThan(e.topo);
  });
});

describe("textos", () => {
  it("rotula o mês", () => {
    expect(rotuloMes("2026-03-15")).toBe("03/26");
  });

  it("resume a busca em português", () => {
    expect(resumoDaBusca({ status: "ok", resultadosNovos: 1, rankingNovos: 1 })).toBe(
      "Importados da World Sailing: 1 resultado e 1 posição de ranking.",
    );
    expect(resumoDaBusca({ status: "ok", resultadosNovos: 0, rankingNovos: 0 })).toMatch(
      /nada novo/,
    );
    expect(
      resumoDaBusca({ status: "nao_encontrado", resultadosNovos: 0, rankingNovos: 0 }),
    ).toMatch(/não foi encontrado/);
    expect(resumoDaBusca({ status: "falhou", resultadosNovos: 0, rankingNovos: 0 })).toMatch(
      /Tente atualizar mais tarde/,
    );
  });
});
