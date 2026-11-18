import type { InterviewStage } from "@interviewiq/types";
import { callClaudePlainText } from "../client";

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  completedStage: string;
  completedStageScore: number;
  nextStage: string;
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

Return ONLY the transition text. No JSON, no quotes, no formatting. This will be spoken aloud via text-to-speech.`;
}

export async function generateStageTransition(params: {
  companyName: string;
  jobTitle: string;
  completedStage: InterviewStage;
  completedStageLabel: string;
  completedStageScore: number;
  nextStageLabel: string;
}): Promise<string> {
  try {
    const text = await callClaudePlainText(
      buildSystemPrompt({
        companyName: params.companyName,
        jobTitle: params.jobTitle,
        completedStage: params.completedStageLabel,
        completedStageScore: params.completedStageScore,
        nextStage: params.nextStageLabel,
      }),
      "Generate the stage transition narration.",
      { maxTokens: 256 },
    );

    return text;
  } catch (error) {
    console.error("Stage transition generation failed:", error);
    return `Great, we've wrapped up the ${params.completedStageLabel} portion. Let's move on to ${params.nextStageLabel}.`;
  }
}
