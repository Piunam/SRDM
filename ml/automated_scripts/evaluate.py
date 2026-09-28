#!/usr/bin/env python3
"""
evaluate_v2.py - Drop-in replacement for evaluate.py.

Computes:
  - reference-based output SNR
  - STOI at 16 kHz
  - wideband PESQ at 16 kHz
  - residual-error attenuation relative to the noisy input

Command-line interface intentionally matches evaluate.py so that the
existing run_pipeline.sh does not need to change.
"""

import argparse
import math
import csv
import os

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, correlate, correlation_lags


PESQ_SR = 16000
PESQ_MAX_SECONDS = 20
ALIGN_MAX_DELAY_SECONDS = 0.1


def load_audio(path):
    audio, sr = sf.read(path)

    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    return audio.astype(np.float64), int(sr)


def resample(audio, sr, target_sr):
    if sr == target_sr:
        return audio

    gcd = math.gcd(int(sr), int(target_sr))
    up = target_sr // gcd
    down = sr // gcd

    return resample_poly(audio, up, down)


def align(reference, signal, sr,
          max_delay_seconds=ALIGN_MAX_DELAY_SECONDS):
    """
    Align signal to reference using normalized cross-correlation.

    Positive lag:
        signal has extra leading delay and is shifted forward.

    Negative lag:
        signal starts before reference.
    """
    max_lag = int(max_delay_seconds * sr)

    # Use a common-length region only for finding the delay.
    n = min(len(reference), len(signal))
    ref0 = reference[:n].copy()
    sig0 = signal[:n].copy()

    # Remove DC before correlation.
    ref0 -= np.mean(ref0)
    sig0 -= np.mean(sig0)

    correlation = correlate(
        sig0,
        ref0,
        mode="full",
        method="fft"
    )
    lags = correlation_lags(
        len(sig0),
        len(ref0),
        mode="full"
    )

    mask = np.abs(lags) <= max_lag
    correlation = correlation[mask]
    lags = lags[mask]

    # scipy.signal.correlate() already performs the expensive correlation
    # efficiently (FFT method). Do NOT loop over every lag and recompute
    # np.sum() on the full audio arrays: that turns alignment into an
    # O(N * max_lag) operation and can take minutes on long recordings.
    #
    # For delay estimation, the raw cross-correlation peak is sufficient.
    # We calculate a normalized correlation coefficient only once at the
    # selected lag for reporting.
    best_idx = int(np.argmax(correlation))
    lag = int(lags[best_idx])

    if lag > 0:
        a = sig0[lag:]
        b = ref0[:len(a)]
    elif lag < 0:
        b = ref0[-lag:]
        a = sig0[:len(b)]
    else:
        a = sig0
        b = ref0

    denom = np.sqrt(
        np.sum(a * a) * np.sum(b * b)
    ) + 1e-20

    best_score = float(np.sum(a * b) / denom)

    if lag > 0:
        signal = signal[lag:]
        reference = reference[:len(signal)]
    elif lag < 0:
        reference = reference[-lag:]
        signal = signal[:len(reference)]

    length = min(len(reference), len(signal))

    return (
        reference[:length],
        signal[:length],
        lag,
        float(best_score)
    )


def calculate_snr(reference, test):
    error = reference - test

    signal_power = np.mean(reference ** 2)
    error_power = np.mean(error ** 2)

    return float(
        10 * np.log10(
            signal_power / (error_power + 1e-12)
        )
    )


def calculate_stoi(reference, test, sr):
    """
    pystoi resamples internally to its own fixed 10 kHz analysis rate
    regardless of what sample rate it's given, so pre-resampling to 16 kHz
    here only adds a redundant resample step (sr -> 16k -> pystoi's 10k
    instead of a single sr -> 10k) with no benefit. Pass the native-rate
    audio straight through, as the original evaluate.py did.
    """
    from pystoi import stoi

    n = min(len(reference), len(test))

    return float(
        stoi(
            reference[:n],
            test[:n],
            sr,
            extended=False
        )
    )


def calculate_pesq(reference, test, sr):
    """
    Wideband PESQ at 16 kHz.

    Matches the original evaluator's 20-second maximum.
    """
    from pesq import pesq

    reference_16k = resample(reference, sr, PESQ_SR)
    test_16k = resample(test, sr, PESQ_SR)

    max_samples = PESQ_SR * PESQ_MAX_SECONDS
    n = min(
        len(reference_16k),
        len(test_16k),
        max_samples
    )

    if n < PESQ_SR:
        raise ValueError(
            "PESQ evaluation requires at least 1 second of audio."
        )

    return float(
        pesq(
            PESQ_SR,
            reference_16k[:n].astype(np.float32),
            test_16k[:n].astype(np.float32),
            "wb"
        )
    )


def calculate_noise_attenuation(clean, noisy, denoised):
    """
    Reference-based residual-error attenuation.

    Input residual  = noisy - clean
    Output residual = denoised - clean

    Positive result means the denoised output has less residual error
    than the noisy input.

    This is NOT a pure noise-only metric because speech distortion is
    included in the residual.
    """
    n = min(
        len(clean),
        len(noisy),
        len(denoised)
    )

    clean = clean[:n]
    noisy = noisy[:n]
    denoised = denoised[:n]

    input_residual = noisy - clean
    output_residual = denoised - clean

    input_power = np.mean(input_residual ** 2)
    output_power = np.mean(output_residual ** 2)

    return float(
        10 * np.log10(
            (input_power + 1e-12) /
            (output_power + 1e-12)
        )
    )


def evaluate_pair(clean, sr, other, sr_other, label):
    """
    Align + score one output against clean reference.
    """
    if sr != sr_other:
        print(
            f"  note: {label} is {sr_other} Hz, "
            f"clean reference is {sr} Hz -> "
            f"resampling {label} to match"
        )
        other = resample(other, sr_other, sr)
        sr_other = sr

    ref_aligned, sig_aligned, lag, corr = align(
        clean.copy(),
        other.copy(),
        sr
    )

    snr_score = calculate_snr(
        ref_aligned,
        sig_aligned
    )

    stoi_score = calculate_stoi(
        ref_aligned,
        sig_aligned,
        sr
    )

    pesq_score = calculate_pesq(
        ref_aligned,
        sig_aligned,
        sr
    )

    return {
        "label": label,
        "delay": lag,
        "alignment_corr": corr,
        "snr": snr_score,
        "stoi": stoi_score,
        "pesq": pesq_score
    }


def format_row(r):
    return (
        f"{r['label']:>10s} | "
        f"delay={r['delay']:+6d} smp | "
        f"corr={r['alignment_corr']:.5f} | "
        f"SNR={r['snr']:7.2f} dB | "
        f"STOI={r['stoi']:.4f} | "
        f"PESQ={r['pesq']:.3f}"
    )


def parse_denoised_args(items):
    """
    Parse 'label:path' or bare 'path' entries.

    Preserves the original evaluate.py interface.
    """
    parsed = []

    for item in items:
        if ":" in item and not item[1:3] == ":\\":
            label, path = item.split(":", 1)
        else:
            label, path = item, item

        parsed.append((label, path))

    return parsed


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # EXACT SAME CLI as evaluate.py
    parser.add_argument(
        "--clean",
        required=True,
        help="Path to clean_reference.wav"
    )

    parser.add_argument(
        "--noisy",
        required=True,
        help="Path to noisy_test.wav"
    )

    parser.add_argument(
        "--denoised",
        nargs="+",
        required=True,
        help=(
            "One or more label:path pairs, "
            "e.g. 96:output96.wav 128:output128.wav"
        )
    )

    parser.add_argument(
        "--out",
        default=None,
        help="Optional path to write results text file"
    )

    parser.add_argument(
        "--csv-append",
        default=None,
        help="Optional CSV file to append summary rows to"
    )

    parser.add_argument(
        "--csv-snr",
        type=float,
        default=None,
        help="SNR value (dB) to record in CSV rows"
    )

    args = parser.parse_args()

    clean, sr = load_audio(args.clean)
    noisy, sr_noisy = load_audio(args.noisy)

    # ------------------------------------------------------------
    # INPUT BASELINE
    #
    # mix.py creates clean and noisy from the exact same clean
    # sample sequence, so the INPUT must NOT be independently
    # delay-optimized.
    # ------------------------------------------------------------
    if sr_noisy != sr:
        print(
            f"  note: INPUT is {sr_noisy} Hz, "
            f"clean reference is {sr} Hz -> "
            f"resampling INPUT to match"
        )
        noisy = resample(noisy, sr_noisy, sr)

    n = min(len(clean), len(noisy))

    clean_input = clean[:n]
    noisy_input = noisy[:n]

    input_result = {
        "label": "INPUT",
        "delay": 0,
        "alignment_corr": 1.0,
        "snr": calculate_snr(
            clean_input,
            noisy_input
        ),
        "stoi": calculate_stoi(
            clean_input,
            noisy_input,
            sr
        ),
        "pesq": calculate_pesq(
            clean_input,
            noisy_input,
            sr
        )
    }

    lines = []

    lines.append(
        "========== EVALUATION RESULTS V2 =========="
    )
    lines.append(f"Clean:  {args.clean}")
    lines.append(f"Noisy:  {args.noisy}")
    lines.append(
        f"PESQ metric sample rate: {PESQ_SR} Hz (STOI runs at native rate)"
    )
    lines.append(
        f"Maximum output alignment: "
        f"+/- {ALIGN_MAX_DELAY_SECONDS * 1000:.0f} ms"
    )
    lines.append("")

    lines.append(
        "INPUT BASELINE"
    )
    lines.append(
        format_row(input_result)
    )
    lines.append("")

    results = [input_result]

    # ------------------------------------------------------------
    # DENOISED OUTPUTS
    # ------------------------------------------------------------
    for label, path in parse_denoised_args(
        args.denoised
    ):
        denoised, sr_denoised = load_audio(path)

        result = evaluate_pair(
            clean,
            sr,
            denoised,
            sr_denoised,
            label.upper()
        )

        # Calculate residual-error attenuation on the SAME interval
        # selected by the denoised output's alignment.
        ref_aligned, denoised_aligned, lag, corr = align(
            clean.copy(),
            denoised.copy()
            if sr_denoised == sr
            else resample(
                denoised,
                sr_denoised,
                sr
            ),
            sr
        )

        # Window the noisy input to the SAME real-time span as ref_aligned.
        #
        # `lag` is the delay of denoised relative to clean (denoised[lag:] ~
        # clean[0:], or clean[-lag:] ~ denoised[0:] when lag<0) -- it is NOT
        # a delay between noisy and clean. mix.py builds noisy = clean +
        # scaled_noise sample-for-sample, so noisy has zero true delay
        # relative to clean. ref_aligned starts at clean index max(-lag, 0),
        # so noisy must be windowed from that same start index, not shifted
        # by `lag` itself (shifting noisy by `lag` compares clean[i] against
        # noisy[i+lag] -- i.e. a different real-time sample -- which inflates
        # or deflates the input residual power by an amount that depends on
        # signal content and delay, corrupting noise_attenuation whenever
        # lag != 0).
        start = max(-lag, 0)
        noisy_aligned = noisy[start:start + len(denoised_aligned)]

        n = min(
            len(ref_aligned),
            len(denoised_aligned),
            len(noisy_aligned)
        )

        result["noise_attenuation"] = (
            calculate_noise_attenuation(
                ref_aligned[:n],
                noisy_aligned[:n],
                denoised_aligned[:n]
            )
        )

        result["dSNR"] = (
            result["snr"] -
            input_result["snr"]
        )

        result["dSTOI"] = (
            result["stoi"] -
            input_result["stoi"]
        )

        result["dPESQ"] = (
            result["pesq"] -
            input_result["pesq"]
        )

        results.append(result)

        lines.append(path)
        lines.append(format_row(result))

        lines.append(
            f"{'':>10s}   "
            f"dSNR={result['dSNR']:+.2f} dB  "
            f"dSTOI={result['dSTOI']:+.4f}  "
            f"dPESQ={result['dPESQ']:+.3f}  "
            f"residual_atten="
            f"{result['noise_attenuation']:+.2f} dB"
        )

        lines.append("")

    output_text = "\n".join(lines)

    print(output_text)

    # ------------------------------------------------------------
    # TEXT OUTPUT
    # ------------------------------------------------------------
    if args.out:
        with open(
            args.out,
            "w",
            encoding="utf-8"
        ) as f:
            f.write(output_text + "\n")

        print(
            f"Results written to {args.out}"
        )

    # ------------------------------------------------------------
    # CSV OUTPUT
    #
    # Preserve the original columns and append additional fields.
    # Existing downstream tools expecting the first six columns
    # therefore remain compatible.
    # ------------------------------------------------------------
    if args.csv_append:
        write_header = not os.path.exists(
            args.csv_append
        )

        with open(
            args.csv_append,
            "a",
            newline="",
            encoding="utf-8"
        ) as f:
            writer = csv.writer(f)

            if write_header:
                writer.writerow([
                    "mix_snr_db",
                    "model",
                    "delay_samples",
                    "snr_db",
                    "stoi",
                    "pesq",
                    "alignment_corr",
                    "residual_attenuation_db"
                ])

            for r in results:
                if r["label"] == "INPUT":
                    residual_attenuation = 0.0
                else:
                    residual_attenuation = (
                        r["noise_attenuation"]
                    )

                writer.writerow([
                    args.csv_snr,
                    r["label"],
                    r["delay"],
                    f"{r['snr']:.3f}",
                    f"{r['stoi']:.4f}",
                    f"{r['pesq']:.3f}",
                    f"{r['alignment_corr']:.6f}",
                    f"{residual_attenuation:.3f}"
                ])

        print(
            f"Appended {len(results)} row(s) "
            f"to {args.csv_append}"
        )


if __name__ == "__main__":
    main()
