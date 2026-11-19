import type { history as En } from "../en/history";

export const history: typeof En = {
  eyebrow: "historial",
  tagline: "todas las sesiones en esta máquina",
  title: "Sesiones anteriores",
  newInterview: "Nueva entrevista",
  count: "{n}",
  countFiltered: "{n} de {total}",
  filters: {
    label: "filtrar",
    difficulty: "Nivel",
    interviewType: "Tipo de entrevista",
    allLevels: "Todos los niveles",
    allTypes: "Todos los tipos",
    clear: "Limpiar filtros",
  },
  card: {
    outOf: "/100",
    resume: "Continuar",
    report: "Informe",
    retake: "Repetir",
    confirm: "Confirmar",
    deleteLabel: "Eliminar sesión",
  },
  deleteErrors: {
    network: "Error de red — no se pudo eliminar la sesión",
    forbidden: "Solo puedes eliminar tus propias sesiones",
    gone: "La sesión ya no existe",
    status: "No se pudo eliminar la sesión ({status})",
    generic: "No se pudo eliminar la sesión",
  },
  deleteAll: {
    eyebrow: "privacidad",
    body: "Las sesiones, los CV y las transcripciones se guardan en la base de datos de este servidor. Los empleos guardados y tu CV también quedan en este navegador.",
    button: "Eliminar todos mis datos",
    confirm: "Eliminar todo",
    deleting: "Eliminando…",
    done: "Se eliminaron {n} sesiones del servidor, junto con el CV y los empleos guardados en este navegador.",
    failed: "No se pudieron eliminar tus datos ({status})",
    network: "Error de red — no se eliminó nada",
  },
  empty: {
    eyebrow: "[ vacío ]",
    body: "Todavía no hay entrevistas. Pega una descripción de puesto; la primera tarda unos veinte minutos.",
    start: "Empezar una entrevista",
  },
  noMatch: {
    eyebrow: "[ sin resultados ]",
    body: "Ninguna sesión coincide con estos filtros.",
    clear: "Limpiar filtros",
  },
};
