#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe PCM audio with Vosk")
    parser.add_argument("--model", required=True, help="Path to Vosk model directory")
    parser.add_argument("--audio-pcm", required=True, help="Path to PCM s16le mono audio file")
    parser.add_argument("--sample-rate", required=True, type=float, help="Audio sample rate")
    parser.add_argument("--language", required=False, default="pt-BR", help="Language hint (reserved)")
    return parser.parse_args()


def read_json_text(payload: str) -> str:
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return ""

    value = parsed.get("text")
    if isinstance(value, str):
        return value.strip()
    return ""


def main() -> int:
    args = parse_args()

    model_path = Path(args.model)
    audio_path = Path(args.audio_pcm)

    if not model_path.exists():
        print(
            json.dumps({"error": "MODEL_NOT_FOUND", "message": f"Model path not found: {model_path}"}),
            file=sys.stderr,
        )
        return 2

    if not audio_path.exists():
        print(
            json.dumps({"error": "AUDIO_NOT_FOUND", "message": f"Audio path not found: {audio_path}"}),
            file=sys.stderr,
        )
        return 3

    try:
        from vosk import KaldiRecognizer, Model
    except Exception as error:  # pragma: no cover
        print(
            json.dumps({"error": "VOSK_IMPORT_ERROR", "message": str(error)}),
            file=sys.stderr,
        )
        return 4

    try:
        model = Model(str(model_path))
        recognizer = KaldiRecognizer(model, args.sample_rate)

        chunks = []
        with audio_path.open("rb") as audio_file:
            while True:
                data = audio_file.read(4000)
                if len(data) == 0:
                    break

                if recognizer.AcceptWaveform(data):
                    text = read_json_text(recognizer.Result())
                    if text:
                        chunks.append(text)

        final_text = read_json_text(recognizer.FinalResult())
        if final_text:
            chunks.append(final_text)

        transcription = " ".join(chunks).strip()
        print(json.dumps({"text": transcription}))
        return 0
    except Exception as error:  # pragma: no cover
        print(
            json.dumps({"error": "TRANSCRIPTION_ERROR", "message": str(error)}),
            file=sys.stderr,
        )
        return 5


if __name__ == "__main__":
    raise SystemExit(main())
