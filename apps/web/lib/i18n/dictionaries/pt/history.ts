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
  deleteAll: {
    eyebrow: "privacidade",
    body: "Sessões, currículos e transcrições ficam salvos no banco de dados deste servidor. As vagas salvas e o seu currículo também ficam neste navegador.",
    button: "Excluir todos os meus dados",
    confirm: "Excluir tudo",
    deleting: "Excluindo…",
    done: "{n} sessões excluídas do servidor. O currículo e as vagas salvos neste navegador também foram removidos.",
    failed: "Não foi possível excluir seus dados ({status})",
    network: "Erro de rede — nada foi excluído",
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
