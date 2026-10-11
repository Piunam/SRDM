# Aeroshield

Prototype site for **Aeroshield**: real-time speech enhancement on a microcontroller.
A DSP prefilter (beamforming and NLMS) removes the noise a reference microphone can
predict. When the SNR drops below +5 dB, or the noise is impulsive, a small RNNoise-style
network sets a gain per frequency band every 10 ms. A post-filter then keeps the voice
stable at the output.

The site is a demo build. Figures are tagged `TARGET`, `SIMULATED`, or `MEASURED`.

## Home (`/`)

The landing page. A scroll-driven hero walks through the problem and the chain:
capture (primary mic at the mouth, reference on the device), DSP prefilter, SNR gate,
RNNoise, and post-filter. Optional sound plays the same noise classes the rest of the
site uses: gunshot, rotor, engine, siren, and wind.

Below the hero: headline metrics (SNR, STOI, PESQ, latency), why classical filters
fail here, a diagram of the pipeline, a rotatable 3D model of the printed enclosure,
and a short build strip (hardware, DSP, network). Closing links go to Demo and System.

Use this page to understand the product in a few minutes without opening the docs.

## System (`/system`)

Technical documentation. Read it top to bottom in about six minutes, or jump from
the sidebar. Sections cover overview, signal chain, hardware, DSP prefilter, RNNoise,
post-filter, dataset pipeline, training, mission, and roadmap.

This is the record of what each part does, why it was chosen, and what still runs
only as a target. Quoted numbers belong here so the homepage and the docs stay aligned.

## Demo (`/demo`)

Before and after on the same clip. Choose one of seven input SNR levels
(−15, −10, −5, 0, +5, +10, +15 dB) and compare the noisy recording with the
processed output — waveforms, spectra, and playback.

The page does not compute SNR, STOI, or PESQ in the browser. Those numbers come
from an offline evaluation.

## Live (`/live`)

A locked session for showing the hardware, not for public browsing. After unlock,
connect the demonstration device in Chrome or Edge (Web Serial) to see live
input/output audio, SNR, stage (DSP only vs DSP + RNNoise), and related telemetry.
