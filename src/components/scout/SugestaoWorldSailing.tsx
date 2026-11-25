import { useState } from "react";
import { toast } from "sonner";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useDecidirSugestaoWorldSailing, type Perfil } from "@/lib/api/perfil";
import "@/styles/world-sailing.css";

type Sugestao = NonNullable<Perfil["sugestaoWorldSailing"]>;

const HOST_FOTO = "https://assets.sailing.org/";

/**
 * Cartão "Sugestão da World Sailing" do Meu perfil (atleta): foto e bio do perfil público, que o
 * atleta usa ou dispensa uma vez. A foto de prévia vem direto do site da World Sailing (a CSP libera
 * só esse host); o download que vale é feito pelo servidor. Sem prévia (imagem que não carrega),
 * o botão "Usar foto" continua valendo. Os botões seguem o que veio: sem foto, não há "Usar foto".
 */
export function SugestaoWorldSailing({ sugestao }: { sugestao: Sugestao }) {
  const decidir = useDecidirSugestaoWorldSailing();
  const [semPrevia, setSemPrevia] = useState(false);
  const foto = sugestao.fotoUrl?.startsWith(HOST_FOTO) ? sugestao.fotoUrl : null;
  const bio = sugestao.bio?.trim() ? sugestao.bio : null;
  if (!foto && !bio) return null;

  function decidirCom(usarFoto: boolean, usarBio: boolean) {
    decidir.mutate(
      { usarFoto, usarBio },
      {
        onSuccess: (r) => {
          if (!r.usouFoto && !r.usouBio) toast("Sugestão da World Sailing dispensada");
          else if (r.usouFoto && r.usouBio) toast("Foto e bio da World Sailing aplicadas");
          else
            toast(r.usouFoto ? "Foto da World Sailing aplicada" : "Bio da World Sailing aplicada");
        },
      },
    );
  }

  return (
    <div className="perfil-item perfil-item-form ws-sugestao" data-testid="sugestao-ws">
      <p className="perfil-desc">
        Encontramos {foto && bio ? "uma foto e uma bio" : foto ? "uma foto" : "uma bio"} no seu
        perfil público da World Sailing. Você escolhe se usa no Scout Vela; nada é aplicado sem a
        sua confirmação. A escolha vale uma vez: o que você não usar agora é dispensado. A bio vai
        cortada em 500 caracteres. O IBVAR só vê foto e bio se você consentiu e aceitou o termo que
        inclui foto e mini bio.
      </p>
      <div className="ws-sugestao-corpo">
        {foto && !semPrevia && (
          <img
            className="ws-sugestao-foto"
            src={foto}
            alt="Prévia da foto sugerida pela World Sailing"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setSemPrevia(true)}
          />
        )}
        <div>
          {foto && semPrevia && (
            <p className="perfil-desc">Não foi possível mostrar a prévia da foto aqui.</p>
          )}
          {bio && <p className="ws-sugestao-bio">{bio}</p>}
        </div>
      </div>
      {decidir.isError && (
        <p role="alert" className="field-error">
          {mensagemDeErro(decidir.error, "Não foi possível aplicar a sugestão.")}
        </p>
      )}
      <div className="perfil-acoes">
        {foto && (
          <button
            type="button"
            className="btn"
            disabled={decidir.isPending}
            onClick={() => decidirCom(true, false)}
          >
            Usar foto
          </button>
        )}
        {bio && (
          <button
            type="button"
            className="btn"
            disabled={decidir.isPending}
            onClick={() => decidirCom(false, true)}
          >
            Usar bio
          </button>
        )}
        {foto && bio && (
          <button
            type="button"
            className="btn primary"
            disabled={decidir.isPending}
            onClick={() => decidirCom(true, true)}
          >
            Usar as duas
          </button>
        )}
        <button
          type="button"
          className="btn ghost"
          disabled={decidir.isPending}
          onClick={() => decidirCom(false, false)}
        >
          Dispensar
        </button>
      </div>
    </div>
  );
}
