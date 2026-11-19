import type { errors as En } from "../en/errors";

export const errors: typeof En = {
  ref: "ref {digest}",
  global: {
    eyebrow: "[ erro ] algo quebrou",
    title: "Não saiu como planejado.",
    body: "Um erro inesperado interrompeu esta página. Tentar de novo costuma resolver.",
    tryAgain: "Tentar de novo",
    goHome: "Ir para o início",
  },
  notFound: {
    eyebrow: "[ 404 ] não encontrado",
    title: "Não há nada neste endereço.",
    body: "A página pode ter mudado de lugar, ou o link nunca esteve certo.",
    goHome: "Ir para o início",
    startInterview: "Começar uma entrevista",
  },
  report: {
    eyebrow: "[ relatório ] indisponível",
    title: "Este relatório não carregou.",
    body: "Ele ainda pode estar sendo gerado, ou a sessão pode não existir mais.",
    backToHistory: "Voltar ao histórico",
  },
  missingApiKey:
    "{envVar} não está definida. Adicione-a em apps/web/.env.local ou ative o modo mock.",
  api: {
    INVALID_JSON: "Não foi possível ler a requisição. Recarregue a página e tente de novo.",
    INVALID_REQUEST: "Alguns dados enviados são inválidos. Confira e tente de novo.",
    INVALID_MULTIPART: "Não foi possível enviar a gravação. Grave de novo.",
    NO_AUDIO: "Nenhuma gravação foi recebida. Grave sua resposta de novo.",
    EMPTY_AUDIO: "A gravação veio vazia. Verifique o microfone e grave de novo.",
    TOO_LARGE: "Essa gravação é longa demais para enviar. Tente uma resposta mais curta.",
    CLIENT_ID_REQUIRED:
      "Não foi possível identificar este navegador. Recarregue a página e tente de novo.",
    UNSUPPORTED_MEDIA_TYPE:
      "A requisição foi enviada num formato não suportado. Recarregue a página e tente de novo.",
    CROSS_SITE:
      "Requisições de outros sites são bloqueadas. Abra o InterviewIQ diretamente e tente de novo.",
    FORBIDDEN: "Esta sessão pertence a outro navegador.",
    RATE_LIMITED: "Requisições demais. Aguarde um instante e tente de novo.",
    SESSION_NOT_FOUND: "Esta sessão não existe ou foi excluída.",
    NOT_FOUND: "Não foi possível encontrar isso.",
    NOT_INTERVIEWING: "Esta entrevista não está aceitando respostas agora.",
    ABANDONED: "Esta entrevista foi encerrada e não pode ser retomada.",
    ALREADY_COMPLETED: "Esta entrevista já foi concluída.",
    NOT_FINISHED: "Termine a entrevista antes de gerar o relatório.",
    ANSWER_IN_FLIGHT: "Sua resposta anterior ainda está sendo processada.",
    COACH_DISABLED: "O coach está desligado nesta sessão.",
    NO_AVATAR_STREAM: "O entrevistador em vídeo não está conectado.",
    NO_QUESTION: "Nenhuma pergunta atual encontrada.",
    NO_ANSWERS: "Ainda não há respostas para montar um relatório.",
    MISSING_API_KEY:
      "Uma chave de API de provedor não está configurada. Adicione-a em apps/web/.env.local ou ative o modo mock.",
    UPSTREAM_RATE_LIMITED:
      "O provedor de IA está limitando as requisições. Tente de novo em instantes.",
    EMPTY_QUESTION_SET:
      "O entrevistador não conseguiu gerar perguntas para esta vaga. Tente de novo.",
    AUDIO_UNAVAILABLE:
      "Não foi possível gerar o áudio desta pergunta. Leia o texto e grave sua resposta.",
    AVATAR_UNAVAILABLE: "O entrevistador em vídeo não está disponível. Seguimos só com áudio.",
    AVATAR_QUOTA:
      "O serviço de vídeo atingiu o limite de transmissões simultâneas. Seguimos só com áudio.",
    AVATAR_NO_CREDITS: "A conta do serviço de vídeo está sem créditos. Seguimos só com áudio.",
    PARSE_FAILED: "Não foi possível analisar a descrição da vaga. Tente de novo.",
    START_FAILED: "Não foi possível iniciar a entrevista. Tente de novo.",
    ANSWER_FAILED: "Não foi possível processar sua resposta. Tente de novo.",
    REPORT_FAILED:
      "Não foi possível gerar o seu relatório. Suas respostas estão salvas — você pode tentar de novo na página do relatório.",
    COACH_FAILED: "O coach não está disponível agora.",
    INTERNAL_ERROR: "Algo deu errado. Tente de novo.",
  },
  client: {
    NETWORK: "Erro de rede — verifique sua conexão e tente de novo.",
    MIC_NOT_FOUND: "Nenhum microfone foi encontrado. Conecte um e tente de novo.",
    RECORD_START_FAILED: "Não foi possível iniciar a gravação.",
    RECORD_FAILED: "A gravação falhou — tente de novo.",
    UNKNOWN: "Algo deu errado. Tente de novo.",
  },
};
