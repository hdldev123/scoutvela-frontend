/** Rótulos legíveis dos códigos de ação e de entidade que o back grava na trilha de auditoria. */
export const ROTULO_ACAO: Record<string, string> = {
  abrir_ciclo: "Abriu ciclo",
  aceitar_termo: "Aceitou o termo",
  acessar_evidencia: "Acessou evidência",
  ajustar_prazo_ciclo: "Ajustou prazo do ciclo",
  alterar_consentimento: "Alterou consentimento",
  anexar_evidencia: "Anexou evidência",
  anonimizar_atleta: "Anonimizou atleta",
  atualizar_parametros: "Atualizou parâmetros",
  cadastrar_atleta: "Cadastrou atleta",
  convidar_usuario: "Convidou usuário",
  criar_primeiro_gestor: "Criou o primeiro gestor",
  criar_usuario: "Criou conta",
  decidir_gate: "Decidiu gate",
  editar_atleta: "Editou atleta",
  editar_perfil: "Editou o perfil",
  editar_usuario: "Editou conta",
  enviar_foto: "Enviou foto de perfil",
  exportar_dados: "Exportou dados do atleta",
  fechar_ciclo: "Fechou ciclo",
  importar_csv: "Importou CSV",
  informar_financeiro: "Informou financeiro",
  lancar_avaliacao: "Lançou avaliação",
  lancar_resultado: "Lançou resultado",
  pedir_revisao: "Pediu revisão de nota",
  pedir_titular: "Fez pedido do titular",
  publicar_termo: "Publicou termo de consentimento",
  registrar_aceite_termo: "Registrou aceite do termo",
  registrar_plano: "Registrou plano individual",
  remover_foto: "Removeu foto de perfil",
  responder_questionario: "Respondeu questionário",
  responder_revisao: "Respondeu revisão de nota",
  responder_titular: "Respondeu pedido do titular",
  vincular_conta: "Vinculou conta",
};

export const ROTULO_ENTIDADE: Record<string, string> = {
  atleta: "Atleta",
  atletas: "Atleta",
  ciclo: "Ciclo",
  consentimentos: "Consentimento",
  importacoes: "Importação",
  parametros: "Parâmetros",
  pedidos_revisao: "Revisão de nota",
  pedidos_titular: "Pedido do titular",
  respostas_atleta: "Resposta do atleta",
  termos_consentimento: "Termo",
  usuarios: "Conta",
};

/** Código desconhecido volta como veio. */
export const rotuloAcao = (acao: string): string => ROTULO_ACAO[acao] ?? acao;
export const rotuloEntidade = (entidade: string): string => ROTULO_ENTIDADE[entidade] ?? entidade;
