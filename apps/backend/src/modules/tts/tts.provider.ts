import { env } from "../../config/env";
import { PythonGttsTtsProvider } from "./providers/python-gtts.provider";

export interface TtsSynthesisInput {
  text: string;
  language: string;
  outputPath: string;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(input: TtsSynthesisInput): void;
}

export function createTtsProvider(): TtsProvider | null {
  switch (env.ttsProvider) {
    case "python-gtts":
      return new PythonGttsTtsProvider();
    case "disabled":
    default:
      return null;
  }
}
