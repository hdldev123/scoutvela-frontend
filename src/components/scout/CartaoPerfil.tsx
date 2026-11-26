import { Avatar } from "./Avatar";
import { ConquistasResumo } from "./ConquistasResumo";
import { LinkWsId } from "./LinkWsId";
import { fmtInstante } from "./formato";
import type { FichaAtleta } from "@/lib/api/consultas";

/**
 * Cartão de perfil no topo da ficha: foto (ou iniciais), nome, identificação, mini bio e
 * conquistas. Mostra só o que a API devolveu ao papel; para o IBVAR, foto e bio vêm nulas
 * sem consentimento e sem o aceite do termo que as inclui.
 */
export function CartaoPerfil({ ficha }: { ficha: FichaAtleta }) {
  const { atleta, conquistas } = ficha;
  const local = [
    atleta.clube,
    atleta.cidade && atleta.uf ? `${atleta.cidade}/${atleta.uf}` : (atleta.cidade ?? atleta.uf),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="athlete-id cartao-perfil">
      <Avatar nome={atleta.nome} fotoUrl={atleta.fotoUrl} grande />
      <div className="athlete-txt">
        <div className="eyebrow">
          Ficha individual{ficha.ciclo ? ` · ciclo de ${ficha.ciclo.nome}` : ""}
        </div>
        <h1>{atleta.nome}</h1>
        <ul className="facts">
          <li>
            <i className="ph ph-identification-card" aria-hidden="true" />
            <span className="fato-rot">ID World Sailing</span>{" "}
            <LinkWsId wsId={atleta.wsId} nome={atleta.nome} />
          </li>
          <li>
            <i className="ph ph-identification-badge" aria-hidden="true" />
            <span className="fato-rot">VelaID</span>{" "}
            {atleta.velaid ? <code>{atleta.velaid}</code> : "—"}
          </li>
          <li>
            <i className="ph ph-sailboat" aria-hidden="true" />
            {atleta.classe.nome} · {atleta.funcao}
          </li>
          <li>
            <i className="ph ph-cake" aria-hidden="true" />
            {atleta.idade} anos
          </li>
          {local && (
            <li>
              <i className="ph ph-map-pin" aria-hidden="true" />
              {local}
            </li>
          )}
          {/* Muda com o barco e a classe: informação secundária, não identifica o atleta. */}
          {atleta.numeroVela && (
            <li>
              <span className="fato-rot">Nº de vela</span> {atleta.numeroVela}
            </li>
          )}
          {ficha.dadosAtualizadosEm && (
            <li>
              <i className="ph ph-clock-counter-clockwise" aria-hidden="true" />
              Dados deste atleta atualizados em {fmtInstante(ficha.dadosAtualizadosEm)}
            </li>
          )}
          {ficha.contato?.treinador && (
            <li>
              <i className="ph ph-user" aria-hidden="true" />
              <span className="fato-rot">Treinador(a)</span> {ficha.contato.treinador.nome}
            </li>
          )}
        </ul>
        {atleta.bio && <p className="cartao-bio">{atleta.bio}</p>}
        <ConquistasResumo conquistas={conquistas} nome={atleta.nome} />
      </div>
    </div>
  );
}
