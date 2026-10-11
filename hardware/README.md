# RNNoise Real-Time Audio Denoiser — NXP MCX N236 Port

**Contributor:** Agamya Sharma  
**Platform:** NXP MCX N236 (Arm Cortex-M33)  
**Original Project:** [RNNoise by Xiph.Org / Mozilla](https://github.com/xiph/rnnoise)

## Overview

This project ports **RNNoise**, a lightweight recurrent neural network (RNN)-based noise suppression system, to the **NXP MCX N236 microcontroller**.

Audio is captured through I²S using SAI and EDMA, processed on-device using the RNNoise neural network, and streamed back out for downstream transmission over a radio link.

The pipeline processes standard **480-sample frames (10 ms at 48 kHz)**, integrating feature extraction, pitch analysis, neural network inference, and real-time audio I/O.

The primary focus of this port is to enable real-time embedded audio denoising while optimizing memory usage, computational efficiency, and DMA-driven audio processing.

## Architecture

The system consists of three main components:

### 1. Audio I/O

- SAI and EDMA for audio capture and transmission.
- Four-deep circular RX/TX buffering.
- 16-bit stereo audio frames.
- Concurrent DMA transfers and neural network inference.

### 2. Feature Extraction

- FFT-based spectral feature extraction using a KISS-FFT-derived implementation.
- Pitch analysis based on the Opus/CELT `pitch.c` implementation.
- Upstream feature extraction routines reused with minimal modifications.

### 3. Neural Network

The RNNoise inference pipeline follows the layer structure implemented in `rnn.c`:

`conv1 → conv2 → GRU1 → GRU2 → GRU3 → dense_out + vad_dense`

- **Quantized layers:** GRU and `conv2` use int8-quantized weights.
- **Floating-point layers:** `conv1`, `dense_out`, and `vad_dense` use floating-point weights.
- **Output:** Predicted gains for noise suppression and voice activity detection (VAD).

## Optimizations and Modifications

### 1. Optimized Floating-Point GEMV (`vec.h`)

The original `sgemv` implementation accessed weight memory using a column-major, strided pattern for each output row, resulting in inefficient memory access.

**Changes:**

- Reordered the loops through loop inversion.
- Improved contiguous memory access patterns.
- Targeted better cache and prefetch efficiency in floating-point layers.

These changes primarily affect `conv1`, `dense_out`, and `vad_dense`.

### 2. Arm DSP Acceleration for Int8 GRU GEMV

The original `cgemv8x4` implementation relied on scalar multiply-accumulate operations despite using int8-quantized weights.

The implementation was rewritten to leverage Arm DSP extension intrinsics:

| Intrinsic  | Purpose                                                     |
| ---------- | ----------------------------------------------------------- |
| `__UXTB16` | Unpacks unsigned biased input bytes into halfword elements. |
| `__SXTB16` | Extracts signed weight bytes into halfword elements.        |
| `__SMLAD`  | Performs dual signed 16-bit multiply-accumulate operations. |

This enables two multiply-accumulate operations per instruction, reducing the scalar instruction overhead in the quantized GRU computation path.

**Verification:** A stale or duplicate `vec.h` file was found to be shadowing the optimized source through the include path. After correcting the include path, the optimized implementation was verified in the debugger.

### 3. GRU Weight Layout Verification

The GRU weight arrays were inspected to verify their memory layout.

For example, `gru1_input_weights_int8` has dimensions of `128 × 384`.

The weights were confirmed to be densely stored rather than block-sparse, ruling out a potential weight-layout mismatch in the quantized inference path.

### 4. Neural Network Initialization (`nnet.c`)

The `init_rnnoise` initialization path was reviewed, and the `linear_init` arguments were corrected for each layer.

- Int8-quantized layers explicitly receive `NULL` for unused floating-point weight pointers.
- Floating-point-only layers explicitly receive `NULL` for unused int8 weight pointers.
- Each layer loads only the weight representation it requires.

This avoids passing irrelevant weight-format pointers during model initialization.

### 5. SRAM Allocation

Initial bring-up encountered failures during model and array initialization because the statically reserved SRAM was insufficient for the model weights and working buffers.

**Resolution:**

- Increased the static SRAM allocation to approximately **100 KB**.
- Enabled the initialization routines to complete successfully.

Further memory optimization remains a planned task.

### 6. Concurrent Audio I/O (`main.c`)

A four-deep circular RX/TX buffering pipeline was implemented using SAI and EDMA.

Key changes include:

- Enabled multiple audio buffers to be queued for reception and transmission.
- Allowed DMA capture and neural network inference to operate concurrently.
- Moved RX buffer re-arming from the main processing loop into the DMA receive callback.
- Queued the next capture buffer immediately after reception completed, rather than waiting for the current frame's inference to finish.

This removes an unnecessary serialization point between audio capture and processing.

## Current Status

**The end-to-end audio denoising pipeline is running on the target microcontroller.**

The current implementation supports:

- Audio capture through SAI/EDMA.
- On-device, frame-by-frame RNNoise inference.
- FFT-based feature extraction and pitch analysis.
- Quantized GRU inference with an Arm DSP-optimized GEMV path.
- Streaming processed audio for downstream transmission.

Further work is focused on improving computational efficiency, reducing memory usage, and increasing available SRAM and flash headroom.

## Planned Next Steps

- [ ] **Memory optimization:** Reduce SRAM and flash usage to create additional headroom.
- [ ] **FFT optimization:** Audit FFT setup and allocation paths for unnecessary overhead.
- [ ] **Pitch-analysis optimization:** Profile and optimize the Opus/CELT-derived pitch-analysis stage.
- [ ] **Static allocation:** Replace scattered dynamic memory allocations (`malloc`) with static allocation wherever practical.
- [ ] **Memory placement:** Place frequently accessed weight tables and performance-critical inner-loop code in ITCM/DTCM, where supported by the target memory configuration.
- [ ] **Output safety:** Add output clamping before float-to-int16 conversion to guard against gain-related clipping artifacts.
- [ ] **Performance profiling:** Measure inference latency, throughput, and memory utilization under sustained audio processing.

## Technologies Used

- **Hardware:** NXP MCX N236
- **Processor:** Arm Cortex-M33
- **Audio interfaces:** SAI, I²S, EDMA
- **Noise suppression:** RNNoise
- **Neural network:** GRU-based recurrent neural network
- **Signal processing:** FFT, pitch analysis, KISS-FFT-derived routines, Opus/CELT
- **Optimization:** Arm DSP intrinsics, int8 quantization, memory-access optimization
- **Languages:** C, embedded C

## Acknowledgements

This project builds on the open-source [RNNoise](https://github.com/xiph/rnnoise) project by Xiph.Org and Mozilla, along with signal-processing routines derived from the Opus/CELT codebase.

The port adapts these components for embedded execution on the NXP MCX N236, with a focus on real-time audio processing and microcontroller-level optimization.

---

_Development and optimization are ongoing. Performance benchmarks and quantitative latency or memory measurements will be added as they become available._
