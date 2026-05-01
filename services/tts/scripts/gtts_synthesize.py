#!/usr/bin/env python3
"""Text-to-Speech synthesis using gTTS (Google Text-to-Speech).

Install dependency: pip install gTTS
"""

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize speech from text using gTTS")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--output", required=True, help="Output MP3 file path")
    parser.add_argument("--language", required=False, default="pt", help="BCP 47 primary language tag (e.g. pt, en, es)")
    parser.add_argument("--slow", action="store_true", help="Use slower speech rate")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    text = args.text.strip()
    if not text:
        print(json.dumps({"error": "EMPTY_TEXT", "message": "Text is empty after stripping"}), file=sys.stderr)
        return 2

    try:
        from gtts import gTTS
    except ImportError:
        print(
            json.dumps({
                "error": "GTTS_NOT_INSTALLED",
                "message": "gTTS not installed. Run: pip install gTTS",
            }),
            file=sys.stderr,
        )
        return 3

    try:
        tts = gTTS(text=text, lang=args.language, slow=args.slow)
        tts.save(str(output_path))
        print(json.dumps({"success": True, "outputPath": str(output_path)}))
        return 0
    except Exception as error:
        print(
            json.dumps({"error": "SYNTHESIS_ERROR", "message": str(error)}),
            file=sys.stderr,
        )
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
