import type { QuestionSet } from "@interviewiq/types";

export const mockQuestionSet: QuestionSet = {
  opening:
    "Hi there! Thanks for taking the time to interview with us today. I'm excited to learn more about your experience. We'll go through a mix of technical and behavioral questions. Feel free to think out loud — there are no trick questions here. Ready to get started?",
  questions: [
    {
      id: "mock-q1",
      text: "Can you walk me through how React's reconciliation algorithm works? What happens when state changes and React needs to update the DOM?",
      category: "technical",
      targetSkill: "React",
      difficulty: 3,
      expectedDuration: 180,
      followUpTriggers: [
        {
          trigger: "Does not mention virtual DOM or fiber",
          followUp:
            "Can you explain the role of the virtual DOM in this process?",
        },
      ],
      scoringGuide: {
        poor: "Cannot explain basic re-rendering or confuses DOM manipulation with React updates",
        good: "Explains virtual DOM diffing, component re-rendering on state change, and basic reconciliation",
        excellent:
          "Discusses fiber architecture, concurrent rendering, priority lanes, and bailout optimizations",
      },
    },
    {
      id: "mock-q2",
      text: "You're building a complex form with deeply nested fields, real-time validation, and undo/redo support. How would you architect the state management for this?",
      category: "system_design",
      targetSkill: "State Management",
      difficulty: 4,
      expectedDuration: 240,
      followUpTriggers: [
        {
          trigger: "Does not discuss trade-offs",
          followUp:
            "What trade-offs did you consider between different state management approaches?",
        },
      ],
      scoringGuide: {
        poor: "Suggests putting everything in useState or global state without clear structure",
        good: "Proposes useReducer or form library, mentions validation strategy, considers UX",
        excellent:
          "Designs command pattern for undo/redo, discusses normalized state shape, debounced validation, and optimistic updates",
      },
    },
    {
      id: "mock-q3",
      text: "Tell me about a time you had to push back on a technical decision made by a more senior engineer. How did you handle it and what was the outcome?",
      category: "behavioral",
      targetSkill: "Communication",
      difficulty: 3,
      expectedDuration: 180,
      followUpTriggers: [
        {
          trigger: "Answer is vague or hypothetical",
          followUp:
            "Can you give me a specific example with concrete details about the situation?",
        },
      ],
      scoringGuide: {
        poor: "Cannot provide a real example or describes avoiding conflict entirely",
        good: "Shares a real story with clear situation, their approach, and resolution",
        excellent:
          "Demonstrates diplomacy, data-driven argumentation, and growth from the experience regardless of outcome",
      },
    },
    {
      id: "mock-q4",
      text: "How would you diagnose and fix a React application that has become noticeably slow? Walk me through your systematic approach.",
      category: "technical",
      targetSkill: "Performance Optimization",
      difficulty: 4,
      expectedDuration: 200,
      followUpTriggers: [
        {
          trigger: "Does not mention profiling tools",
          followUp:
            "What specific tools would you use to measure and identify the bottlenecks?",
        },
      ],
      scoringGuide: {
        poor: "Only suggests generic solutions like 'use memo' without diagnostic approach",
        good: "Mentions React DevTools profiler, identifies common causes like unnecessary re-renders, suggests React.memo/useMemo strategically",
        excellent:
          "Systematic approach: measure first with profiler, identify render cascades, discusses code splitting, virtualization, web worker offloading, and Core Web Vitals",
      },
    },
    {
      id: "mock-q5",
      text: "What does good engineering culture look like to you? How do you contribute to it on a team?",
      category: "culture_fit",
      targetSkill: "Team Collaboration",
      difficulty: 2,
      expectedDuration: 150,
      followUpTriggers: [
        {
          trigger: "Only talks about technical practices",
          followUp:
            "Beyond technical practices, how do you support the people on your team?",
        },
      ],
      scoringGuide: {
        poor: "Generic answer about 'good communication' without specific examples or practices",
        good: "Mentions concrete practices like code reviews, knowledge sharing, psychological safety",
        excellent:
          "Articulates a thoughtful philosophy with specific examples of how they've built or improved team culture",
      },
    },
    {
      id: "mock-q6",
      text: "You need to implement a type-safe API client that handles authentication, retries, and error mapping. How would you design the TypeScript types and implementation?",
      category: "technical",
      targetSkill: "TypeScript",
      difficulty: 4,
      expectedDuration: 220,
      followUpTriggers: [
        {
          trigger: "Does not discuss generic types",
          followUp:
            "How would you use TypeScript generics to make the API client flexible yet type-safe?",
        },
      ],
      scoringGuide: {
        poor: "Uses 'any' types or cannot explain basic TypeScript patterns for API clients",
        good: "Uses generics for request/response types, proper error types, discusses interceptor pattern",
        excellent:
          "Designs with discriminated unions for errors, branded types for IDs, conditional types for response mapping, and discusses runtime validation with Zod",
      },
    },
  ],
  closing:
    "That wraps up our questions for today. You did a great job — I appreciate your thoughtful answers. We'll have a detailed coaching report ready for you shortly with specific feedback and study recommendations. Thanks again for your time!",
};
