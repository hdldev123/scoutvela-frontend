import { useAutoavaliacao, leituraDiferenca, textoDiferenca } from "@/lib/api/autoavaliacao";
import { mensagemDeErro } from "@/lib/api/cliente";
import "@/styles/autoavaliacao.css";

const CLASSE_DIF = {
  "dif-igual": "st-neutro",
  "dif-mais": "st-apto",
  "dif-menos": "st-alerta",
  "dif-na": "",
} as const;

/** Diferença com sinal, texto e cor: a cor nunca é a única pista (WCAG 1.4.1). */
function Diferenca({ valor, casas = 0 }: { valor: number | null; casas?: number }) {
  const { classe, texto } = leituraDiferenca(valor);
  if (valor == null) return <span className="muted">—</span>;
  return (
    <span className={`pill ${CLASSE_DIF[classe]}`} title={texto}>
      {textoDiferenca(valor, casas)}
      <span className="sr-only"> ({texto})</span>
    </span>
  );
}

/**
 * Bloco "Atleta × treinador" da ficha: sugestão, nota do treinador, diferença (treinador menos
 * atleta) e justificativa por indicador. O gestor recebe também a diferença média por pilar.
 * O IBVAR não monta o bloco (a API devolve 403 e a ficha dele nem o chama).
 */
export function ComparacaoAutoavaliacao({
  atletaId,
  pilares,
}: {
  atletaId: string;
  pilares: { id: string; nomeCurto: string }[];
}) {
  const consulta = useAutoavaliacao(atletaId);
  const nomePilar = (id: string) => pilares.find((p) => p.id === id)?.nomeCurto ?? id;

  return (
    <section className="panel ordem-comparacao" aria-labelledby="comp-titulo">
      <div className="panel-head">
        <h2 id="comp-titulo">Atleta × treinador</h2>
        {consulta.data?.ciclo && (
          <span className="muted panel-info">
            Ciclo {consulta.data.ciclo.nome}
            {consulta.data.ciclo.status === "fechado" ? " (fechado)" : ""}
          </span>
        )}
      </div>
      <Conteudo consulta={consulta} nomePilar={nomePilar} />
    </section>
  );
}

function Conteudo({
  consulta,
  nomePilar,
}: {
  consulta: ReturnType<typeof useAutoavaliacao>;
  nomePilar: (id: string) => string;
}) {
  if (consulta.isPending) {
    return (
      <p className="muted" role="status">
        Carregando a comparação…
      </p>
    );
  }
  if (consulta.isError) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(consulta.error, "Não foi possível carregar a comparação.")}
      </p>
    );
  }
  const { ciclo, indicadores, resumoPorPilar } = consulta.data;
  const comSugestao = indicadores.filter((i) => i.sugestao || i.treinador);
  if (!ciclo || comSugestao.length === 0) {
    return (
      <p className="muted">
        {ciclo
          ? "O atleta ainda não enviou sugestões neste ciclo."
          : "Sem ciclo para comparar: não há ciclo aberto nem fechado."}
      </p>
    );
  }
  return (
    <>
      <p className="panel-dica">
        A sugestão do atleta não entra no score: vale só a nota do treinador. Diferença = nota do
        treinador menos a do atleta.
      </p>
      {resumoPorPilar && resumoPorPilar.length > 0 && (
        <>
          <h3 style={{ margin: "8px 0 0", fontSize: "1rem" }}>Diferença média por pilar</h3>
          <ul className="comp-resumo">
            {resumoPorPilar.map((p) => (
              <li key={p.pilarId}>
                <span>{p.nomeCurto}</span>
                <Diferenca valor={p.diferencaMedia} casas={1} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Comparação por indicador"
      >
        <table className="data comp-tabela">
          <thead>
            <tr>
              <th scope="col">Indicador</th>
              <th scope="col" className="num">
                Sugestão do atleta
              </th>
              <th scope="col" className="num">
                Nota do treinador
              </th>
              <th scope="col" className="num">
                Diferença
              </th>
              <th scope="col">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {comSugestao.map((i) => (
              <tr key={i.indicadorId}>
                <th scope="row" data-rotulo="Indicador">
                  {i.nome}
                  <small className="muted" style={{ display: "block", fontWeight: 400 }}>
                    {nomePilar(i.pilarId)}
                  </small>
                </th>
                <td className="num" data-rotulo="Sugestão do atleta">
                  {i.sugestao ? i.sugestao.valor : "—"}
                </td>
                <td className="num" data-rotulo="Nota do treinador">
                  {i.treinador ? i.treinador.valor : "—"}
                </td>
                <td className="num" data-rotulo="Diferença">
                  <Diferenca valor={i.diferenca} />
                </td>
                <td className="comp-just" data-rotulo="Justificativa">
                  {i.treinador?.justificativa ??
                    (i.treinador?.origem === "autoavaliacao_aprovada" ? "Aprovada" : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
