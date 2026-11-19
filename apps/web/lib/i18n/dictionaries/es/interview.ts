import type { interview as En } from "../en/interview";

export const interview: typeof En = {
  loading: {
    generating: "Generando las preguntas de tu entrevista…",
    connecting: "Conectando a la sesión de entrevista…",
    notStarted: "Entrevista no iniciada.",
  },
  header: {
    fallbackCompany: "Entrevista",
    elapsed: "Tiempo transcurrido",
  },
  connection: {
    connecting: "Conectando…",
    connected: "Conectado",
    reconnecting: "Reconectando…",
    error: "Desconectado",
    reconnect: "Reconectar",
  },
  progress: {
    label: "Pregunta {current} de {total}",
  },
  stages: {
    PHONE_SCREEN: "Llamada inicial",
    TECHNICAL: "Profundización técnica",
    BEHAVIORAL: "Conductual",
    SYSTEM_DESIGN: "Diseño de sistemas",
  },
  stageTransition: {
    complete: "Etapa completada",
    upNext: "A continuación",
  },
  question: {
    eyebrow: "Entrevistador · pregunta {order} de {total}",
    followUp: "repregunta",
  },
  record: {
    ready: "Grabar respuesta",
    speaking: "Escuchando…",
    processing: "Procesando…",
    idle: "Espera un momento…",
    recording: "Grabando",
    start: "Grabar respuesta",
    stop: "Terminar respuesta y continuar",
    play: "Escuchar pregunta",
    stopAudio: "Detener audio",
  },
  waveform: {
    listening: "escuchando",
    interviewer: "entrevistador",
    active: "Audio activo: {label}",
    idle: "Audio en pausa",
  },
  transcript: {
    you: "tú",
    youSaid: "Dijiste",
    transcribing: "transcribiendo…",
    evaluating: "evaluando…",
    score: "puntaje",
  },
  transition: {
    interviewer: "Entrevistador",
  },
  avatar: {
    speaking: "Hablando…",
    listening: "Escuchando",
    thinking: "Procesando…",
    loading: "Conectando avatar…",
    fallback: "Modo audio",
    interviewer: "Entrevistador IA",
  },
  selfView: {
    turnOn: "Encender cámara",
    turnOff: "Apagar cámara",
  },
  shortcuts: {
    record: "grabar · detener",
    replay: "repetir la pregunta",
    pause: "pausar · continuar",
  },
  complete: {
    eyebrow: "Entrevista completada",
    title: "Esa fue la última pregunta.",
    building: "Armando tu informe…",
  },
  alerts: {
    server: {
      title: "Algo salió mal",
      newInterview: "Empezar una nueva entrevista",
    },
    start: {
      title: "No se pudo iniciar la entrevista",
      retrying: "Reintentando…",
      back: "Volver a la configuración",
      notFound: "Esta entrevista no existe o se inició en otro navegador.",
    },
    submit: {
      title: "Tu respuesta no se envió",
      retryUpload: "Reintentar envío",
      recordAgain: "Grabar de nuevo",
    },
    mic: {
      title: "El acceso al micrófono está bloqueado",
      body: "Permite el acceso al micrófono para este sitio en la configuración del navegador y vuelve a intentarlo.",
    },
    recording: {
      title: "Problema con la grabación",
    },
  },
  stop: {
    button: "Terminar entrevista",
    confirm: "¿Terminar la entrevista? Se descartará la grabación en curso y no podrás reanudar esta sesión.",
    stopping: "Terminando la entrevista…",
    failed: "No se pudo terminar la entrevista. Inténtalo de nuevo.",
  },
  pause: {
    eyebrow: "respira",
    title: "En pausa",
    body: "El entrevistador está esperando. Nada corre en el servidor mientras estás en pausa: el cronómetro se detiene, la grabación está apagada y puedes leer la pregunta con calma.",
    noTokens: "no se gastan tokens durante la pausa",
    button: "Pausar",
    resume: "Continuar",
    askCoach: "Preguntar al coach",
  },
  coach: {
    title: "Coach",
    eyebrow: "pregunta sobre esta pregunta",
    open: "Coach",
    close: "Cerrar coach",
    explainThis: "Explícame esto",
    placeholder: "Pregunta sobre la pregunta o sobre tu respuesta…",
    send: "Preguntar",
    cancel: "Detener",
    thinking: "Pensando…",
    empty: "Resalta una parte de la pregunta o de tu respuesta y elige “Explícame esto”, o escribe una pregunta abajo.",
    beforeAnswer: "preguntaste antes de responder · marcado en el informe",
    afterAnswer: "preguntaste después de responder",
    otherQuestions: "Preguntas anteriores",
    model: "modelo",
    disabled: "El coach está desactivado en esta sesión.",
  },
  errorPage: {
    eyebrow: "Sesión de entrevista",
    title: "Algo salió mal",
    body: "Algo salió mal durante la entrevista. Tu progreso quedó guardado.",
    reconnect: "Reconectar",
    newInterview: "Empezar nueva entrevista",
  },
};
