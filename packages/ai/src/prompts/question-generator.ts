import {
  QUESTION_COUNT,
  questionSetSchema,
  type QuestionSet,
  type ParsedJob,
  type CompanyIntelligence,
  type Difficulty,
  type InterviewType,
  type Language,
} from "@interviewiq/types";
import { callClaude } from "../client";
import { languageInstruction } from "./language";
import { z } from "zod";
import { parseJsonObject } from "../utils/json";
import { zodToJsonSchema } from "zod-to-json-schema";
import { DATA_ONLY_INSTRUCTION, tagged } from "./untrusted";

const questionSetTool = {
  name: "submit_interview_questions",
  description: "Submit the complete interview question set.",
  input_schema: { ...zodToJsonSchema(questionSetSchema), type: "object" as const },
};

// Claude occasionally serializes the array inside the tool input. Decode it
// at the provider boundary and validate every question with the shared schema.
const questionSetResponse = questionSetSchema.extend({
  opening: questionSetSchema.shape.opening.default("Welcome! Let's get started with your interview."),
  closing: questionSetSchema.shape.closing.default("Thank you for your time today."),
  questions: z.preprocess(
    (value) => typeof value === "string" ? parseJsonObject(value) ?? value : value,
    questionSetSchema.shape.questions,
  ),
});

interface QuestionSetParams {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  parsedJob: ParsedJob;
  companyIntel: CompanyIntelligence | null;
  resumeText?: string | null;
  /** Override the difficulty-based count (used per stage in Full Loop mode). */
  questionCount?: number;
  language?: Language;
  continuingStage?: boolean;
}

function buildSystemPrompt(params: QuestionSetParams): string {
  const { companyName, jobTitle, difficulty, interviewType, resumeText } = params;
  const questionCount = params.questionCount ?? QUESTION_COUNT[difficulty];

  return `You are an expert technical interviewer at ${companyName} for the role of ${jobTitle}.

Seniority level: ${difficulty}. Interview type: ${interviewType}.

The user message carries the role context (company summary, skills, stack, culture, domain, responsibilities) inside <job_context> tags${resumeText ? " and the candidate's resume/CV inside <resume> tags" : ""}. ${DATA_ONLY_INSTRUCTION}

Submit the full set using the submit_interview_questions tool. Use the opening field for a brief greeting and the closing field for a farewell. Keep questions in the questions array. Use sequential question IDs, estimate duration in seconds, and give concise scoring criteria and follow-up triggers for each question.

Generate exactly ${questionCount} questions.
${params.continuingStage
  ? "This is a continuing stage of the same interview. The candidate has already introduced themselves. Begin with an approachable question about this stage’s topic."
  : "Make question 1 a self-introduction: invite the candidate to tell you a little about their professional background in their own words. This is a standalone behavioral question and counts toward the total. Wait for their answer before asking about a project or technical topic. Score this question for clarity and relevance to the role; a concise introduction can earn full marks."}

For JUNIOR: Focus on fundamentals and enthusiasm. No trick questions.
For MID: Balance technical depth with behavioral. Test tradeoffs.
For SENIOR: Heavy technical + system thinking. Test ambiguity handling and leadership signals.
For STAFF: Architectural decisions + leadership + navigating ambiguity. No perfect answers.

Use the responsibilities and interview type to choose the topics. Ask one focused question per turn. Start broad enough that the candidate can choose an example from their own work or studies.
For example, ask “Tell me about a performance problem you investigated.” Save a question about an index or a query plan for a follow-up if the candidate mentions the database. Use an example suited to this role.
Set the level through the judgment or trade-off you want to hear. Mention a specific technology when it is central to the skill being tested. Score sound reasoning across plausible approaches.
Write follow-up triggers around something a candidate might actually say, with one short probe that builds on it.
${resumeText ? `
Use the CV to choose relevant topics. Let the candidate choose which experience to discuss; refer to a particular CV detail only when it makes a question more natural.
` : ""}
${languageInstruction(params.language)}
Use the tool once with the complete question set.`;
}

/** Role context derived from the job posting and web research — untrusted, so it rides in the user turn. */
function buildUserContext(params: QuestionSetParams): string {
  const { parsedJob, companyIntel, resumeText } = params;
  const context = `Company context: ${parsedJob.companySummary || "No additional context available."}
Primary skills required: ${(parsedJob.primarySkills ?? []).join(", ") || "Not specified"}
Known company tech stack: ${companyIntel?.techStack?.join(", ") || (parsedJob.inferredStack ?? []).join(", ") || "Not specified"}
Engineering culture: ${companyIntel?.engineeringCulture || "Not available"}
Domain: ${parsedJob.domain}
Key responsibilities: ${(parsedJob.keyResponsibilities ?? []).join(", ") || "Not specified"}`;
  return [tagged("job_context", context), resumeText ? tagged("resume", resumeText) : null]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateQuestionSet(params: QuestionSetParams): Promise<QuestionSet> {
  const systemPrompt = buildSystemPrompt(params);
  const context = buildUserContext(params);
  const request = `Generate interview questions for a ${params.difficulty} ${params.jobTitle} at ${params.companyName}. Interview type: ${params.interviewType}.`;
  const userMessage = `${context}\n\n${request}`;

  const options = { maxTokens: 8192, tool: questionSetTool };
  const raw = await callClaude(systemPrompt, userMessage, options);
  const result = questionSetResponse.safeParse(raw);
  if (result.success) return result.data;

  const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
  const retry = await callClaude(systemPrompt,
    `${userMessage} Regenerate the set. The previous tool input failed validation at: ${fields}. Supply questions as an array of question objects.`,
    options,
  );
  return questionSetResponse.parse(retry);
}
