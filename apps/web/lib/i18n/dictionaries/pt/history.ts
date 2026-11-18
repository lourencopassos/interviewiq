import type { history as En } from "../en/history";

export const history: typeof En = {
  eyebrow: "histórico",
  tagline: "todas as sessões nesta máquina",
  title: "Sessões anteriores",
  newInterview: "Nova entrevista",
  count: "{n}",
  countFiltered: "{n} de {total}",
  filters: {
    label: "filtrar",
    difficulty: "Nível",
    interviewType: "Tipo de entrevista",
    allLevels: "Todos os níveis",
    allTypes: "Todos os tipos",
    clear: "Limpar filtros",
  },
  card: {
    outOf: "/100",
    researching: "pesquisando",
    resume: "Retomar",
    report: "Relatório",
    retake: "Refazer",
    confirm: "Confirmar",
    deleteLabel: "Excluir sessão",
  },
  deleteErrors: {
    network: "Erro de rede — não foi possível excluir a sessão",
    forbidden: "Você só pode excluir as suas próprias sessões",
    gone: "A sessão não existe mais",
    status: "Falha ao excluir a sessão ({status})",
    generic: "Falha ao excluir a sessão",
  },
  empty: {
    eyebrow: "[ vazio ]",
    body: "Nenhuma entrevista ainda. Cole uma descrição de vaga; a primeira leva cerca de vinte minutos.",
    start: "Começar uma entrevista",
  },
  noMatch: {
    eyebrow: "[ sem resultados ]",
    body: "Nenhuma sessão corresponde a estes filtros.",
    clear: "Limpar filtros",
  },
};
