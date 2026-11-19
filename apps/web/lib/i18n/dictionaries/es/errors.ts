import type { errors as En } from "../en/errors";

export const errors: typeof En = {
  ref: "ref {digest}",
  global: {
    eyebrow: "[ error ] algo se rompió",
    title: "Esto no salió como estaba planeado.",
    body: "Un error inesperado detuvo esta página. Intentarlo de nuevo suele arreglarlo.",
    tryAgain: "Intentar de nuevo",
    goHome: "Ir al inicio",
  },
  notFound: {
    eyebrow: "[ 404 ] no encontrado",
    title: "No hay nada en esta dirección.",
    body: "Puede que la página se haya movido, o que el enlace nunca fuera correcto.",
    goHome: "Ir al inicio",
    startInterview: "Empezar una entrevista",
  },
  report: {
    eyebrow: "[ informe ] no disponible",
    title: "Este informe no cargó.",
    body: "Puede que todavía se esté generando, o que la sesión ya no exista.",
    backToHistory: "Volver al historial",
  },
  missingApiKey: "{envVar} no está definida. Añádela en apps/web/.env.local o activa el modo mock.",
  api: {
    INVALID_JSON: "No se pudo leer la solicitud. Recarga la página y vuelve a intentarlo.",
    INVALID_REQUEST: "Algunos datos enviados no son válidos. Revísalos y vuelve a intentarlo.",
    INVALID_MULTIPART: "No se pudo subir la grabación. Vuelve a grabar.",
    NO_AUDIO: "No se recibió ninguna grabación. Vuelve a grabar tu respuesta.",
    EMPTY_AUDIO: "La grabación está vacía. Revisa el micrófono y vuelve a grabar.",
    TOO_LARGE: "La grabación es demasiado larga para subirla. Prueba con una respuesta más corta.",
    CLIENT_ID_REQUIRED:
      "No se pudo identificar este navegador. Recarga la página y vuelve a intentarlo.",
    UNSUPPORTED_MEDIA_TYPE:
      "La solicitud se envió en un formato no compatible. Recarga la página y vuelve a intentarlo.",
    CROSS_SITE:
      "Se bloquean las solicitudes desde otros sitios. Abre InterviewIQ directamente y vuelve a intentarlo.",
    FORBIDDEN: "Esta sesión pertenece a otro navegador.",
    RATE_LIMITED: "Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.",
    SESSION_NOT_FOUND: "Esta sesión no existe o fue eliminada.",
    NOT_FOUND: "No se pudo encontrar.",
    NOT_INTERVIEWING: "Esta entrevista no acepta respuestas en este momento.",
    ABANDONED: "Esta entrevista se detuvo y no se puede reanudar.",
    ALREADY_COMPLETED: "Esta entrevista ya está completa.",
    NOT_FINISHED: "Termina la entrevista antes de generar el informe.",
    ANSWER_IN_FLIGHT: "Tu respuesta anterior todavía se está procesando.",
    COACH_DISABLED: "El coach está desactivado en esta sesión.",
    NO_AVATAR_STREAM: "El entrevistador en video no está conectado.",
    NO_QUESTION: "No se encontró una pregunta actual.",
    NO_ANSWERS: "Todavía no hay respuestas para elaborar un informe.",
    MISSING_API_KEY:
      "Falta configurar una clave de API de un proveedor. Añádela en apps/web/.env.local o activa el modo mock.",
    UPSTREAM_RATE_LIMITED:
      "El proveedor de IA está limitando las solicitudes. Vuelve a intentarlo en un momento.",
    EMPTY_QUESTION_SET:
      "El entrevistador no pudo generar preguntas para este puesto. Vuelve a intentarlo.",
    AUDIO_UNAVAILABLE: "No se pudo generar el audio de esta pregunta. Léela y graba tu respuesta.",
    AVATAR_UNAVAILABLE: "El entrevistador en video no está disponible. Seguimos solo con audio.",
    AVATAR_QUOTA:
      "El servicio de video alcanzó su límite de transmisiones simultáneas. Seguimos solo con audio.",
    AVATAR_NO_CREDITS:
      "La cuenta del servicio de video se quedó sin créditos. Seguimos solo con audio.",
    PARSE_FAILED: "No se pudo analizar la descripción del puesto. Vuelve a intentarlo.",
    START_FAILED: "No se pudo iniciar la entrevista. Vuelve a intentarlo.",
    ANSWER_FAILED: "No se pudo procesar tu respuesta. Vuelve a intentarlo.",
    REPORT_FAILED:
      "No pudimos generar tu informe. Tus respuestas están guardadas — puedes reintentar desde la página del informe.",
    COACH_FAILED: "El coach no está disponible en este momento.",
    INTERNAL_ERROR: "Algo salió mal. Vuelve a intentarlo.",
  },
  client: {
    NETWORK: "Error de red — revisa tu conexión y vuelve a intentarlo.",
    MIC_NOT_FOUND: "No se encontró ningún micrófono. Conecta uno y vuelve a intentarlo.",
    RECORD_START_FAILED: "No se pudo iniciar la grabación.",
    RECORD_FAILED: "La grabación falló — vuelve a intentarlo.",
    UNKNOWN: "Algo salió mal. Vuelve a intentarlo.",
  },
};
