import { create } from "zustand";
import { getClientId } from "@/lib/client-id";
import type {
  ParsedJob,
  CompanyIntelligence,
  Difficulty,
  InterviewType,
  Language,
} from "@interviewiq/types";

type SetupStep = "input" | "parsing" | "researching" | "ready" | "error";

/**
 * Error codes the store emits for its own failure modes. Server-provided
 * messages are passed through unchanged; the rendering component maps
 * these codes to localized copy and shows anything else verbatim.
 */
export const SETUP_ERROR_CODES = {
  network: "NETWORK_ERROR",
  parseFailed: "PARSE_FAILED",
  unknown: "UNKNOWN_ERROR",
} as const;
export type SetupErrorCode = (typeof SETUP_ERROR_CODES)[keyof typeof SETUP_ERROR_CODES];

interface SetupStore {
  // Input state
  jobDescription: string;
  resumeText: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  language: Language;
  videoMode: boolean;
  coachEnabled: boolean;

  // Flow state
  step: SetupStep;
  parsedJob: ParsedJob | null;
  companyIntel: CompanyIntelligence | null;
  error: string | null;

  // Actions
  setJobDescription: (text: string) => void;
  setResumeText: (text: string) => void;
  setDifficulty: (d: Difficulty) => void;
  setInterviewType: (t: InterviewType) => void;
  setLanguage: (l: Language) => void;
  setVideoMode: (v: boolean) => void;
  setCoachEnabled: (v: boolean) => void;
  analyzeJob: () => Promise<void>;
  clearAnalysis: () => void;
  reset: () => void;
}

const initialState = {
  jobDescription: "",
  resumeText: "",
  difficulty: "MID" as Difficulty,
  interviewType: "TECHNICAL" as InterviewType,
  language: "EN" as Language,
  videoMode: false,
  coachEnabled: true,
  step: "input" as SetupStep,
  parsedJob: null,
  companyIntel: null,
  error: null,
};

export const useSetupStore = create<SetupStore>((set, get) => ({
  ...initialState,

  setJobDescription: (text) => set({ jobDescription: text }),
  setResumeText: (text) => set({ resumeText: text }),
  setDifficulty: (d) => set({ difficulty: d }),
  setInterviewType: (t) => set({ interviewType: t }),
  setLanguage: (l) => set({ language: l }),
  setVideoMode: (v) => set({ videoMode: v }),
  setCoachEnabled: (v) => set({ coachEnabled: v }),

  analyzeJob: async () => {
    const { jobDescription } = get();

    try {
      // Step 1: Parse job description
      set({ step: "parsing", error: null });

      const parseRes = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, clientId: getClientId() }),
      });

      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || SETUP_ERROR_CODES.parseFailed);
      }

      const parsedJob: ParsedJob = await parseRes.json();
      set({ parsedJob, step: "researching" });

      // Step 2: Research company
      const researchRes = await fetch("/api/research-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: parsedJob.companyName,
          jobTitle: parsedJob.jobTitle,
          primarySkills: parsedJob.primarySkills,
          clientId: getClientId(),
        }),
      });

      if (!researchRes.ok) {
        // Company research failure is non-fatal — continue with null intel
        set({ companyIntel: null, step: "ready" });
        return;
      }

      const companyIntel: CompanyIntelligence = await researchRes.json();
      set({ companyIntel, step: "ready" });
    } catch (error) {
      const message =
        error instanceof TypeError
          ? SETUP_ERROR_CODES.network
          : error instanceof Error
            ? error.message
            : SETUP_ERROR_CODES.unknown;
      set({ step: "error", error: message });
    }
  },

  clearAnalysis: () =>
    set({ parsedJob: null, companyIntel: null, step: "input", error: null }),

  reset: () => set(initialState),
}));
