import { create } from "zustand";
import { draftKey, saveJob } from "@/lib/saved-jobs";
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

  storageError: boolean;

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
  restored: boolean;
  restoreJob: (job: { jobDescription: string; parsedJob: ParsedJob; companyIntel: CompanyIntelligence | null }) => void;
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
  storageError: false,
  restored: false,
  parsedJob: null,
  companyIntel: null,
  error: null,
};

export const useSetupStore = create<SetupStore>((set, get) => ({
  ...initialState,

  setJobDescription: (text) => {
    try {
      if (text) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
      set({ jobDescription: text, storageError: false });
    } catch {
      set({ jobDescription: text, storageError: true });
    }
  },
  setResumeText: (text) => set({ resumeText: text }),
  setDifficulty: (d) => set({ difficulty: d }),
  setInterviewType: (t) => set({ interviewType: t }),
  setLanguage: (l) => set({ language: l }),
  setVideoMode: (v) => set({ videoMode: v }),
  setCoachEnabled: (v) => set({ coachEnabled: v }),

  restoreJob: ({ jobDescription, parsedJob, companyIntel }) =>
    set({ jobDescription, parsedJob, companyIntel, restored: true, step: "ready", error: null }),

  analyzeJob: async () => {
    const { jobDescription } = get();

    try {
      // Step 1: Parse job description
      set({ step: "parsing", restored: false, error: null });

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

      const companyIntel: CompanyIntelligence | null = researchRes.ok ? await researchRes.json() : null;
      let storageError = false;
      try {
        saveJob({ jobDescription, parsedJob, companyIntel });
      } catch {
        storageError = true;
      }
      set({ companyIntel, step: "ready", storageError });
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

  reset: () => {
    set(initialState);
    get().setJobDescription("");
  },
}));
