import type { SessionStatus } from "./session";

export type InterviewEvent =
  | { type: "state_change"; data: { status: SessionStatus } }
  | {
      type: "question_ready";
      data: {
        questionId: string;
        text: string;
        category: string;
        order: number;
        total: number;
        /** True when this is an ad-hoc follow-up inserted by the adaptive engine. */
        isFollowUp?: boolean;
      };
    }
  | { type: "audio_ready"; data: { questionId: string; audioUrl: string } }
  | {
      type: "transcription_complete";
      data: { questionId: string; transcript: string };
    }
  | {
      type: "evaluation_complete";
      data: { questionId: string; score: number; tier: string };
    }
  | { type: "transition_text"; data: { message: string } }
  | {
      type: "stage_transition";
      data: {
        completedStage: string;
        stageScore: number;
        nextStage: string;
        transitionAudioUrl: string;
      };
    }
  | {
      type: "interview_complete";
      data: { sessionId: string; redirectTo: string };
    }
  | {
      type: "avatar_stream_ready";
      data: {
        sessionId: string;
        streamId: string;
        sdpOffer: { type: string; sdp?: string };
        iceServers: { urls: string | string[]; username?: string; credential?: string }[];
        /** Still image of the presenter, shown while no frames are flowing. */
        presenterUrl?: string;
      };
    }
  | { type: "avatar_stream_audio"; data: { questionId: string } }
  | { type: "avatar_stream_failed"; data: { reason: string } }
  | {
      type: "error";
      data: { code: string; message: string; retryable: boolean };
    };
