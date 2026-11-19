import { create } from "zustand";
import { draftKey, saveJob } from "@/lib/saved-jobs";
import { getClientId } from "@/lib/client-id";
import { apiFetch } from "@/lib/api-client";
import { toUiError, type UiError } from "@/lib/errors";
import type {
  ParsedJob,
  CompanyIntelligence,
  Difficulty,
  InterviewType,
  Language,
} from "@interviewiq/types";

type SetupStep = "input" | "parsing" | "researching" | "ready" | "error";

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
  /** Why analysis failed; rendered with describeError. */
  error: UiError | null;

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
  error: null as UiError | null,
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

      const parsedJob = await apiFetch<ParsedJob>("/api/parse-job", {
        method: "POST",
        json: { jobDescription, clientId: getClientId() },
      });
      set({ parsedJob, step: "researching" });

      // Step 2: Research company. Optional: the interview works without it.
      const companyIntel = await apiFetch<CompanyIntelligence>("/api/research-company", {
        method: "POST",
        json: {
          companyName: parsedJob.companyName,
          jobTitle: parsedJob.jobTitle,
          primarySkills: parsedJob.primarySkills,
          clientId: getClientId(),
        },
      }).catch(() => null);
      let storageError = false;
      try {
        saveJob({ jobDescription, parsedJob, companyIntel });
      } catch {
        storageError = true;
      }
      set({ companyIntel, step: "ready", storageError });
    } catch (error) {
      set({ step: "error", error: toUiError(error) });
    }
  },

  clearAnalysis: () =>
    set({ parsedJob: null, companyIntel: null, step: "input", error: null }),

  reset: () => {
    set(initialState);
    get().setJobDescription("");
  },
}));
