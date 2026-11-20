import { useState } from "react";
import { iniciais } from "@/lib/auth/navegacao";

/** Foto da conta ou, sem foto (ou com link vencido), as iniciais do nome. Decorativo: o nome vem ao lado. */
export function Avatar({
  nome,
  fotoUrl,
  grande = false,
}: {
  nome: string;
  fotoUrl?: string | null | undefined;
  grande?: boolean;
}) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const mostrarFoto = !!fotoUrl && falhou !== fotoUrl;
  return (
    <span className={grande ? "avatar avatar-grande" : "avatar"} aria-hidden="true">
      {mostrarFoto ? (
        <img src={fotoUrl} alt="" onError={() => setFalhou(fotoUrl)} />
      ) : (
        iniciais(nome)
      )}
    </span>
  );
}
