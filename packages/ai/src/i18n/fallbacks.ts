import type { InterviewStage, Language } from "@interviewiq/types";

/**
 * Text the server falls back to when a model call fails or returns nothing
 * usable. Most of it is spoken aloud or shown in the report, so it follows the
 * interview language like everything else the candidate hears.
 */
export interface ServerFallbacks {
  opening: string;
  closing: string;
  /** Spoken after an answer when the evaluator response was unusable. */
  evaluatorFeedback: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  stageNames: Record<InterviewStage, string>;
  stageTransition: (completedStage: string, nextStage: string) => string;
  report: {
    executiveSummary: string;
    /** Shown when the stored report JSON is missing or corrupt. */
    storedSummaryUnavailable: string;
    companyCultureFit: string;
    nextInterviewTip: string;
  };
}

const EN: ServerFallbacks = {
  opening: "Welcome! Let's get started with your interview.",
  closing: "That wraps up our interview. Thank you for your time today.",
  evaluatorFeedback: "Thank you for your answer. Let's continue.",
  scoringGuide: { poor: "Weak answer", good: "Solid answer", excellent: "Outstanding answer" },
  stageNames: {
    PHONE_SCREEN: "Phone Screen",
    TECHNICAL: "Technical Deep Dive",
    BEHAVIORAL: "Behavioral",
    SYSTEM_DESIGN: "System Design",
  },
  stageTransition: (completed, next) =>
    `Great, we've wrapped up the ${completed} portion. Let's move on to ${next}.`,
  report: {
    executiveSummary:
      "The interview has been completed. Please review individual question scores for detailed feedback.",
    storedSummaryUnavailable:
      "The detailed summary could not be loaded. Scores below are from the stored report.",
    companyCultureFit: "Unable to assess culture fit based on available data.",
    nextInterviewTip: "Review your responses and practice articulating your thoughts more clearly.",
  },
};

const PT_BR: ServerFallbacks = {
  opening: "Bem-vindo! Vamos começar a sua entrevista.",
  closing: "Isso encerra a nossa entrevista. Obrigado pelo seu tempo hoje.",
  evaluatorFeedback: "Obrigado pela sua resposta. Vamos continuar.",
  scoringGuide: { poor: "Resposta fraca", good: "Resposta sólida", excellent: "Resposta excelente" },
  stageNames: {
    PHONE_SCREEN: "Triagem inicial",
    TECHNICAL: "Aprofundamento técnico",
    BEHAVIORAL: "Comportamental",
    SYSTEM_DESIGN: "System Design",
  },
  stageTransition: (completed, next) =>
    `Ótimo, terminamos a etapa de ${completed}. Vamos seguir para ${next}.`,
  report: {
    executiveSummary:
      "A entrevista foi concluída. Revise a nota de cada pergunta para ver o feedback detalhado.",
    storedSummaryUnavailable:
      "Não foi possível carregar o resumo detalhado. As notas abaixo vêm do relatório salvo.",
    companyCultureFit: "Não foi possível avaliar o fit cultural com os dados disponíveis.",
    nextInterviewTip: "Revise suas respostas e pratique expressar seu raciocínio com mais clareza.",
  },
};

const ES: ServerFallbacks = {
  opening: "¡Bienvenido! Comencemos con tu entrevista.",
  closing: "Con esto terminamos la entrevista. Gracias por tu tiempo hoy.",
  evaluatorFeedback: "Gracias por tu respuesta. Sigamos.",
  scoringGuide: { poor: "Respuesta débil", good: "Respuesta sólida", excellent: "Respuesta sobresaliente" },
  stageNames: {
    PHONE_SCREEN: "Entrevista telefónica",
    TECHNICAL: "Profundización técnica",
    BEHAVIORAL: "Conductual",
    SYSTEM_DESIGN: "Diseño de sistemas",
  },
  stageTransition: (completed, next) =>
    `Muy bien, terminamos la etapa de ${completed}. Pasemos a ${next}.`,
  report: {
    executiveSummary:
      "La entrevista ha terminado. Revisa la puntuación de cada pregunta para ver la retroalimentación detallada.",
    storedSummaryUnavailable:
      "No se pudo cargar el resumen detallado. Las puntuaciones de abajo vienen del informe guardado.",
    companyCultureFit: "No es posible evaluar el encaje cultural con los datos disponibles.",
    nextInterviewTip: "Repasa tus respuestas y practica explicar tu razonamiento con más claridad.",
  },
};

const FALLBACKS: Record<Language, ServerFallbacks> = { EN, PT_BR, ES };

/** Fallback copy for a session language; unknown or missing languages get English. */
export function fallbacksFor(language: Language | string | null | undefined): ServerFallbacks {
  return FALLBACKS[language as Language] ?? EN;
}
