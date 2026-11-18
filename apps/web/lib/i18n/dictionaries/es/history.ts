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
    researching: "investigando",
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
