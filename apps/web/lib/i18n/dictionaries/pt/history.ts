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
    resume: "Retomar",
    report: "Relatório",
    retake: "Refazer",
    confirm: "Confirmar",
    deleteLabel: "Excluir sessão",
  },
  deleteAll: {
    eyebrow: "privacidade",
    body: "Sessões, currículos e transcrições ficam salvos no banco de dados deste servidor. As vagas salvas e o seu currículo também ficam neste navegador.",
    button: "Excluir todos os meus dados",
    confirm: "Excluir tudo",
    deleting: "Excluindo…",
    done: "{n} sessões excluídas do servidor. O currículo e as vagas salvos neste navegador também foram removidos.",
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
