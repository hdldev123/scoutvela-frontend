import { iniciais } from "@/lib/auth/navegacao";

/** Foto da conta ou, sem foto, as iniciais do nome. Decorativo: o nome vem ao lado. */
export function Avatar({
  nome,
  fotoUrl,
  grande = false,
}: {
  nome: string;
  fotoUrl?: string | null | undefined;
  grande?: boolean;
}) {
  return (
    <span className={grande ? "avatar avatar-grande" : "avatar"} aria-hidden="true">
      {fotoUrl ? <img src={fotoUrl} alt="" /> : iniciais(nome)}
    </span>
  );
}
