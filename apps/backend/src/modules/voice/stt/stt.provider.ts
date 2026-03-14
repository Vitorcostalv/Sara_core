export interface SttTranscriptionInput {
  audioPcmPath: string;
  sampleRate: number;
  language?: string;
}

export interface SttProvider {
  transcribe(input: SttTranscriptionInput): string;
}
