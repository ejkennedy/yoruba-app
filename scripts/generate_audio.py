# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "transformers>=4.44",
#   "torch>=2.2",
#   "scipy>=1.13",
#   "numpy<2",
# ]
# ///
"""
Generate Yorùbá audio locally using Meta's MMS-TTS (facebook/mms-tts-yor),
transcode to OGG Opus via ffmpeg, and upload to the R2 bucket via wrangler.

Runs truly offline after the first model download (~300MB weights).

Usage:
    uv run scripts/generate_audio.py                 # staging bucket
    uv run scripts/generate_audio.py --prod          # prod bucket
    uv run scripts/generate_audio.py --force         # regen even if R2 has file

Requires: `ffmpeg` on PATH (`brew install ffmpeg`), `wrangler` authenticated.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

FORCE = "--force" in sys.argv
IS_PROD = "--prod" in sys.argv
BUCKET = "yoruba-audio" if IS_PROD else "yoruba-audio-staging"
WRANGLER_FLAGS = ["--config", "./wrangler.prod.jsonc"] if IS_PROD else []


def audio_key(text: str) -> str:
    return f"audio/phrase/{hashlib.sha256(text.encode('utf-8')).hexdigest()[:24]}.ogg"


def collect_phrases() -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for fname in ("core-deck.json", "slang-deck.json"):
        p = DATA / fname
        if not p.exists():
            continue
        j = json.loads(p.read_text(encoding="utf-8"))
        for entry in j.get("phrases", []):
            y = entry["yoruba"]
            if y not in seen:
                seen.add(y)
                out.append(y)
    return out


def r2_exists(key: str) -> bool:
    with tempfile.NamedTemporaryFile(delete=False) as t:
        devnull = t.name
    try:
        r = subprocess.run(
            ["wrangler", "r2", "object", "get", f"{BUCKET}/{key}", f"--file={devnull}", *WRANGLER_FLAGS, "--remote"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        return r.returncode == 0
    finally:
        try:
            os.unlink(devnull)
        except OSError:
            pass


def r2_put(key: str, file_path: str) -> None:
    subprocess.run(
        [
            "wrangler", "r2", "object", "put", f"{BUCKET}/{key}",
            "--file", file_path,
            "--content-type=audio/ogg",
            "--remote",
            *WRANGLER_FLAGS,
        ],
        cwd=ROOT,
        check=True,
    )


def main() -> int:
    phrases = collect_phrases()
    print(f"→ {len(phrases)} unique phrases")

    print("→ Loading facebook/mms-tts-yor (first run downloads ~300MB)…")
    from transformers import VitsModel, AutoTokenizer
    import torch
    import scipy.io.wavfile

    model = VitsModel.from_pretrained("facebook/mms-tts-yor")
    tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-yor")
    model.eval()
    rate = model.config.sampling_rate
    print(f"✓ Model loaded ({rate} Hz)")

    ok, skipped, failed = 0, 0, 0
    t0 = time.time()

    for i, text in enumerate(phrases, 1):
        key = audio_key(text)
        if not FORCE and r2_exists(key):
            skipped += 1
            continue

        try:
            inputs = tokenizer(text, return_tensors="pt")
            with torch.no_grad():
                wav = model(**inputs).waveform
            arr = wav.squeeze().cpu().numpy()

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wf:
                scipy.io.wavfile.write(wf.name, rate=rate, data=arr)
                wav_path = wf.name
            ogg_path = wav_path[:-4] + ".ogg"

            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                 "-c:a", "libopus", "-b:a", "48k", ogg_path],
                check=True,
            )
            r2_put(key, ogg_path)

            os.unlink(wav_path)
            os.unlink(ogg_path)
            ok += 1
            print(f"[{i:>3}/{len(phrases)}] ✓ {text}  →  {key}")
        except subprocess.CalledProcessError as e:
            failed += 1
            print(f"[{i:>3}/{len(phrases)}] ✗ {text}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"[{i:>3}/{len(phrases)}] ✗ {text}: {e}")

    dt = time.time() - t0
    print(f"\nDone in {dt:.1f}s. generated={ok} skipped={skipped} failed={failed}")
    print("Next: bun run scripts/link-audio.ts --remote   (writes audio_key into D1)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
