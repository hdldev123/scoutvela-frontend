export function SemAcesso({
  mensagem = "Esta tela não faz parte do seu perfil.",
}: {
  mensagem?: string;
}) {
  return (
    <div className="panel empty-state">
      <h2>Sem acesso para este perfil</h2>
      <p>{mensagem}</p>
      <p className="muted">
        Cada perfil só vê o que precisa: a regra fica no banco, não só na tela.
      </p>
    </div>
  );
}
