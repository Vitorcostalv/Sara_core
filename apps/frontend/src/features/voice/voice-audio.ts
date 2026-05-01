import { VoiceApiError } from "../../services/api/voice";

export type VoiceRequestStatus = "idle" | "recording" | "uploading";
export type VoiceInputSource = "file" | "microphone";

export const maxAudioUploadBytes = 10 * 1024 * 1024;

export const supportedAudioMimeTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac"
] as const;

export const supportedAudioExtensions = [
  ".webm",
  ".ogg",
  ".wav",
  ".mp3",
  ".mp4",
  ".m4a",
  ".aac"
] as const;

const mimeTypeByExtension: Record<string, string> = {
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/x-m4a",
  ".aac": "audio/aac"
};

const preferredRecorderMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4"
];

export const acceptedAudioTypes = [...supportedAudioMimeTypes, ...supportedAudioExtensions].join(",");

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function getSupportedRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }

  return preferredRecorderMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export function hasVoiceCaptureSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "MediaRecorder" in window &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export function isInsecureAudioContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === false;
}

export function getVoiceCaptureAvailabilityMessage(): string | null {
  if (!hasVoiceCaptureSupport()) {
    return "Este navegador nao oferece suporte a gravacao com MediaRecorder.";
  }

  if (isInsecureAudioContext()) {
    return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
  }

  return null;
}

export function getMicrophoneAccessErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Microfone indisponivel. Conecte um dispositivo de entrada e tente novamente.";
    }

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return isInsecureAudioContext()
        ? "A captura de audio exige contexto seguro (HTTPS ou localhost)."
        : "Permissao de microfone negada no navegador.";
    }

    if (error.name === "SecurityError") {
      return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Nao foi possivel ler o microfone. Feche outros apps que estejam usando o dispositivo.";
    }
  }

  if (error instanceof TypeError && isInsecureAudioContext()) {
    return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
  }

  return "Nao foi possivel acessar o microfone. Verifique as permissoes do navegador.";
}

export function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex < 0) {
    return "";
  }

  return normalizedName.slice(extensionIndex);
}

export function getAudioMimeTypeFromFile(file: File): string {
  const normalizedMimeType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";

  if (supportedAudioMimeTypes.includes(normalizedMimeType as (typeof supportedAudioMimeTypes)[number])) {
    return normalizedMimeType;
  }

  return mimeTypeByExtension[getFileExtension(file.name)] ?? "";
}

export function normalizeAudioFile(file: File): File {
  const normalizedMimeType = getAudioMimeTypeFromFile(file);

  if (normalizedMimeType.length === 0 || normalizedMimeType === file.type) {
    return file;
  }

  return new File([file], file.name, {
    type: normalizedMimeType,
    lastModified: file.lastModified
  });
}

export function validateAudioFile(file: File): string | null {
  if (file.size === 0) {
    return "O arquivo selecionado esta vazio.";
  }

  if (file.size > maxAudioUploadBytes) {
    return `O arquivo excede o limite atual de ${formatBytes(maxAudioUploadBytes)}.`;
  }

  const normalizedMimeType = getAudioMimeTypeFromFile(file);
  const extension = getFileExtension(file.name);

  if (
    normalizedMimeType.length === 0 &&
    !supportedAudioExtensions.includes(extension as (typeof supportedAudioExtensions)[number])
  ) {
    return "Formato de audio nao suportado. Use webm, ogg, wav, mp3, mp4, m4a ou aac.";
  }

  return null;
}

export function getMicrophoneFileName(blobType: string): string {
  if (blobType.includes("ogg")) {
    return "microphone-recording.ogg";
  }

  if (blobType.includes("mp4") || blobType.includes("m4a")) {
    return "microphone-recording.m4a";
  }

  return "microphone-recording.webm";
}

export function getVoiceRequestErrorMessage(error: VoiceApiError): string {
  const normalizedMessage = error.message.toLowerCase();

  if (error.status === 401) {
    return "A API recusou a tentativa atual. Verifique a chave de integracao configurada neste ambiente.";
  }

  if (error.status === 429) {
    return error.retryAfterSeconds
      ? `Limite temporario de voz atingido. Aguarde cerca de ${error.retryAfterSeconds}s antes de tentar novamente.`
      : "Limite temporario de voz atingido. Aguarde um pouco antes de tentar novamente.";
  }

  if (error.status === 404) {
    return "Endpoint de voz nao encontrado no backend (POST /api/v1/voice/interactions).";
  }

  if (error.status === 400) {
    if (
      normalizedMessage.includes("uploaded audio file is empty") ||
      normalizedMessage.includes("voice_audio_empty")
    ) {
      return "O backend recebeu um audio vazio. Selecione outro arquivo e tente novamente.";
    }

    if (
      normalizedMessage.includes("audio file is required") ||
      normalizedMessage.includes("voice_audio_required")
    ) {
      return "Selecione um arquivo de audio antes de enviar.";
    }

    return "O backend rejeitou o upload. Revise o arquivo selecionado e tente novamente.";
  }

  if (error.status === 413) {
    return `O arquivo excede o limite configurado no backend (${formatBytes(maxAudioUploadBytes)} no ambiente atual).`;
  }

  if (error.status === 415) {
    return "Formato de audio nao suportado pelo backend. Use webm, ogg, wav, mp3, mp4, m4a ou aac.";
  }

  if (error.status >= 500) {
    if (normalizedMessage.includes("failed to convert audio")) {
      return "O backend nao conseguiu converter o audio enviado. Tente outro arquivo.";
    }

    return "Falha interna ao processar o audio no backend.";
  }

  return error.message;
}
