import { buildApiUrl } from "./client";

const defaultVoiceEndpoint = "/voice/interactions";

export class VoiceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export interface VoiceInteractionResponse {
  transcription: string | null;
  assistantText: string | null;
  audioReplyUrl: string | null;
  wakeWordDetected: boolean | null;
}

interface SendVoiceInteractionParams {
  audioBlob: Blob;
  language?: string;
  endpoint?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readOptionalString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const fieldValue = data[key];

    if (typeof fieldValue === "string") {
      return fieldValue;
    }
  }

  return null;
}

function readOptionalBoolean(data: Record<string, unknown>, key: string) {
  const fieldValue = data[key];

  if (typeof fieldValue === "boolean") {
    return fieldValue;
  }

  return null;
}

function resolveFileName(blob: Blob) {
  if (blob.type.includes("ogg")) {
    return "recording.ogg";
  }

  if (blob.type.includes("mp4") || blob.type.includes("m4a")) {
    return "recording.m4a";
  }

  return "recording.webm";
}

async function readErrorMessage(response: Response) {
  try {
    const payload = asRecord(await response.json());

    if (!payload) {
      return null;
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    return null;
  }

  return null;
}

export async function sendVoiceInteraction({
  audioBlob,
  language = "pt-BR",
  endpoint = defaultVoiceEndpoint
}: SendVoiceInteractionParams): Promise<VoiceInteractionResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, resolveFileName(audioBlob));
  formData.append("language", language);

  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const backendMessage = await readErrorMessage(response);
    const details = backendMessage ? `: ${backendMessage}` : "";
    throw new VoiceApiError(`Voice request failed with status ${response.status}${details}`, response.status);
  }

  const payload = asRecord(await response.json()) ?? {};

  return {
    transcription: readOptionalString(payload, ["transcription", "transcript", "text"]),
    assistantText: readOptionalString(payload, ["assistantText", "responseText", "reply"]),
    audioReplyUrl: readOptionalString(payload, ["audioReplyUrl", "ttsUrl"]),
    wakeWordDetected: readOptionalBoolean(payload, "wakeWordDetected")
  };
}
