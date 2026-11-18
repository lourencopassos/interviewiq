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
};
