# AeroShield — Real-Time AI-Driven Active Noise Cancellation

AeroShield is a hybrid AI + DSP noise cancellation system designed for real-time speech enhancement in defence, aerospace, and high-noise industrial environments. It combines classical adaptive filtering (NLMS) with a capacity-optimized RNNoise deep learning model, deployed on low-power embedded hardware (NXP MCX N236, ARM Cortex-M33) — delivering real-time noise suppression at a fraction of the cost of GPU-class edge AI platforms.

---

## Problem Statement

Defence and mission-critical communication systems are severely affected by diverse acoustic disturbances — gunshots, artillery fire, helicopter rotor noise, armored vehicle sound, and emergency sirens. Traditional signal processing techniques assume stationary noise and struggle under highly dynamic, non-linear conditions, often introducing artifacts or speech distortion.

AeroShield addresses this with a hybrid AI/ML-driven noise suppression pipeline combined with adaptive filtering, deployed on cost-effective, low-power embedded hardware, targeting real-time performance suitable for defence, aerospace, and high-noise industrial communication.

---

## Links

- 🌐 **Live Website:** [https://frdm-five.vercel.app/](https://frdm-five.vercel.app/)

---

## System Overview

AeroShield processes incoming audio through three stages:

1. **Signal Conditioning (DSP Pre-Filter)** — dual-microphone (primary + reference) NLMS adaptive filtering removes correlated background noise, followed by DC-blocking and high-pass filtering.
2. **Neural Noise Suppression** — a quantized, capacity-optimized RNNoise model performs real-time spectral gain estimation to suppress complex, non-stationary, and impulsive noise.
3. **Output Refinement (DSP Post-Filter)** — automatic gain control, and soft peak limiting restore harmonic clarity and ensure consistent, distortion-free output.

The system is deployed end-to-end on an NXP MCX N236 (ARM Cortex-M33) microcontroller, with the neural inference path optimized via ARM assembly for single-core, real-time execution.

---

## Repository Structure

```

├── software/     # Website — results explorer, live hardware telemetry, documentation, interactive home page
├── ml/           # Dataset generation, model training, quantization, and evaluation
└── hardware/     # Embedded DSP pre/post-filters, ARM-assembly-optimized RNNoise inference, linker configuration

```

## Hardware Requirements

- NXP MCX N236 (ARM Cortex-M33)
- Primary + reference microphones
- External DAC (audio output)
- Supporting peripherals as detailed in [`hardware/README.md`](./hardware/README.md)

---

## Quick Start

- **Want to see it in action?** → Visit the [live website](https://frdm-five.vercel.app/system)
- **Want to train or evaluate the model yourself?** → See [`ml/README.md`](./ml/README.md)
- **Want to build and flash the hardware?** → See [`hardware/README.md`](./hardware/README.md)
- **Want to run or modify the website?** → See [`software/README.md`](./software/README.md)

## Acknowledgments

- Built on [RNNoise](https://github.com/xiph/rnnoise) by Jean-Marc Valin / Xiph.Org Foundation
- Training data inspired from the [MS-SNSD](https://github.com/microsoft/MS-SNSD) dataset by Microsoft
