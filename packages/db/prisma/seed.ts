import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Inserts one completed sample interview with a full coaching report, for a
 * fictional company ("Northwind Labs"). Idempotent: the sample uses a fixed
 * session id and is replaced on every run.
 *
 * Sessions belong to the anonymous client id of the browser that created them,
 * so by default the sample is not listed in History. To attach it to your
 * browser, pass your client id (DevTools → Application → Local Storage →
 * `interviewiq-client-id`):
 *
 *   pnpm db:seed <client-id>      or      SEED_CLIENT_ID=<client-id> pnpm db:seed
 */
const SEED_SESSION_ID = "seed-sample-northwind";
const LEGACY_SEED_CLIENT_ID = "seed-client-001";
const clientId = process.argv[2] || process.env.SEED_CLIENT_ID || LEGACY_SEED_CLIENT_ID;

async function main() {
  // Replace the previous sample (cascades to questions, coach notes and report),
  // plus sample data from older versions of this script.
  await prisma.session.deleteMany({
    where: { OR: [{ id: SEED_SESSION_ID }, { clientId: LEGACY_SEED_CLIENT_ID }] },
  });

  const session = await prisma.session.create({
    data: {
      id: SEED_SESSION_ID,
      clientId,
      jobTitle: "Senior Frontend Engineer",
      companyName: "Northwind Labs",
      jobDescription:
        "Northwind Labs is looking for a Senior Frontend Engineer to join the Insights team. You will build and maintain the analytics dashboard our logistics customers use to track shipments, warehouses and forecasts. Requirements: 5+ years React/TypeScript, experience with design systems, performance optimization at scale, accessibility (WCAG 2.1 AA), and data visualization. You'll work closely with product and design to ship polished, reliable interfaces. Experience with real-time or data-heavy UIs is a plus.",
      difficulty: "SENIOR",
      interviewType: "TECHNICAL",
      language: "EN",
      status: "COMPLETED",
      currentIndex: 5,
      opening: "Welcome! I'm excited to chat with you today about the Senior Frontend Engineer role on our Insights team at Northwind Labs. Let's dive in.",
      closing: "That wraps up our technical discussion. Thank you for your thoughtful answers — we'll be in touch soon.",
      parsedJob: JSON.stringify({
        jobTitle: "Senior Frontend Engineer",
        companyName: "Northwind Labs",
        seniority: "senior",
        primarySkills: ["React", "TypeScript", "Design Systems", "Performance Optimization"],
        secondarySkills: ["Accessibility", "Data Visualization", "Real-time Data"],
        domain: "frontend",
        keyResponsibilities: [
          "Build and maintain the customer analytics dashboard",
          "Implement design system components",
          "Optimize frontend performance at scale",
          "Ensure WCAG 2.1 AA accessibility",
        ],
        inferredStack: ["React", "TypeScript", "Webpack", "GraphQL", "Storybook"],
        interviewFocus: ["React patterns", "Performance optimization", "Design systems", "Accessibility"],
        companySummary: "Northwind Labs (fictional) builds supply-chain analytics software for mid-sized logistics companies.",
      }),
      companyIntel: JSON.stringify({
        companySize: "200-500",
        fundingStage: "Series B (fictional)",
        techStack: ["React", "TypeScript", "Go", "PostgreSQL", "GraphQL", "Kafka"],
        engineeringCulture: "High craft bar, emphasis on reliability and user experience. Engineers own features end-to-end.",
        recentNews: ["Launched a demand-forecasting module (fictional)", "Opened a second engineering hub (fictional)"],
        interviewProcess: "Phone screen → Technical (2 rounds) → System design → Behavioral → Team match",
        knownChallenges: ["Rendering large, frequently updating datasets", "Keeping dashboards fast on low-end warehouse hardware"],
        values: ["Customers first", "Ship small, ship often", "Think rigorously"],
        coachingTip: "Northwind Labs values craft and attention to detail. Show deep technical knowledge and care for user experience.",
      }),
    },
  });

  const questions = await Promise.all([
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 0,
        text: "At Northwind Labs, our dashboard handles complex shipment data visualizations. How would you architect a React component system for rendering real-time shipment charts that need to update every few seconds without causing jank?",
        category: "technical",
        transcript: "I'd start by separating the data layer from the rendering layer. For the data, I'd use a WebSocket or SSE connection to receive real-time updates, with a buffer that batches updates every 2-3 seconds to avoid overwhelming the renderer. On the rendering side, I'd use a virtualized canvas approach with something like D3 or Recharts for the chart rendering, but wrap it in a React component that only re-renders when the buffered data actually changes. I'd use useMemo for expensive data transformations and React.memo for the chart wrapper. For the actual chart updates, I'd use requestAnimationFrame to ensure smooth 60fps animations. I'd also implement a sliding window to keep memory usage bounded — maybe showing the last 1000 data points with the ability to scroll back.",
        score: 85,
        feedback: "Excellent architecture thinking — particularly strong on the data buffering and rendering separation.",
        strengths: JSON.stringify(["Data/render layer separation", "Performance-conscious with RAF", "Memory management with sliding window"]),
        gaps: JSON.stringify(["Could have mentioned Web Workers for data processing", "No mention of error recovery for WebSocket disconnects"]),
      },
    }),
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 1,
        text: "Northwind's design system serves a dozen product teams. How would you approach building a flexible but consistent component library that enforces design tokens while allowing team-specific customization?",
        category: "technical",
        transcript: "I'd build a layered design system with three tiers. The foundation layer has design tokens — colors, spacing, typography, shadows — defined as CSS custom properties so they cascade naturally. The primitive layer has unstyled headless components using Radix or similar, providing behavior without opinions. Then the styled layer composes primitives with tokens into Northwind-branded components. For customization, I'd use a variant pattern — each component accepts a variant prop with predefined options. Teams can't change the core look but they can pick from sanctioned variations. The tokens themselves live in a shared package with TypeScript types. I'd use Storybook for documentation and visual testing, with Chromatic for visual regression. For enforcement, I'd lint against raw color values or spacing values — everything should reference a token.",
        score: 90,
        feedback: "Outstanding design system architecture — shows real production experience.",
        strengths: JSON.stringify(["Three-tier architecture is production-proven", "Token enforcement via linting", "Variant pattern for controlled customization"]),
        gaps: JSON.stringify(["Could discuss versioning and migration strategy"]),
      },
    }),
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 2,
        text: "Walk me through how you'd debug and fix a performance regression in a large React application where the main thread is being blocked for 200ms+ during page navigation.",
        category: "technical",
        transcript: "First, I'd reproduce the issue consistently and use Chrome DevTools Performance tab to capture a trace. I'd look at the flame chart for long tasks — anything over 50ms blocks the main thread. Common culprits are: synchronous renders of large component trees, expensive JavaScript computations during route transitions, or layout thrashing from DOM measurements. Once I identify the bottleneck, the fix depends on what I find. If it's a large render tree, I'd implement code splitting with React.lazy and Suspense at the route level. If it's computation, I'd move it to a Web Worker or break it up with scheduler.yield. If it's layout thrashing, I'd batch reads and writes. I'd also check for unnecessary re-renders using the React DevTools Profiler — look for components rendering without props changes. Finally, I'd set up a performance budget with Lighthouse CI to prevent regressions.",
        score: 78,
        feedback: "Solid debugging methodology but could have been more specific about Northwind's context.",
        strengths: JSON.stringify(["Systematic debugging approach", "Knowledge of long task API", "Prevention with Lighthouse CI"]),
        gaps: JSON.stringify(["Didn't discuss React concurrent features", "Could mention real user monitoring vs synthetic"]),
      },
    }),
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 3,
        text: "How do you approach accessibility in complex interactive components like date pickers, data tables, or multi-step forms? Give me a concrete example.",
        category: "technical",
        transcript: "For a data table, which is very relevant to Northwind's dashboard, I'd follow the WAI-ARIA table pattern. The key elements: proper role attributes on table, row, columnheader, and cell elements. I'd implement keyboard navigation — arrow keys to move between cells, Enter to activate a cell, and Escape to cancel editing. For sorting, each column header becomes a button with aria-sort indicating current direction. For filtering, I'd use a live region that announces result counts after filtering. Screen reader users should hear something like '15 of 234 shipments shown'. For focus management, I maintain focus on the current cell even as the table re-renders with filtered data. I'd also ensure all interactive elements have visible focus indicators with at least 3:1 contrast ratio. I've used this approach before and tested it with VoiceOver and NVDA.",
        score: 88,
        feedback: "Impressive accessibility depth — clearly has hands-on experience with assistive technologies.",
        strengths: JSON.stringify(["Specific WAI-ARIA patterns", "Keyboard navigation details", "Live region for dynamic content", "Cross-screen-reader testing"]),
        gaps: JSON.stringify(["Could mention WCAG success criteria numbers"]),
      },
    }),
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 4,
        text: "Tell me about a time you had to make a significant technical decision that others disagreed with. How did you navigate the disagreement?",
        category: "behavioral",
        transcript: "At my previous company, I proposed migrating from a monolithic Create React App setup to a Next.js architecture. The team lead was against it — he felt it was too risky and would slow us down for months. I understood his concern, so instead of pushing harder, I built a proof of concept over a weekend showing our highest-traffic page running in Next.js with SSR. The page load time went from 3.2 seconds to 1.1 seconds. I presented this alongside a phased migration plan — we'd move route by route, keeping the old setup running in parallel. The key was showing, not telling. The team lead came around after seeing the numbers and the low-risk migration path. We completed the migration over 4 months and saw a 40% improvement in Core Web Vitals across the board.",
        score: 82,
        feedback: "Good story with measurable outcomes. Showed persuasion through evidence.",
        strengths: JSON.stringify(["Led with evidence (POC)", "Phased migration reduced risk", "Measurable outcome (40% CWV improvement)"]),
        gaps: JSON.stringify(["Could have discussed what happened if the migration had issues", "Didn't mention stakeholder buy-in beyond the team lead"]),
      },
    }),
    prisma.question.create({
      data: {
        sessionId: session.id,
        order: 5,
        text: "If you were tasked with reducing the Northwind Insights dashboard's initial load time by 50%, what systematic approach would you take?",
        category: "technical",
        transcript: "I'd follow a measurement-first approach. Step one: establish baselines with real user monitoring — P50, P75, P95 load times segmented by geography, device, and connection speed. Step two: analyze the critical rendering path. What's in the initial bundle? What blocks rendering? I'd use webpack-bundle-analyzer to find the biggest chunks. Step three: prioritize by impact. Usually the biggest wins are: aggressive code splitting, moving below-fold content to lazy loading, optimizing images with next/image or similar, and reducing JavaScript execution time. For Northwind specifically, I'd look at whether the dashboard loads shipment data before it's visible — we could defer API calls that aren't needed for the initial viewport. I'd also evaluate server-side rendering for the initial shell. Step four: implement and validate — each change gets measured against the baseline. I'd set up automated performance budgets in CI so we don't regress.",
        score: 80,
        feedback: "Methodical approach with good prioritization. Could push deeper on specific techniques.",
        strengths: JSON.stringify(["Measurement-first methodology", "RUM segmentation", "Practical prioritization"]),
        gaps: JSON.stringify(["Could mention edge computing or CDN strategies", "No discussion of streaming SSR"]),
      },
    }),
  ]);

  // Create the coaching report
  const reportData = {
    overallScore: 84,
    verdict: "Lean Pass",
    executiveSummary: "Strong candidate with deep frontend expertise, particularly in React performance optimization, design systems, and accessibility. Demonstrated real production experience and systematic thinking. Minor gaps in advanced concurrent React patterns and broader system architecture. Would be a solid addition to the Insights team with some ramp-up time on Northwind-specific patterns.",
    dimensionScores: {
      technical: 86,
      problemSolving: 82,
      communication: 85,
      behavioral: 80,
    },
    strengths: [
      { title: "Performance Optimization", detail: "Demonstrated deep knowledge of rendering optimization, profiling tools, and systematic performance improvement methodology." },
      { title: "Design Systems", detail: "Proposed a sophisticated three-tier design system architecture that shows production experience at scale." },
      { title: "Accessibility", detail: "Strong practical knowledge of WAI-ARIA patterns and assistive technology testing — goes beyond checkbox compliance." },
      { title: "Evidence-Based Communication", detail: "Consistently backed up claims with specific numbers and concrete examples." },
    ],
    areasToImprove: [
      { title: "React Concurrent Features", detail: "No mention of useTransition, useDeferredValue, or Suspense for data fetching — these are key for dashboard-scale apps.", priority: "high" as const },
      { title: "Error Recovery & Resilience", detail: "Debugging approach focused on identification but lacked discussion of error boundaries, retry strategies, and graceful degradation.", priority: "medium" as const },
      { title: "Stakeholder Communication", detail: "Behavioral answer focused on technical team but didn't address broader stakeholder management.", priority: "low" as const },
    ],
    studyPlan: [
      {
        topic: "React 18+ Concurrent Features",
        whyItMatters: "Northwind's dashboard needs concurrent rendering to stay responsive during heavy data loads.",
        resources: [
          { type: "article" as const, title: "React 18 Concurrent Features Guide", url: "https://react.dev/blog/2022/03/29/react-v18" },
          { type: "course" as const, title: "Advanced React Patterns by Kent C. Dodds", url: "https://epicreact.dev" },
          { type: "practice" as const, title: "Build a data table with useTransition", url: null },
        ],
        practicePrompt: "Build a filterable data table with 10,000 rows using useTransition to keep the UI responsive during filtering.",
        estimatedHours: 8,
      },
      {
        topic: "Error Boundaries & Resilience Patterns",
        whyItMatters: "Operations dashboards are watched all day — graceful degradation is critical.",
        resources: [
          { type: "article" as const, title: "Error Boundaries in React", url: "https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary" },
          { type: "practice" as const, title: "Implement retry + fallback patterns", url: null },
        ],
        practicePrompt: "Create an error boundary system with retry, fallback UI, and error reporting for a multi-widget dashboard.",
        estimatedHours: 4,
      },
    ],
    nextInterviewTips: [
      "Practice explaining React concurrent features — useTransition, Suspense for data fetching",
      "Prepare a story about handling production incidents or system failures",
      "Research the company's frontend stack and how customers use its dashboards day to day",
      "Have a ready answer about error recovery and resilience in business-critical UIs",
    ],
    companyCultureFit: "Strong alignment with Northwind's craft-oriented culture. Demonstrated attention to detail and customer-first thinking. The evidence-based approach to technical decisions matches the 'think rigorously' value.",
    estimatedRetakeReadiness: 14,
  };

  await prisma.report.create({
    data: {
      sessionId: session.id,
      overallScore: reportData.overallScore,
      technicalScore: reportData.dimensionScores.technical,
      behavioralScore: reportData.dimensionScores.behavioral,
      communicationScore: reportData.dimensionScores.communication,
      strengths: JSON.stringify(reportData.strengths),
      weaknesses: JSON.stringify(reportData.areasToImprove),
      studyPlan: JSON.stringify(reportData.studyPlan),
      summary: JSON.stringify(reportData),
    },
  });

  console.log(`Seeded 1 completed interview with ${questions.length} questions and a full report.`);
  console.log(`Seeded sample report → http://localhost:3000/report/${session.id}`);
  if (clientId === LEGACY_SEED_CLIENT_ID) {
    console.log(
      "Note: it is not listed in History, which is per browser. To attach it to your browser, re-run with\n" +
        "your client id (DevTools → Application → Local Storage → interviewiq-client-id): pnpm db:seed <client-id>",
    );
  } else {
    console.log("It is attached to the client id you passed, so it also appears in that browser's History.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
