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
  },
  record: {
    ready: "Gravar resposta",
    speaking: "Ouvindo…",
    processing: "Processando…",
    idle: "Aguarde…",
    recording: "Gravando",
    start: "Gravar resposta",
    stop: "Concluir resposta e continuar",
    play: "Ouvir pergunta",
    stopAudio: "Parar áudio",
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
    pause: "pausar · retomar",
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
      notFound: "Esta entrevista não existe ou foi iniciada em outro navegador.",
    },
    submit: {
      title: "Sua resposta não foi enviada",
      retryUpload: "Reenviar",
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
  stop: {
    button: "Encerrar entrevista",
    confirm: "Encerrar a entrevista? A gravação em andamento será descartada e a sessão não poderá ser retomada.",
    stopping: "Encerrando entrevista…",
    failed: "Não foi possível encerrar a entrevista. Tente novamente.",
  },
  pause: {
    eyebrow: "respire fundo",
    title: "Pausado",
    body: "O entrevistador está esperando. Nada roda no servidor enquanto você está em pausa: o cronômetro para, a gravação fica desligada e você pode ler a pergunta com calma.",
    noTokens: "nenhum token é gasto durante a pausa",
    button: "Pausar",
    resume: "Retomar",
    askCoach: "Perguntar ao coach",
  },
  coach: {
    title: "Coach",
    eyebrow: "pergunte sobre esta pergunta",
    open: "Coach",
    close: "Fechar coach",
    explainThis: "Explicar isto",
    placeholder: "Pergunte sobre a pergunta ou sobre a sua resposta…",
    send: "Perguntar",
    cancel: "Parar",
    thinking: "Pensando…",
    empty: "Destaque um trecho da pergunta ou da sua resposta e escolha “Explicar isto”, ou digite uma pergunta abaixo.",
    beforeAnswer: "perguntou antes de responder · marcado no relatório",
    afterAnswer: "perguntou depois de responder",
    otherQuestions: "Perguntas anteriores",
    model: "modelo",
    disabled: "O coach está desligado nesta sessão.",
  },
  errorPage: {
    eyebrow: "Sessão de entrevista",
    title: "Algo deu errado",
    body: "Algo deu errado durante a entrevista. Seu progresso foi salvo.",
    reconnect: "Reconectar",
    newInterview: "Começar nova entrevista",
  },
};
