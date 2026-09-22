import type { ComponentType } from "react";
import type { Status } from "@/components/ui/StatusTag";
import type { DocsNavGroup } from "@/components/docs/DocsSidebar";

import Overview from "./01-overview.mdx";
import SignalChain from "./02-signal-chain.mdx";
import Hardware from "./03-hardware.mdx";
import DspPrefilter from "./04-dsp-prefilter.mdx";
import RnNoise from "./05-rnnoise.mdx";
import PostFilter from "./06-post-filter.mdx";
import DatasetPipeline from "./07-dataset-pipeline.mdx";
import Training from "./08-training.mdx";
import Mission from "./09-mission.mdx";
import RoadmapSection from "./10-roadmap.mdx";

export const DOC_GROUPS = ["SYSTEM", "BUILD", "PROJECT", "REFERENCE"] as const;
export type DocGroup = (typeof DOC_GROUPS)[number];

export type DocSectionMeta = {
  /** Also the anchor: /system#rnnoise */
  id: string;
  number: string;
  title: string;
  group: DocGroup;
  lede?: string;
  status?: Status;
  Body: ComponentType;
};

/** The page's own copy: title, standfirst and metadata. */
export const DOC = {
  eyebrow: "Documentation",
  title: "System",
  lede: "What the system is made of, what each part does, and why it was chosen that way. Read it top to bottom in about six minutes, or jump to one part.",
  meta: "12 sections · ≈ 6 min",
  description:
    "Technical documentation for a hybrid DSP and neural noise suppressor running in real time on a microcontroller: signal chain, hardware, dataset pipeline, training and a status ledger for every figure quoted.",
  // TODO(owner): supply /public/og/system.png (1200×630) or point this at the real asset.
  ogImage: "/og/system.png",
} as const;

export const SECTIONS: DocSectionMeta[] = [
  {
    id: "overview",
    number: "01",
    title: "Overview",
    group: "SYSTEM",
    lede: "A hybrid DSP and neural noise suppressor that runs in real time on a microcontroller, keeping speech intelligible through gunfire, rotor noise, engines and sirens.",
    Body: Overview,
  },
  {
    id: "signal-chain",
    number: "02",
    title: "Signal chain",
    group: "SYSTEM",
    lede: "Microphone to headset in one 10 ms frame, with a gate deciding whether the network is needed at all.",
    Body: SignalChain,
  },
  {
    id: "hardware",
    number: "03",
    title: "Hardware",
    group: "BUILD",
    lede: "Two microphones, one microcontroller and a sealed case, sized to be worn rather than carried.",
    status: "WORKING",
    Body: Hardware,
  },
  {
    id: "dsp-prefilter",
    number: "04",
    title: "DSP prefilter",
    group: "BUILD",
    lede: "Beamforming and an NLMS adaptive filter remove the noise the reference microphone can predict.",
    Body: DspPrefilter,
  },
  {
    id: "rnnoise",
    number: "05",
    title: "RNNoise",
    group: "BUILD",
    lede: "A small recurrent network predicts one gain per frequency band, every frame, in int8.",
    status: "WORKING",
    Body: RnNoise,
  },
  {
    id: "post-filter",
    number: "06",
    title: "Post-filter",
    group: "BUILD",
    lede: "Once the noise is gone, the final challenge is keeping the voice stable, natural, and safe at the output.",
    Body: PostFilter,
  },
  {
    id: "dataset-pipeline",
    number: "07",
    title: "Dataset pipeline",
    group: "BUILD",
    lede: "Training pairs are generated, not collected, so the SNR axis and the noise classes are ours to choose.",
    Body: DatasetPipeline,
  },
  {
    id: "training",
    number: "08",
    title: "Training",
    group: "BUILD",
    lede: "Losses chosen for impulsive noise, three metrics, and a model kept small enough for the target.",
    Body: Training,
  },
  {
    id: "mission",
    number: "09",
    title: "Mission",
    group: "PROJECT",
    lede: "Why this is being built, and who it is being built for.",
    Body: Mission,
  },
  {
    id: "roadmap",
    number: "10",
    title: "Roadmap",
    group: "PROJECT",
    lede: "What runs today, what is being built now, and what is only planned.",
    Body: RoadmapSection,
  },
];

/** Sidebar structure, derived so the nav can never fall out of step with the page. */
export const NAV_GROUPS: DocsNavGroup[] = DOC_GROUPS.map((label) => ({
  label,
  items: SECTIONS.filter((section) => section.group === label).map(
    ({ id, number, title }) => ({ id, number, title }),
  ),
})).filter((group) => group.items.length > 0);
