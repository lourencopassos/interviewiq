import type { landing as En } from "../en/landing";

export const landing: typeof En = {
  meta: {
    title: "InterviewIQ — Entrevistas simuladas que conocen la empresa",
    description:
      "Pega una oferta de trabajo, haz una entrevista por voz adaptativa con una IA que investigó la empresa y llévate un informe de coaching y un plan de estudio.",
  },
  hero: {
    eyebrow: "practicar · puntuar · estudiar",
    titleA: "Entrevístate como si fuera la de verdad.",
    titleB: "Después lee",
    titleMark: "el debrief.",
    body: "Pega la descripción del puesto. Un entrevistador que investigó la empresa te hace preguntas en voz alta, puntúa cada respuesta y profundiza cuando te quedas vago. Te vas con un informe y un plan de estudio.",
    start: "Empezar una entrevista",
    history: "Sesiones anteriores",
    facts: [
      ["Corre en", "tu máquina"],
      ["Voces", "Claude · Whisper · ElevenLabs"],
      ["Idiomas", "EN · PT-BR · ES"],
    ],
    demoCaption: "Una vista previa guionada. Las sesiones reales usan tus claves.",
  },
  demo: {
    live: "En vivo · Frontend Senior · Stripe",
    interviewer: "Entrevistador",
    you: "tú",
    followUp: "repregunta",
    listening: "escuchando",
    recordingAnswer: "Grabando respuesta",
    waiting: "Esperando a que termine la pregunta…",
    transcribed: "Respuesta transcrita · 48s",
    record: "grabar",
    replay: "repetir",
    rule: "puntaje < 65 → repregunta",
    script: [
      {
        question: "El dashboard de Stripe renderiza miles de filas. ¿Dónde empieza a sufrir React y qué harías primero?",
        feedback: "Buen instinto: medir antes de memoizar.",
      },
      {
        question: "Mencionaste virtualización. ¿Cómo mantienes la navegación por teclado y los lectores de pantalla funcionando en una tabla virtualizada?",
        feedback: "Profundicemos en la parte de accesibilidad.",
        followUp: "Explícame qué te aporta aria-rowindex en este caso.",
      },
      {
        question: "Cuéntame de una vez en que te opusiste a una decisión de diseño y estabas equivocado.",
        feedback: "Específico, honesto, y nombraste lo que cambió.",
      },
    ],
  },
  steps: {
    eyebrow: "cómo transcurre una sesión",
    title: "Tres pasos, una sola sentada.",
    hintRecord: "grabar",
    hintReplay: "repetir la pregunta",
    stepLabel: "paso",
    items: [
      {
        title: "Pega la oferta",
        body: "El puesto, el stack y la seniority se extraen del texto. Luego el entrevistador investiga la empresa: cultura, proceso, noticias recientes.",
        meta: "~40s",
      },
      {
        title: "Conversa",
        body: "Las preguntas se dicen en voz alta. Respondes con tu voz. Cada respuesta se puntúa al momento, y una floja gana una repregunta en vez de pasar de largo.",
        meta: "15–25 min",
      },
      {
        title: "Lee el debrief",
        body: "Un veredicto, cuatro puntajes por dimensión, qué funcionó, qué no, y un plan de estudio ordenado por lo que más subiría tu puntaje.",
        meta: "te lo quedas",
      },
    ],
  },
  rules: {
    eyebrow: "qué adapta el entrevistador",
    title: "Escucha cómo te va.",
    items: [
      { label: "puntaje < 65", title: "Repregunta", body: "El entrevistador hace una segunda pregunta sobre el mismo tema antes de seguir." },
      { label: "puntaje > 88", title: "Salta adelante", body: "Una pregunta fácil que venía después se descarta. Las respuestas fuertes compran preguntas más difíciles." },
      { label: "ciclo completo", title: "Cuatro etapas", body: "Llamada inicial, técnica, conductual y diseño de sistemas, con transiciones habladas entre ellas." },
      { label: "búsqueda web", title: "Conoce la empresa", body: "Las preguntas citan el stack y la cultura reales, no una plantilla genérica." },
    ],
  },
  report: {
    eyebrow: "el debrief",
    title: "Un informe que de verdad puedes usar.",
    body: "Cada sesión termina con un veredicto y cuatro puntajes por dimensión, y luego lo que importa: qué hiciste bien, qué corregir primero, un plan de estudio con recursos reales y una revisión por pregunta con tu transcripción junto a las notas del entrevistador.",
    chips: ["Fortalezas", "Áreas de mejora", "Plan de estudio", "Revisión por pregunta", "Listo para repetir"],
    sampleLabel: "Informe de coaching · ejemplo",
    verdict: "Aprobado justo",
    overall: "general",
    dims: ["Técnica", "Resolución de problemas", "Comunicación", "Conductual"],
    fixFirst: "Corrige primero",
    fixFirstBody: "Accesibilidad en listas virtualizadas · 3h · un ejercicio práctico incluido",
  },
  cta: {
    eyebrow: "cuando quieras",
    title: "Tu próxima entrevista está a un Ctrl+V.",
    button: "Empezar una entrevista",
  },
  footer: {
    line: "InterviewIQ · licencia MIT · autoalojado, con tus propias claves de API",
    source: "Código en GitHub",
  },
};
