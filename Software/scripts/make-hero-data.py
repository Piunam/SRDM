"""Generate the hero scene's signal data from WAV clips.

Drop real clips into scripts/hero-audio/ named voice.wav, gunshot.wav,
rotor.wav, engine.wav, siren.wav and wind.wav. Any clip that is missing is
synthesised (and written there) so the site always has plausible data.

Outputs:
  public/hero/<name>.json   256-point RMS envelope + 64-band spectrum
  public/hero/audio/<name>.wav   16 kHz mono loop used by the optional sound toggle

Usage:  python scripts/make-hero-data.py
Needs:  numpy, soundfile
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "hero-audio"
OUT = ROOT / "public" / "hero"
AUDIO_OUT = OUT / "audio"

SR = 16_000
DUR = 3.5
ENV_POINTS = 256
BANDS = 64
NAMES = ["voice", "gunshot", "rotor", "engine", "siren", "wind"]

rng = np.random.default_rng(7)
t = np.arange(int(SR * DUR)) / SR


# ---------- synthetic stand-ins ----------

def synth_voice() -> np.ndarray:
    """Glottal pulse train through formant resonators, gated into syllables."""
    f0 = 120 + 18 * np.sin(2 * np.pi * 0.7 * t) + 10 * np.sin(2 * np.pi * 2.3 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    src = sum((1 / k) * np.sin(k * phase) for k in range(1, 30))
    vowels = [(730, 1090, 2440), (270, 2290, 3010), (530, 1840, 2480), (570, 840, 2410)]
    spec = np.fft.rfft(src)
    freqs = np.fft.rfftfreq(len(src), 1 / SR)
    out = np.zeros_like(src)
    syl = np.array([0.15, 0.55, 0.95, 1.45, 1.85, 2.4, 2.8, 3.15])
    for i, s in enumerate(syl):
        f1, f2, f3 = vowels[i % len(vowels)]
        shape = sum(np.exp(-0.5 * ((freqs - f) / bw) ** 2) for f, bw in ((f1, 90), (f2, 120), (f3, 160)))
        voiced = np.fft.irfft(spec * shape, n=len(src))
        gate = np.exp(-0.5 * ((t - s) / 0.09) ** 2)
        out += voiced * gate
    return out


def synth_gunshot() -> np.ndarray:
    out = np.zeros_like(t)
    for s in (0.3, 1.4, 2.5):
        idx = t >= s
        tt = t[idx] - s
        out[idx] += rng.standard_normal(idx.sum()) * np.exp(-tt / 0.035) * 3
        out[idx] += np.sin(2 * np.pi * 90 * tt) * np.exp(-tt / 0.12)
    return out


def synth_rotor() -> np.ndarray:
    low = np.convolve(rng.standard_normal(len(t)), np.ones(40) / 40, mode="same")
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 16 * t) ** 2
    return low * am * 6


def synth_engine() -> np.ndarray:
    f = 42 + 2 * np.sin(2 * np.pi * 0.3 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum((1 / k**0.7) * np.sin(k * ph + rng.uniform(0, 6)) for k in range(1, 4)) + 0.2 * np.sin(ph * 2.85)


def synth_siren() -> np.ndarray:
    f = 1000 + 400 * np.sin(2 * np.pi * 0.5 * t)
    return 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR)


def synth_wind() -> np.ndarray:
    white = np.fft.rfft(rng.standard_normal(len(t)))
    freqs = np.fft.rfftfreq(len(t), 1 / SR)
    pink = np.fft.irfft(white / np.sqrt(np.maximum(freqs, 1)), n=len(t))
    gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t)
    return pink * gust


SYNTH = {
    "voice": synth_voice,
    "gunshot": synth_gunshot,
    "rotor": synth_rotor,
    "engine": synth_engine,
    "siren": synth_siren,
    "wind": synth_wind,
}


# ---------- analysis ----------

def load(name: str) -> np.ndarray:
    path = SRC / f"{name}.wav"
    if not path.exists():
        x = SYNTH[name]()
        x = 0.8 * x / (np.max(np.abs(x)) + 1e-9)
        sf.write(path, x.astype(np.float32), SR)
        print(f"  synthesised {path.name}")
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        # Linear resample is enough for envelope and band-energy data.
        n = int(len(x) * SR / sr)
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    return x / (np.max(np.abs(x)) + 1e-9)


def envelope(x: np.ndarray) -> list[float]:
    hop = len(x) // ENV_POINTS
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(ENV_POINTS)])
    rms /= rms.max() + 1e-9
    return [round(float(v), 4) for v in rms]


def spectrum(x: np.ndarray) -> list[float]:
    win = 512
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::256] * np.hanning(win)
    mag = np.abs(np.fft.rfft(frames, axis=1)).mean(axis=0)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    edges = np.geomspace(60, SR / 2, BANDS + 1)
    bands = np.array([
        mag[(freqs >= lo) & (freqs < hi)].mean() if np.any((freqs >= lo) & (freqs < hi)) else 0.0
        for lo, hi in zip(edges[:-1], edges[1:])
    ])
    # Fill empty low bins from their neighbour, then compress to a display range.
    for i in range(1, BANDS):
        if bands[i] == 0:
            bands[i] = bands[i - 1]
    db = 20 * np.log10(bands + 1e-9)
    db = np.clip((db - (db.max() - 50)) / 50, 0, 1)
    return [round(float(v), 4) for v in db]


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    AUDIO_OUT.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        x = load(name)
        data = {"name": name, "sampleRate": SR, "seconds": round(len(x) / SR, 3),
                "envelope": envelope(x), "spectrum": spectrum(x)}
        (OUT / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
        sf.write(AUDIO_OUT / f"{name}.wav", (0.9 * x).astype(np.float32), SR, subtype="PCM_16")
        print(f"  wrote {name}.json")


if __name__ == "__main__":
    main()
