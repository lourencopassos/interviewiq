import { prisma, type InterviewStage } from "@interviewiq/db";
import type { AnswerEvaluation, GeneratedQuestion, Language } from "@interviewiq/types";
import type { AdaptiveQuestion } from "../services/adaptive-engine";
import { fallbacksFor } from "../i18n/fallbacks";
import { isString, parseJsonArray } from "../utils/json";
import { parseQuestionMeta, type QuestionMeta } from "../utils/question-meta";

/** A question as loaded from the DB, the single source of truth during an interview. */
export interface RuntimeQuestion extends AdaptiveQuestion {
  stage: InterviewStage | null;
  order: number;
  text: string;
  category: string;
  targetSkill: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  score: number | null;
  transcript: string | null;
  strengths: string[];
  gaps: string[];
}

/** One generated question to persist, optionally tagged with its Full Loop stage. */
export interface NewQuestion {
  question: GeneratedQuestion;
  stage?: InterviewStage;
}

export interface QuestionRow {
  id: string;
  order: number;
  text: string;
  category: string;
  stage: InterviewStage | null;
  metadata: string | null;
  score: number | null;
  transcript: string | null;
  strengths: string | null;
  gaps: string | null;
}

/** Map a stored row to the runtime view, filling metadata gaps with safe defaults. */
export function toRuntimeQuestion(row: QuestionRow, language?: Language): RuntimeQuestion {
  const meta = parseQuestionMeta(row.metadata);
  return {
    id: row.id,
    order: row.order,
    text: row.text,
    category: row.category,
    stage: row.stage,
    difficulty: typeof meta.difficulty === "number" ? meta.difficulty : 3,
    targetSkill: meta.targetSkill || "general",
    scoringGuide: meta.scoringGuide || fallbacksFor(language).scoringGuide,
    isFollowUp: meta.isFollowUp === true,
    score: row.score,
    transcript: row.transcript,
    strengths: parseJsonArray(row.strengths, isString),
    gaps: parseJsonArray(row.gaps, isString),
  };
}

/**
 * The ordered question list of one session. `order` is dense and unique
 * (`0..n-1`) so `Session.currentIndex` means the same thing in every process.
 */
export class QuestionRepository {
  constructor(
    private readonly sessionId: string,
    private readonly language?: Language,
  ) {}

  /** Always read from the DB so any process sees the same order. */
  async load(): Promise<RuntimeQuestion[]> {
    const rows = await prisma.question.findMany({
      where: { sessionId: this.sessionId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        text: true,
        category: true,
        stage: true,
        metadata: true,
        score: true,
        transcript: true,
        strengths: true,
        gaps: true,
      },
    });
    return rows.map((row) => toRuntimeQuestion(row, this.language));
  }

  /** Remove leftovers from a previously failed start. */
  async clear(): Promise<void> {
    await prisma.question.deleteMany({ where: { sessionId: this.sessionId } });
  }

  /** Persist a generated set in the given order, numbering it from 0. */
  async insertAll(questions: NewQuestion[]): Promise<void> {
    await prisma.question.createMany({
      data: questions.map(({ question, stage }, order) => ({
        sessionId: this.sessionId,
        order,
        text: question.text,
        category: question.category,
        ...(stage && { stage }),
        metadata: JSON.stringify(question),
      })),
    });
  }

  /**
   * Insert a follow-up right after `parent`, shifting every later row up by
   * one in the same transaction so `order` stays dense and unique.
   */
  async insertFollowUp(parent: RuntimeQuestion, text: string): Promise<void> {
    const meta: QuestionMeta = {
      isFollowUp: true,
      parentQuestionId: parent.id,
      difficulty: parent.difficulty,
      targetSkill: parent.targetSkill,
      scoringGuide: parent.scoringGuide,
    };

    await prisma.$transaction([
      prisma.question.updateMany({
        where: { sessionId: this.sessionId, order: { gt: parent.order } },
        data: { order: { increment: 1 } },
      }),
      prisma.question.create({
        data: {
          sessionId: this.sessionId,
          order: parent.order + 1,
          text,
          category: parent.category,
          stage: parent.stage,
          metadata: JSON.stringify(meta),
        },
      }),
    ]);
  }

  async recordAnswer(questionId: string, transcript: string, evaluation: AnswerEvaluation): Promise<void> {
    await prisma.question.update({
      where: { id: questionId },
      data: {
        transcript,
        score: evaluation.score,
        feedback: evaluation.shortFeedback,
        strengths: JSON.stringify(evaluation.keyStrengths),
        gaps: JSON.stringify(evaluation.gaps),
      },
    });
  }
}
