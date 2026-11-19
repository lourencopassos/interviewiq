import { normalizeAudioMimeType } from "@interviewiq/types";
import { isMockMode, delay } from "../mock";
import { getMockSilenceBuffer } from "../mock/mock-audio";
import { getNextMockTranscript } from "../mock/fixtures/transcript";
import { requireApiKey } from "../errors";

// ElevenLabs premade voices. eleven_turbo_v2_5 is multilingual, so any voice can
// speak any supported language; these are sensible defaults, overridable per language.
const VOICE_BY_LANGUAGE: Record<string, string> = {
  EN: process.env.ELEVENLABS_VOICE_EN || "EXAVITQu4vr4xnSDxMaL", // Rachel — professional, neutral
  PT_BR: process.env.ELEVENLABS_VOICE_PT_BR || "GBv7mTt0atIp3Br8iCZE", // Thomas — multilingual
  ES: process.env.ELEVENLABS_VOICE_ES || "ErXwobaYiN019PkySvjV", // Antoni — multilingual
};

/** Whisper ISO-639-1 code and a transcription prompt per interview language. */
const WHISPER_BY_LANGUAGE: Record<string, { code: string; prompt: string }> = {
  EN: { code: "en", prompt: "This is a technical interview answer about software engineering." },
  PT_BR: { code: "pt", prompt: "Esta é uma resposta de entrevista técnica sobre engenharia de software." },
  ES: { code: "es", prompt: "Esta es una respuesta de entrevista técnica sobre ingeniería de software." },
};

export class AudioPipelineError extends Error {
  constructor(
    message: string,
    public service: "whisper" | "elevenlabs",
  ) {
    super(message);
    this.name = "AudioPipelineError";
  }
}

export class AudioPipeline {
  async transcribe(
    audioBuffer: Buffer,
    language: string,
    mimeType: string = "audio/webm",
  ): Promise<string> {
    if (isMockMode()) {
      await delay(200);
      return getNextMockTranscript();
    }

    const apiKey = requireApiKey("openai");
    const whisper = WHISPER_BY_LANGUAGE[language] ?? WHISPER_BY_LANGUAGE.EN;
    const { type, extension } = normalizeAudioMimeType(mimeType);

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([new Uint8Array(audioBuffer)], { type }),
        `answer.${extension}`,
      );
      formData.append("model", "whisper-1");
      formData.append("language", whisper.code);
      formData.append("prompt", whisper.prompt);

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      if (error instanceof AudioPipelineError) throw error;
      throw new AudioPipelineError(
        `Whisper transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "whisper",
      );
    }
  }

  async synthesize(text: string, language: string): Promise<Buffer> {
    if (isMockMode()) {
      await delay(150);
      return getMockSilenceBuffer();
    }

    const apiKey = requireApiKey("elevenlabs");
    const voiceId = VOICE_BY_LANGUAGE[language] ?? VOICE_BY_LANGUAGE.EN;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof AudioPipelineError) throw error;
      throw new AudioPipelineError(
        `ElevenLabs TTS failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "elevenlabs",
      );
    }
  }
}
