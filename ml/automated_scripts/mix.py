#!/usr/bin/env python3
"""
mix.py - Generate a clean/noisy speech pair at a target SNR.

This is a parametrized version of the original mix.py: instead of hardcoded
filenames and a hardcoded SNR, everything is passed on the command line so
it can be driven by run_pipeline.sh across many SNR values.

Usage:
    python3 mix.py --clean audio_en.wav --noise yt1.wav --snr 10 --outdir ./out

Writes <outdir>/clean_reference.wav and <outdir>/noisy_test.wav (names are
overridable via --clean-out / --noisy-out).
"""
import argparse
import math
import os

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--clean", required=True, help="Path to clean speech wav")
    p.add_argument("--noise", required=True, help="Path to noise wav")
    p.add_argument("--snr", type=float, required=True, help="Target SNR in dB")
    p.add_argument("--outdir", required=True, help="Directory to write outputs into")
    p.add_argument("--seed", type=int, default=42, help="Random seed for noise crop position")
    p.add_argument("--clean-out", default="clean_reference.wav", help="Output filename for the clean reference")
    p.add_argument("--noisy-out", default="noisy_test.wav", help="Output filename for the noisy mix")
    p.add_argument(
        "--target-sr",
        type=int,
        default=48000,
        help="Sample rate both clean and noise are resampled to (default 48000, RNNoise's native rate). "
             "Keeping this fixed regardless of the input files' native rates is what keeps clean_reference.wav "
             "consistent with the 48kHz PCM that ffmpeg/rnnoise_demo produce downstream.",
    )
    return p.parse_args()


def resample_to(audio, sr, target_sr):
    if sr == target_sr:
        return audio
    gcd = math.gcd(sr, target_sr)
    up = target_sr // gcd
    down = sr // gcd
    return resample_poly(audio, up, down)


def main():
    args = parse_args()
    os.makedirs(args.outdir, exist_ok=True)
    rng = np.random.default_rng(args.seed)
    target_sr = args.target_sr

    # Load
    clean, sr = sf.read(args.clean)
    noise, sr_noise = sf.read(args.noise)

    # Convert stereo to mono
    if clean.ndim > 1:
        clean = np.mean(clean, axis=1)
    if noise.ndim > 1:
        noise = np.mean(noise, axis=1)

    # Resample both clean and noise to the target rate (not to each other's
    # native rate) so the output is always at a known, fixed sample rate
    # regardless of what the source files happen to be.
    if sr != target_sr:
        print(f"Resampling clean audio: {sr} Hz -> {target_sr} Hz")
        clean = resample_to(clean, sr, target_sr)
        sr = target_sr

    if sr_noise != target_sr:
        print(f"Resampling noise audio: {sr_noise} Hz -> {target_sr} Hz")
        noise = resample_to(noise, sr_noise, target_sr)
        sr_noise = target_sr

    print(f"Sample rate: {sr} Hz")

    # Make noise long enough
    if len(noise) < len(clean):
        repeats = int(np.ceil(len(clean) / len(noise)))
        noise = np.tile(noise, repeats)

    # Random crop (seeded, so each SNR run in the sweep uses the same noise segment)
    start = rng.integers(0, len(noise) - len(clean) + 1)
    noise = noise[start:start + len(clean)]

    # RMS
    speech_rms = np.sqrt(np.mean(clean ** 2))
    noise_rms = np.sqrt(np.mean(noise ** 2))

    # Scale noise for target SNR
    desired_noise_rms = speech_rms / (10 ** (args.snr / 20))
    noise_scaled = noise * desired_noise_rms / (noise_rms + 1e-10)

    # Mix
    noisy = clean + noise_scaled

    # Normalize both identically
    peak = max(np.max(np.abs(noisy)), 1.0)
    clean_out = clean / peak
    noisy_out = noisy / peak

    # Save
    clean_path = os.path.join(args.outdir, args.clean_out)
    noisy_path = os.path.join(args.outdir, args.noisy_out)
    sf.write(clean_path, clean_out, sr)
    sf.write(noisy_path, noisy_out, sr)

    print(f"Created {noisy_path}")
    print(f"Target SNR: {args.snr} dB")


if __name__ == "__main__":
    main()
