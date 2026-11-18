import type { errors as En } from "../en/errors";

export const errors: typeof En = {
  ref: "ref {digest}",
  global: {
    eyebrow: "[ erro ] algo quebrou",
    title: "Não saiu como planejado.",
    body: "Um erro inesperado interrompeu esta página. Tentar de novo costuma resolver.",
    tryAgain: "Tentar de novo",
    goHome: "Ir para o início",
  },
  notFound: {
    eyebrow: "[ 404 ] não encontrado",
    title: "Não há nada neste endereço.",
    body: "A página pode ter mudado de lugar, ou o link nunca esteve certo.",
    goHome: "Ir para o início",
    startInterview: "Começar uma entrevista",
  },
  report: {
    eyebrow: "[ relatório ] indisponível",
    title: "Este relatório não carregou.",
    body: "Ele ainda pode estar sendo gerado, ou a sessão pode não existir mais.",
    backToHistory: "Voltar ao histórico",
  },
};
