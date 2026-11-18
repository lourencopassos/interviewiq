import type { CoachingReport } from "@interviewiq/types";

export const mockCoachingReport: CoachingReport = {
  overallScore: 74,
  verdict: "Lean Pass",
  executiveSummary:
    "You demonstrated solid frontend fundamentals with particular strength in React concepts and team collaboration. Your behavioral answers were authentic and well-structured. The main growth areas are in system design depth and performance optimization methodology — you tend to jump to solutions before fully diagnosing the problem. With targeted preparation on these areas, you'd be well-positioned for a strong pass.",
  dimensionScores: {
    technical: 72,
    problemSolving: 68,
    communication: 82,
    behavioral: 78,
  },
  strengths: [
    {
      title: "Clear Technical Communication",
      detail:
        "You explained complex concepts like React reconciliation in a way that was easy to follow. Your answers had good structure — context, explanation, and practical implications.",
    },
    {
      title: "Authentic Behavioral Stories",
      detail:
        "Your example about pushing back on the GraphQL migration was specific, showed self-awareness, and demonstrated mature judgment. This is exactly what interviewers look for.",
    },
    {
      title: "Strong React Fundamentals",
      detail:
        "Your understanding of React's rendering model, virtual DOM, and state management patterns is solid. You clearly have hands-on production experience.",
    },
    {
      title: "Team-Oriented Mindset",
      detail:
        "Your answers consistently showed awareness of team dynamics, knowledge sharing, and collaborative problem-solving.",
    },
  ],
  areasToImprove: [
    {
      title: "Performance Debugging Methodology",
      detail:
        "You jumped to optimization solutions before establishing a clear diagnostic process. Practice the 'measure first' approach: profile, identify bottleneck, hypothesize, fix, verify.",
      priority: "high",
    },
    {
      title: "System Design Depth",
      detail:
        "Your state management design was functional but lacked depth in trade-off analysis. Practice articulating WHY you chose an approach over alternatives.",
      priority: "high",
    },
    {
      title: "TypeScript Advanced Patterns",
      detail:
        "You know generics well but could deepen your knowledge of discriminated unions, conditional types, and branded types for production API design.",
      priority: "medium",
    },
  ],
  studyPlan: [
    {
      topic: "Frontend Performance Optimization",
      whyItMatters:
        "Performance questions are common in senior frontend interviews and test your ability to think systematically under pressure.",
      resources: [
        {
          type: "book",
          title: "Web Performance in Action by Jeremy Wagner",
          url: null,
        },
        {
          type: "course",
          title: "Frontend Masters: Web Performance Fundamentals",
          url: "https://frontendmasters.com/courses/web-perf/",
        },
        {
          type: "article",
          title: "Profiling React App Performance (React Docs)",
          url: "https://react.dev/reference/react/Profiler",
        },
      ],
      practicePrompt:
        "Take a React app you've built and use the Profiler to find the 3 slowest components. Document your diagnostic process and fixes.",
      estimatedHours: 12,
    },
    {
      topic: "System Design for Frontend",
      whyItMatters:
        "Senior roles expect you to design systems, not just implement them. Showing trade-off reasoning is critical.",
      resources: [
        {
          type: "book",
          title:
            "Designing Data-Intensive Applications by Martin Kleppmann (Chapters 1-3)",
          url: null,
        },
        {
          type: "practice",
          title: "GreatFrontEnd System Design Questions",
          url: "https://www.greatfrontend.com/system-design",
        },
        {
          type: "article",
          title: "Frontend System Design Interview Guide",
          url: null,
        },
      ],
      practicePrompt:
        "Design the state architecture for a collaborative document editor (like Google Docs). Write up your approach with diagrams.",
      estimatedHours: 15,
    },
  ],
  nextInterviewTips: [
    "Lead with your diagnostic process before jumping to solutions — say 'First I would measure...' before 'I would use React.memo'",
    "When discussing trade-offs, explicitly name at least 2 alternatives you considered and why you rejected them",
    "Your behavioral stories are strong — prepare 2-3 more using the STAR method for common themes (failure, conflict, technical decision)",
    "Practice thinking out loud during system design — interviewers want to see your reasoning process, not just the final answer",
  ],
  companyCultureFit:
    "Your emphasis on psychological safety, knowledge sharing, and collaborative code review aligns well with modern engineering teams. Your willingness to respectfully challenge decisions while being data-driven is exactly what senior engineers should demonstrate.",
  estimatedRetakeReadiness: 14,
};
