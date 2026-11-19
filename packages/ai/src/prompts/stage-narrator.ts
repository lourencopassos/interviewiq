import { FULL_LOOP_STAGES, type InterviewStage, type Language } from "@interviewiq/types";
import { callClaudePlainText } from "../client";
import { languageInstruction } from "./language";
import { fallbacksFor } from "../i18n/fallbacks";
import { getMockStageTransition } from "../mock/fixtures/stage-transition";

/** English stage name for the prompt; the model writes the narration in the session language. */
function promptStageName(stage: InterviewStage): string {
  return FULL_LOOP_STAGES.find((s) => s.stage === stage)?.label ?? stage;
}

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  completedStage: string;
  completedStageScore: number;
  nextStage: string;
  language?: Language;
}): string {
  const {
    companyName,
    jobTitle,
    completedStage,
    completedStageScore,
    nextStage,
  } = params;

  return `You are a professional interviewer at ${companyName} conducting a Full Loop interview for ${jobTitle}.

You just completed the "${completedStage}" stage. The candidate scored ${completedStageScore}/100.

Now transitioning to the "${nextStage}" stage.

Generate a brief, natural-sounding transition (2-3 sentences) that:
1. Acknowledges the completed stage without revealing the exact score
2. Sets expectations for the next stage
3. Keeps a warm but professional tone

${completedStageScore >= 75 ? "The candidate did well — be encouraging." : completedStageScore >= 50 ? "The candidate did okay — be neutral and supportive." : "The candidate struggled — be encouraging and reassuring."}

${languageInstruction(params.language)}
Return ONLY the transition text. No JSON, no quotes, no formatting. This will be spoken aloud via text-to-speech.`;
}

export async function generateStageTransition(params: {
  companyName: string;
  jobTitle: string;
  completedStage: InterviewStage;
  completedStageScore: number;
  nextStage: InterviewStage;
  language?: Language;
}): Promise<string> {
  try {
    return await callClaudePlainText(
      buildSystemPrompt({
        companyName: params.companyName,
        jobTitle: params.jobTitle,
        completedStage: promptStageName(params.completedStage),
        completedStageScore: params.completedStageScore,
        nextStage: promptStageName(params.nextStage),
        language: params.language,
      }),
      "Generate the stage transition narration.",
      { maxTokens: 256, mockText: getMockStageTransition(params.completedStage, params.nextStage) },
    );
  } catch (error) {
    console.error("Stage transition generation failed:", error);
    const fallback = fallbacksFor(params.language);
    return fallback.stageTransition(
      fallback.stageNames[params.completedStage],
      fallback.stageNames[params.nextStage],
    );
  }
}
