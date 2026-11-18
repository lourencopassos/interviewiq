import type { landing as En } from "../en/landing";

export const landing: typeof En = {
  meta: {
    title: "InterviewIQ — Entrevistas simuladas que conhecem a empresa",
    description:
      "Cole uma vaga, faça uma entrevista por voz adaptativa com uma IA que pesquisou a empresa e saia com um relatório de coaching e um plano de estudos.",
  },
  hero: {
    eyebrow: "praticar · pontuar · estudar",
    titleA: "Entreviste como se fosse a de verdade.",
    titleB: "Depois leia",
    titleMark: "o debrief.",
    body: "Cole a descrição da vaga. Um entrevistador que pesquisou a empresa faz as perguntas em voz alta, pontua cada resposta e aprofunda quando você fica vago. Você sai com um relatório e um plano de estudos.",
    start: "Começar uma entrevista",
    history: "Sessões anteriores",
    facts: [
      ["Roda", "na sua máquina"],
      ["Vozes", "Claude · Whisper · ElevenLabs"],
      ["Idiomas", "EN · PT-BR · ES"],
    ],
    demoCaption: "Uma prévia roteirizada. Sessões reais usam as suas chaves.",
  },
  demo: {
    live: "Ao vivo · Frontend Sênior · Stripe",
    interviewer: "Entrevistador",
    you: "você",
    followUp: "aprofundamento",
    listening: "ouvindo",
    waiting: "Aguardando a pergunta terminar…",
    transcribed: "Resposta transcrita · 48s",
    record: "gravar",
    replay: "repetir",
    rule: "nota < 65 → aprofundamento",
    script: [
      {
        question: "O dashboard da Stripe renderiza milhares de linhas. Onde o React começa a sofrer e qual seria sua primeira medida?",
        feedback: "Bom instinto de medir antes de memoizar.",
      },
      {
        question: "Você falou em virtualização. Como manter navegação por teclado e leitores de tela funcionando numa tabela virtualizada?",
        feedback: "Vamos aprofundar a parte de acessibilidade.",
        followUp: "Me explique o que aria-rowindex te dá nesse caso.",
      },
      {
        question: "Conte sobre uma vez em que você discordou de uma decisão de design e estava errado.",
        feedback: "Específico, honesto, e você nomeou o que mudou.",
      },
    ],
  },
  steps: {
    eyebrow: "como uma sessão funciona",
    title: "Três passos, uma sentada.",
    hintRecord: "gravar",
    hintReplay: "repetir a pergunta",
    stepLabel: "passo",
    items: [
      {
        title: "Cole a vaga",
        body: "O cargo, a stack e a senioridade são extraídos do texto. Depois o entrevistador estuda a empresa: cultura, processo, notícias recentes.",
        meta: "~40s",
      },
      {
        title: "Converse",
        body: "As perguntas são faladas em voz alta. Você responde com a sua voz. Cada resposta é pontuada na hora, e uma resposta fraca gera um aprofundamento em vez de passar batido.",
        meta: "15–25 min",
      },
      {
        title: "Leia o debrief",
        body: "Um veredito, quatro notas por dimensão, o que funcionou, o que não funcionou e um plano de estudos ordenado pelo que mais faria sua nota subir.",
        meta: "fica com você",
      },
    ],
  },
  rules: {
    eyebrow: "o que o entrevistador adapta",
    title: "Ele presta atenção em como você está indo.",
    items: [
      { label: "nota < 65", title: "Aprofundamento", body: "O entrevistador faz uma segunda pergunta sobre o mesmo tema antes de seguir." },
      { label: "nota > 88", title: "Pula adiante", body: "Uma pergunta fácil na fila é descartada. Respostas fortes compram perguntas mais difíceis." },
      { label: "ciclo completo", title: "Quatro etapas", body: "Triagem, técnica, comportamental e system design, com transições faladas entre elas." },
      { label: "busca na web", title: "Conhece a empresa", body: "As perguntas citam a stack e a cultura reais, não um modelo genérico." },
    ],
  },
  report: {
    eyebrow: "o debrief",
    title: "Um relatório que dá para usar de verdade.",
    body: "Toda sessão termina com um veredito e quatro notas por dimensão, e depois o que importa: o que você fez bem, o que corrigir primeiro, um plano de estudos com recursos reais e uma revisão por pergunta com a sua transcrição ao lado das notas do entrevistador.",
    chips: ["Pontos fortes", "O que melhorar", "Plano de estudos", "Revisão por pergunta", "Prontidão para refazer"],
    sampleLabel: "Relatório de coaching · exemplo",
    verdict: "Aprovação leve",
    overall: "geral",
    dims: ["Técnica", "Resolução de problemas", "Comunicação", "Comportamental"],
    fixFirst: "Corrija primeiro",
    fixFirstBody: "Acessibilidade em listas virtualizadas · 3h · um exercício prático incluído",
  },
  cta: {
    eyebrow: "quando você quiser",
    title: "Sua próxima entrevista está a um Ctrl+V de distância.",
    button: "Começar uma entrevista",
  },
  footer: {
    line: "InterviewIQ · licença MIT · auto-hospedado, use suas próprias chaves de API",
    source: "Código no GitHub",
  },
};
