# Live dummy audio

The Live page waits three seconds after **Connect device**, then requests
`/api/live/audio`.

To use one WAV for both black input/output lanes, add:

```text
public/live/audio.wav
```

To use a different file for each lane, add both:

```text
public/live/input.wav
public/live/output.wav
```

The paired files take priority over `audio.wav`. Until either layout exists,
the endpoint uses the built-in voice clip.

Optional dummy metrics can be overridden with `public/live/metrics.json`:

```json
{
  "input": { "snrDb": -5, "stoi": 0.58, "pesq": 1.6 },
  "output": { "snrDb": 14.2, "stoi": 0.89, "pesq": 2.6 }
}
```
