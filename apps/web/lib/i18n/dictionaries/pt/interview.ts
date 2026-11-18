import type { interview as En } from "../en/interview";

export const interview: typeof En = {
  loading: {
    generating: "Gerando as perguntas da sua entrevista…",
    connecting: "Conectando à sessão da entrevista…",
    notStarted: "Entrevista não iniciada.",
  },
  header: {
    fallbackCompany: "Entrevista",
    elapsed: "Tempo decorrido",
  },
  connection: {
    connecting: "Conectando…",
    connected: "Conectado",
    reconnecting: "Reconectando…",
    error: "Desconectado",
    reconnect: "Reconectar",
  },
  progress: {
    label: "Pergunta {current} de {total}",
  },
  stages: {
    PHONE_SCREEN: "Triagem por telefone",
    TECHNICAL: "Aprofundamento técnico",
    BEHAVIORAL: "Comportamental",
    SYSTEM_DESIGN: "System design",
  },
  stageTransition: {
    complete: "Etapa concluída",
    upNext: "A seguir",
  },
  question: {
    eyebrow: "Entrevistador · pergunta {order} de {total}",
    followUp: "aprofundamento",
    category: {
      technical: "Técnica",
      behavioral: "Comportamental",
      system_design: "System design",
      culture_fit: "Fit cultural",
    },
  },
  record: {
    ready: "Gravar resposta",
    speaking: "Ouvindo…",
    processing: "Processando…",
    idle: "Aguarde…",
    recording: "Gravando",
    start: "Gravar resposta",
    stop: "Parar gravação",
  },
  waveform: {
    listening: "ouvindo",
    interviewer: "entrevistador",
    active: "Áudio ativo: {label}",
    idle: "Áudio parado",
  },
  transcript: {
    you: "você",
    youSaid: "Você disse",
    transcribing: "transcrevendo…",
    evaluating: "avaliando…",
    score: "nota",
  },
  transition: {
    interviewer: "Entrevistador",
  },
  avatar: {
    speaking: "Falando…",
    listening: "Ouvindo",
    thinking: "Processando…",
    loading: "Conectando avatar…",
    fallback: "Modo áudio",
    interviewer: "Entrevistador IA",
  },
  selfView: {
    turnOn: "Ligar câmera",
    turnOff: "Desligar câmera",
  },
  shortcuts: {
    record: "gravar · parar",
    replay: "repetir a pergunta",
  },
  complete: {
    eyebrow: "Entrevista concluída",
    title: "Essa foi a última pergunta.",
    building: "Montando o seu relatório…",
  },
  alerts: {
    server: {
      title: "Algo deu errado",
      newInterview: "Começar uma nova entrevista",
    },
    start: {
      title: "Não foi possível iniciar a entrevista",
      retrying: "Tentando de novo…",
      back: "Voltar à configuração",
    },
    submit: {
      title: "Sua resposta não foi enviada",
      retryUpload: "Reenviar",
      retrying: "Tentando de novo…",
      recordAgain: "Gravar de novo",
    },
    mic: {
      title: "O acesso ao microfone está bloqueado",
      body: "Permita o acesso ao microfone para este site nas configurações do navegador e tente de novo.",
    },
    recording: {
      title: "Problema na gravação",
    },
  },
  errors: {
    network: "Erro de rede — verifique sua conexão",
    startFailed: "Não foi possível iniciar a entrevista",
    startFailedStatus: "Não foi possível iniciar a entrevista ({status})",
    submitFailed: "Não foi possível enviar sua resposta",
    uploadNetwork: "Erro de rede — não foi possível enviar sua resposta",
    recordStartFailed: "Não foi possível iniciar a gravação",
    recordFailed: "A gravação falhou — tente de novo",
    noMicrophone: "Nenhum microfone foi encontrado. Conecte um e tente de novo.",
  },
  serverErrors: {
    AUDIO_UNAVAILABLE:
      "Não foi possível gerar o áudio desta pergunta. Leia o texto e grave sua resposta.",
    NO_QUESTION: "Nenhuma pergunta atual encontrada.",
    REPORT_FAILED:
      "Não foi possível gerar o seu relatório. Suas respostas estão salvas — você pode tentar de novo na página do relatório.",
  },
  errorPage: {
    eyebrow: "Sessão de entrevista",
    title: "Algo deu errado",
    body: "Algo deu errado durante a entrevista. Seu progresso foi salvo.",
    reconnect: "Reconectar",
    newInterview: "Começar nova entrevista",
  },
};
