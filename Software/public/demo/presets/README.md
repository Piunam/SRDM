# Demo preset files

The Demo page has seven fixed SNR endpoints: `-15`, `-10`, `-5`, `0`, `5`,
`10`, and `15` dB.

The simplest file layout is eight WAV files in this directory:

```text
-15.wav
-10.wav
-5.wav
0.wav
5.wav
10.wav
15.wav
clean.wav
```

Each numbered file is the noisy input for that button. `clean.wav` is the
shared output/reference. If every level has its own processed output, use this
paired layout instead:

```text
-15/input.wav
-15/output.wav
-10/input.wav
-10/output.wav
...
15/input.wav
15/output.wav
```

The API checks the paired layout first. No code change is required after the
files are added.

Optional metrics live in `metrics.json`:

```json
{
  "levels": {
    "-15": {
      "status": "MEASURED",
      "input": { "snrDb": -15, "stoi": 0.42, "pesq": 1.35 },
      "output": { "snrDb": 8.2, "stoi": 0.81, "pesq": 2.48 }
    }
  }
}
```
