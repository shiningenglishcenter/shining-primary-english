"""
Recorded voice (ARCHITECTURE D67), step 2: makes one mp3 per text with Kokoro
(open model, runs locally, no API). British English: "emma" reads, and the
reply after " – " in a short dialogue is read by "george".

    pip install -r scripts/voice/requirements.txt   (and ffmpeg)
    python scripts/voice/generate.py <todo.json> <model folder> <out folder>

The model folder holds kokoro-v1.0.onnx and voices-v1.0.bin (from the
kokoro-onnx "model-files-v1.0" release). Existing files are skipped.
"""

import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SPEED = 0.9  # a little slower, for young learners
PAUSE = 0.35  # seconds between the two speakers of a dialogue


def main() -> None:
    todo_path, model_dir, out_dir = sys.argv[1:4]
    os.makedirs(out_dir, exist_ok=True)
    kokoro = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
    todo = json.load(open(todo_path, encoding="utf-8"))
    made = 0
    for n, item in enumerate(todo, 1):
        out = os.path.join(out_dir, f"{item['key']}.mp3")
        if os.path.exists(out):
            continue
        parts = [p.strip() for p in re.split(r"\s+[–—]\s+", item["text"]) if p.strip()]
        chunks, rate = [], 24000
        for i, part in enumerate(parts[:2] if len(parts) == 2 else ["  ".join(parts)]):
            audio, rate = kokoro.create(part, voice="bm_george" if i == 1 else "bf_emma", speed=SPEED, lang="en-gb")
            if chunks:
                chunks.append(np.zeros(int(rate * PAUSE), dtype=audio.dtype))
            chunks.append(audio)
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            sf.write(wav.name, np.concatenate(chunks), rate)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", wav.name, "-ac", "1", "-b:a", "40k", out], check=True
            )
        made += 1
        if n % 200 == 0:
            print(f"{n}/{len(todo)}", flush=True)
    print(f"{made} files made in {out_dir}")


if __name__ == "__main__":
    main()
