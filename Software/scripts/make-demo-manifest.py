"""Build public/demo/manifest.json from the WAVs in public/demo.

The /demo page never computes SNR, STOI or PESQ — it only reads them. This
script finds the audio and writes the skeleton; the numbers come from your
evaluation run and are filled in by hand (or by whatever writes your results).

Expected layout
---------------
    public/demo/noisy/<noise>_<snr>dB_<clip>.wav     the input, e.g. gunshot_-5dB_01.wav
    public/demo/clean/<noise>_<snr>dB_<clip>.wav     the enhanced output, same name
    public/demo/stages/<noise>_<snr>dB_<clip>_<stage>.wav
                                                     optional taps, <stage> being
                                                     prefilter, rnnoise or postfilter

A clip is only listed when both the noisy and the clean file exist; a noisy file
with no partner is reported and skipped, because a lane with nothing to compare
against is not evidence.

What it writes
--------------
Every metric field is written as ``null``. The page prints an em dash for null,
so an unfilled manifest is honest rather than flattering. Fill in::

    "noisy":    { "file": "...", "snrDb": -5.0, "stoi": 0.61, "pesq": 1.42 },
    "enhanced": { "file": "...", "snrDb": 14.2, "stoi": 0.89, "pesq": 2.61 },
    "status":   "MEASURED"

Existing metrics are never silently lost: on a rerun, any non-null metric and
any status already in manifest.json is carried over and reported on stdout.
Pass --reset to throw them away instead (it says so before it does).

Usage
-----
    python scripts/make-demo-manifest.py           # rebuild, keeping filled metrics
    python scripts/make-demo-manifest.py --reset   # rebuild from the files alone
    python scripts/make-demo-manifest.py --check   # report only, write nothing

Standard library only — no numpy, no soundfile.
"""

from __future__ import annotations

import argparse
import contextlib
import json
import re
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "public" / "demo"
MANIFEST = DEMO / "manifest.json"

NOISY_DIR = "noisy"
CLEAN_DIR = "clean"
STAGES_DIR = "stages"
STAGES = ("prefilter", "rnnoise", "postfilter")

# gunshot_-5dB_01.wav -> noise "gunshot", snr -5, clip "01"
NAME_RE = re.compile(r"^(?P<noise>[A-Za-z0-9]+)_(?P<snr>-?\d+)dB_(?P<clip>[A-Za-z0-9-]+)\.wav$")

METRIC_KEYS = ("snrDb", "stoi", "pesq")


def wav_info(path: Path) -> dict[str, float | int] | None:
    """Sample rate and length, when the file is plain PCM. None otherwise."""
    with contextlib.suppress(Exception):
        with wave.open(str(path), "rb") as handle:
            rate = handle.getframerate()
            frames = handle.getnframes()
            if rate > 0:
                return {"sampleRate": rate, "seconds": round(frames / rate, 3)}
    return None


def scan(directory: Path) -> dict[str, Path]:
    """Maps `<noise>_<snr>dB_<clip>` to its file, warning about names that do not parse."""
    found: dict[str, Path] = {}
    if not directory.is_dir():
        return found
    for path in sorted(directory.glob("*.wav")):
        if NAME_RE.match(path.name) is None:
            print(f"  ! skipped {directory.name}/{path.name}: expected <noise>_<snr>dB_<clip>.wav")
            continue
        found[path.stem] = path
    return found


def load_existing() -> dict[str, dict]:
    if not MANIFEST.is_file():
        return {}
    with contextlib.suppress(Exception):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        return {item["id"]: item for item in data.get("items", []) if isinstance(item, dict) and "id" in item}
    print("  ! manifest.json could not be parsed; nothing was carried over")
    return {}


def carry_over(item: dict, previous: dict | None, kept: list[str]) -> dict:
    """Restores hand-filled metrics and status from the previous manifest."""
    if not previous:
        return item
    for lane in ("noisy", "enhanced"):
        old = previous.get(lane) or {}
        for key in METRIC_KEYS:
            value = old.get(key)
            if value is not None:
                item[lane][key] = value
                kept.append(f"{item['id']}.{lane}.{key}={value}")
    if previous.get("status"):
        item["status"] = previous["status"]
        kept.append(f"{item['id']}.status={previous['status']}")
    return item


def build(reset: bool) -> tuple[dict, list[str]]:
    noisy = scan(DEMO / NOISY_DIR)
    clean = scan(DEMO / CLEAN_DIR)
    stages = scan_stages(DEMO / STAGES_DIR)
    existing = {} if reset else load_existing()

    kept: list[str] = []
    items: list[dict] = []

    for stem in sorted(noisy):
        match = NAME_RE.match(noisy[stem].name)
        assert match is not None  # scan() already filtered these
        if stem not in clean:
            print(f"  ! {NOISY_DIR}/{stem}.wav has no {CLEAN_DIR}/{stem}.wav - skipped")
            continue

        item = {
            "id": stem,
            "noise": match["noise"],
            "inputSnrDb": int(match["snr"]),
            "clip": match["clip"],
            "noisy": {"file": f"{NOISY_DIR}/{stem}.wav", "snrDb": None, "stoi": None, "pesq": None},
            "enhanced": {"file": f"{CLEAN_DIR}/{stem}.wav", "snrDb": None, "stoi": None, "pesq": None},
            "stages": {stage: stages.get((stem, stage)) for stage in STAGES},
            "status": None,
        }
        info = wav_info(noisy[stem])
        if info:
            item["audio"] = info
        items.append(carry_over(item, existing.get(stem), kept))

    for stem in sorted(set(clean) - set(noisy)):
        print(f"  ! {CLEAN_DIR}/{stem}.wav has no {NOISY_DIR}/{stem}.wav - skipped")

    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "snrLevels": sorted({item["inputSnrDb"] for item in items}) or [-5, 0, 5, 10],
        "noiseTypes": sorted({item["noise"] for item in items}) or ["gunshot", "rotor", "engine", "siren", "wind"],
        "items": items,
    }
    return manifest, kept


def scan_stages(directory: Path) -> dict[tuple[str, str], str]:
    """Maps (clip stem, stage) to the manifest-relative path of that tap."""
    found: dict[tuple[str, str], str] = {}
    if not directory.is_dir():
        return found
    for path in sorted(directory.glob("*.wav")):
        for stage in STAGES:
            suffix = f"_{stage}"
            if path.stem.endswith(suffix):
                found[(path.stem[: -len(suffix)], stage)] = f"{STAGES_DIR}/{path.name}"
                break
        else:
            print(f"  ! skipped {STAGES_DIR}/{path.name}: expected a _{'/_'.join(STAGES)} suffix")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="Build public/demo/manifest.json from the WAVs in public/demo.")
    parser.add_argument("--reset", action="store_true", help="discard metrics already in manifest.json")
    parser.add_argument("--check", action="store_true", help="report what would change and write nothing")
    args = parser.parse_args()

    DEMO.mkdir(parents=True, exist_ok=True)
    for name in (NOISY_DIR, CLEAN_DIR, STAGES_DIR):
        (DEMO / name).mkdir(exist_ok=True)

    if args.reset and MANIFEST.is_file():
        print("  ! --reset: every metric and status already in manifest.json will be dropped")

    manifest, kept = build(reset=args.reset)

    for line in kept:
        print(f"  kept {line}")

    blank = sum(
        1
        for item in manifest["items"]
        for lane in ("noisy", "enhanced")
        for key in METRIC_KEYS
        if item[lane][key] is None
    )
    print(f"  {len(manifest['items'])} clip(s), {len(kept)} value(s) carried over, {blank} metric field(s) still null")

    if args.check:
        print("  --check: manifest.json was not written")
        return 0

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {MANIFEST.relative_to(ROOT).as_posix()}")
    if blank:
        print("  fill the null metrics from your evaluation output; the page shows an em dash for each one")
    return 0


if __name__ == "__main__":
    sys.exit(main())
