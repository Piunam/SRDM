export const DEMO_SNR_LEVELS = [-15, -10, -5, 0, 5, 10, 15] as const;

export type DemoSnr = (typeof DEMO_SNR_LEVELS)[number];

export type PresetAudioResponse = {
  snrDb: DemoSnr;
  simulated: boolean;
  input: { url?: string; voiceUrl?: string; noiseUrl?: string; name: string };
  output: { url: string; name: string };
};

export type PresetMetricSet = {
  file: string;
  snrDb: number | null;
  stoi: number | null;
  pesq: number | null;
};

export type PresetMetricsResponse = {
  simulated: boolean;
  status: "MEASURED" | "SIMULATED" | "TARGET" | "PLANNED" | null;
  sampleRate: number | null;
  durationSeconds: number | null;
  input: PresetMetricSet;
  output: PresetMetricSet;
};

export function isDemoSnr(value: number): value is DemoSnr {
  return (DEMO_SNR_LEVELS as readonly number[]).includes(value);
}
