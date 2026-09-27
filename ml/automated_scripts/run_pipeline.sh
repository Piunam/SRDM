#!/usr/bin/env bash
# ============================================================
# run_pipeline.sh
#
# Automates the manual RNNoise evaluation loop:
#   mix -> pcm -> denoise (96-unit & 128-unit GRU) -> pcm->wav -> evaluate
# across a sweep of target SNRs, writing output into a per-SNR
# folder that mirrors the existing VID_1 / VID_2 layout, plus a
# combined summary.csv across the whole sweep.
#
# Usage:
#   1. Edit the CONFIG block below to match your paths.
#   2. ./run_pipeline.sh
# ============================================================
set -euo pipefail
 
# ---------------- CONFIG (edit me) ----------------
CLEAN_FILE="audio_en2.wav"                 # clean speech input
NOISE_FILE="war1.wav"                      # noise input
SESSION_NAME="VID_5"                      # output session folder, e.g. VID_1, VID_2, VID_3...
SNR_LIST=(-15 -10 -5 0 5 10 15)           # SNR values (dB) to sweep
SEED=42                                   # noise crop seed (kept fixed across the sweep)
 
RNNOISE_96_BIN="../../rnnoise_96/examples/rnnoise_demo"
RNNOISE_128_BIN="../../rnnoise_128/examples/rnnoise_demo"
 
OUTPUT_ROOT=".."                          # where the SESSION_NAME folder gets created (".." = test_set/)
# ----------------------------------------------------
 
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
 
for bin in "$RNNOISE_96_BIN" "$RNNOISE_128_BIN"; do
  if [[ ! -x "$bin" ]]; then
    echo "ERROR: rnnoise_demo binary not found or not executable: $bin" >&2
    exit 1
  fi
done
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg not found on PATH" >&2
  exit 1
fi
 
OUTPUT_BASE="$OUTPUT_ROOT/$SESSION_NAME"
mkdir -p "$OUTPUT_BASE"
SUMMARY_CSV="$OUTPUT_BASE/summary.csv"
rm -f "$SUMMARY_CSV"
 
echo "Session: $SESSION_NAME"
echo "Clean:   $CLEAN_FILE"
echo "Noise:   $NOISE_FILE"
echo "SNRs:    ${SNR_LIST[*]}"
echo "Output:  $OUTPUT_BASE"
echo
 
for SNR in "${SNR_LIST[@]}"; do
  if (( SNR > 0 )); then
    LABEL="+${SNR}dBSNR"
  else
    LABEL="${SNR}dBSNR"
  fi
 
  OUTDIR="$OUTPUT_BASE/$LABEL"
  mkdir -p "$OUTDIR"
 
  echo "=============================="
  echo " SNR = ${SNR} dB   ->   $OUTDIR"
  echo "=============================="
 
  # 1. Mix clean + noise at this SNR
  python3 mix.py \
    --clean "$CLEAN_FILE" \
    --noise "$NOISE_FILE" \
    --snr "$SNR" \
    --outdir "$OUTDIR" \
    --seed "$SEED"
 
  # 2. Noisy wav -> raw pcm (48kHz mono s16le), what rnnoise_demo expects
  ffmpeg -y -loglevel error \
    -i "$OUTDIR/noisy_test.wav" \
    -ac 1 -ar 48000 -f s16le \
    "$OUTDIR/noisy_output.pcm"
 
  # 3. Denoise with both models (no need to copy binaries around; just pass full paths)
  "$RNNOISE_96_BIN"  "$OUTDIR/noisy_output.pcm" "$OUTDIR/output_cleaned_val96.pcm"
  "$RNNOISE_128_BIN" "$OUTDIR/noisy_output.pcm" "$OUTDIR/output_cleaned_val128.pcm"
 
  # 4. Denoised pcm -> wav for each model
  ffmpeg -y -loglevel error -f s16le -ar 48000 -ac 1 \
    -i "$OUTDIR/output_cleaned_val96.pcm" "$OUTDIR/output96.wav"
  ffmpeg -y -loglevel error -f s16le -ar 48000 -ac 1 \
    -i "$OUTDIR/output_cleaned_val128.pcm" "$OUTDIR/output128.wav"
 
  # 5. Evaluate both models against clean + noisy, log results, append to summary
  python3 evaluate.py \
    --clean "$OUTDIR/clean_reference.wav" \
    --noisy "$OUTDIR/noisy_test.wav" \
    --denoised "96:$OUTDIR/output96.wav" "128:$OUTDIR/output128.wav" \
    --out "$OUTDIR/results.txt" \
    --csv-append "$SUMMARY_CSV" \
    --csv-snr "$SNR"
 
  echo
done
 
echo "Done. Per-SNR folders + results.txt are under $OUTPUT_BASE"
echo "Combined summary: $SUMMARY_CSV"
