// Mock stage transition narration strings for Full Loop mode.

const MOCK_TRANSITIONS: Record<string, string> = {
  PHONE_SCREEN_TO_TECHNICAL:
    "Nice work on the phone screen portion! You came across as genuine and knowledgeable about your background. Now we're moving into the technical round, where we'll dive deeper into your hands-on engineering skills. Take a moment to gather your thoughts — these questions will be more in-depth.",

  TECHNICAL_TO_BEHAVIORAL:
    "Great job working through the technical questions. You showed solid problem-solving instincts. Now let's shift gears to the behavioral round. I'd love to hear about your real-world experiences working on teams, handling challenges, and making decisions. Remember to be specific with your examples.",

  BEHAVIORAL_TO_SYSTEM_DESIGN:
    "Thanks for sharing those experiences — your stories were really insightful. For this final round, we'll tackle a system design question. This is about demonstrating how you think at a higher level — there's no single right answer, so think out loud and walk me through your reasoning.",

  DEFAULT:
    "Good work on that section! Let's move on to the next part of the interview. Take a breath and we'll dive right in.",
};

export function getMockStageTransition(
  completedStage?: string,
  nextStage?: string,
): string {
  const key = `${completedStage}_TO_${nextStage}`;
  return MOCK_TRANSITIONS[key] ?? MOCK_TRANSITIONS.DEFAULT;
}
