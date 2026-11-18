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
    category: {
      technical: "Técnica",
      behavioral: "Conductual",
      system_design: "Diseño de sistemas",
      culture_fit: "Encaje cultural",
    },
  },
  record: {
    ready: "Grabar respuesta",
    speaking: "Escuchando…",
    processing: "Procesando…",
    idle: "Espera un momento…",
    recording: "Grabando",
    start: "Grabar respuesta",
    stop: "Detener grabación",
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
    },
    submit: {
      title: "Tu respuesta no se envió",
      retryUpload: "Reintentar envío",
      retrying: "Reintentando…",
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
  errors: {
    network: "Error de red — revisa tu conexión",
    startFailed: "No se pudo iniciar la entrevista",
    startFailedStatus: "No se pudo iniciar la entrevista ({status})",
    submitFailed: "No se pudo enviar tu respuesta",
    uploadNetwork: "Error de red — no se pudo subir tu respuesta",
    recordStartFailed: "No se pudo iniciar la grabación",
    recordFailed: "La grabación falló — vuelve a intentarlo",
    noMicrophone: "No se encontró ningún micrófono. Conecta uno y vuelve a intentarlo.",
  },
  serverErrors: {
    AUDIO_UNAVAILABLE:
      "No se pudo generar el audio de esta pregunta. Léela y graba tu respuesta.",
    NO_QUESTION: "No se encontró una pregunta actual.",
    REPORT_FAILED:
      "No pudimos generar tu informe. Tus respuestas están guardadas — puedes reintentar desde la página del informe.",
  },
  errorPage: {
    eyebrow: "Sesión de entrevista",
    title: "Algo salió mal",
    body: "Algo salió mal durante la entrevista. Tu progreso quedó guardado.",
    reconnect: "Reconectar",
    newInterview: "Empezar nueva entrevista",
  },
};
