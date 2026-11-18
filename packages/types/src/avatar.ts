import { z } from "zod";

/** Browser → server relay of the WebRTC SDP answer for the D-ID avatar stream. */
export const sdpAnswerRequestSchema = z.object({
  sdpAnswer: z.object({
    type: z.string().min(1),
    sdp: z.string().optional(),
  }),
});

export type SdpAnswerRequest = z.infer<typeof sdpAnswerRequestSchema>;

/** Browser → server relay of one ICE candidate. */
export const iceCandidateRequestSchema = z.object({
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
  }),
});

export type IceCandidateRequest = z.infer<typeof iceCandidateRequestSchema>;
