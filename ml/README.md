# ML — Training, Quantization & Evaluation

Machine learning pipeline for AeroShield's noise suppression model, built on RNNoise and adapted for defence-noise conditions and embedded MCU deployment.

## 1. Dataset Generation

Mixes clean speech with background (stationary: engine, rotor, wind) and foreground (impulsive: gunfire, artillery) noise at uniformly randomized SNR (−20 dB to +20 dB), producing `.f32` feature files for training.

```bash
./src/dump_features.c <speech.PCM> <background.PCM> <foreground.PCM>  <num_sequences>
```

Inputs: raw 16-bit PCM, mono, 48kHz, concatenated per category.

## 2. Training

```bash
python Torch/train_rnnoise.py <features.f32> <output_dir> \
  --gru-size 128 --cond-size 128 --epochs 50 --lr 5e-4
```

| Argument     | Default | Notes                                           |
| ------------ | ------- | ----------------------------------------------- |
| `--gru-size` | 128     | Reduced from reference (384) for MCU deployment |
| `--epochs`   | 50      |                                                 |
| `--gamma`    | 0.25    | Perceptual loss exponent                        |

## 3. Quantization

```bash
python Torch/dump_rnnoise_weights.py --checkpoint <model.pt> --output <weights.h>
```

QAT-based int8 quantization; outputs a C header for embedded deployment.

## 4. Evaluation

```bash
python automated_scripts/evaluate.py --model <checkpoint> --test-set <path> --snr-range -15,-10,-5,0,5,10,15
```

Computes SNR, STOI, and PESQ across a fixed SNR sweep using a reproducible test segment.
