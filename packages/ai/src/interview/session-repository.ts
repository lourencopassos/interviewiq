import { prisma, type Session, type SessionStatus } from "@interviewiq/db";
import { AppError } from "../errors";

/**
 * Session reads and status transitions. Every transition is a conditional
 * write on the current status, so two processes (or two requests) can never
 * both advance the same session.
 */
export class SessionRepository {
  constructor(private readonly sessionId: string) {}

  async load(): Promise<Session> {
    const session = await prisma.session.findUnique({ where: { id: this.sessionId } });
    if (!session) throw new AppError("SESSION_NOT_FOUND");
    return session;
  }

  /** Atomically move `from` → `to`. Returns false when the session was not in `from`. */
  async transition(from: SessionStatus, to: SessionStatus): Promise<boolean> {
    const { count } = await prisma.session.updateMany({
      where: { id: this.sessionId, status: from },
      data: { status: to },
    });
    return count > 0;
  }

  /** BRIEFING → INTERVIEWING with the generated opening and closing lines. */
  async commitInterview(opening: string, closing: string): Promise<void> {
    await prisma.session.update({
      where: { id: this.sessionId, status: "BRIEFING" },
      data: { status: "INTERVIEWING", currentIndex: 0, opening, closing },
    });
  }

  async setCurrentIndex(index: number): Promise<void> {
    await prisma.session.update({
      where: { id: this.sessionId, status: "INTERVIEWING" },
      data: { currentIndex: index },
    });
  }

  async markWrappingUp(): Promise<void> {
    await prisma.session.update({
      where: { id: this.sessionId, status: "INTERVIEWING" },
      data: { status: "WRAPPING_UP" },
    });
  }

  /** Any state except ABANDONED → COMPLETED (an abandoned session stays abandoned). */
  markCompleted() {
    return prisma.session.update({
      where: { id: this.sessionId, status: { not: "ABANDONED" } },
      data: { status: "COMPLETED" },
    });
  }
}
