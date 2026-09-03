/** Texto do termo de autônomo assinado no início de cada turno — mesmo
 * espírito do extras-app: reafirmado a cada turno, não só uma vez no
 * cadastro. Estrutura pedida pelo Thiago (objeto/autonomia, responsabilidades,
 * remuneração, vigência/rescisão), adaptada pro modelo real daqui (paga por
 * banda feita, não por valor/dia fixo, e vale só pro turno em curso).
 * Revisar com jurídico antes de operar de verdade. */
export const TERMO_AUTONOMO: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Objeto e autonomia",
    texto:
      "Estou iniciando este turno como motoboy autônomo, prestando serviço de coleta e entrega de mercadorias de forma pontual e sem exclusividade, sem vínculo empregatício com a cooperativa ou com a empresa cliente atendida — tenho total liberdade de horários e de aceitação dos turnos.",
  },
  {
    titulo: "2. Minhas responsabilidades",
    texto:
      "Declaro utilizar veículo próprio em perfeitas condições de uso, manutenção e documentação, arcando com todos os custos de combustível, manutenção, seguro e tributos da minha atividade; possuir CNH válida e compatível com a categoria do veículo; e zelar pela integridade das mercadorias transportadas desde a coleta até a entrega.",
  },
  {
    titulo: "3. Remuneração",
    texto:
      "Estou ciente de que o pagamento é feito por banda (corrida) realizada, conforme os valores combinados com a cooperativa, e que taxas extras se aplicam apenas quando informadas por mim ao final do turno. Confirmo que a foto e a assinatura registradas agora comprovam minha chegada real neste local, na data e hora atuais.",
  },
  {
    titulo: "4. Vigência e rescisão",
    texto:
      "Este termo vale exclusivamente para o turno em curso, encerrando-se automaticamente ao final dele. Posso encerrar o turno a qualquer momento, sem direito a indenização, bastando avisar a cooperativa.",
  },
];
