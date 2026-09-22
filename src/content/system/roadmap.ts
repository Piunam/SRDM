import type { RoadmapItem } from "@/components/docs/blocks/Roadmap";

/** Section 10. Dates are the owner's to confirm; nothing here is a commitment. */
export const ROADMAP: RoadmapItem[] = [
  {
    when: "Done",
    title: "Prototype working on MCU",
    detail:
      "The full chain — prefilter, gate, network, post-filter — runs in real time on the target in the demo build.",
    status: "WORKING",
  },
  {
    when: "Done",
    title: "Wireless headset link",
    detail:
      "Audio reaches the headset over the wireless link inside a 20 ms budget. The figure is a design target until it is measured end to end.",
    status: "WORKING",
  },
  {
    when: "Now",
    title: "Custom 3D-printed airtight enclosure",
    detail:
      "Sealed case with the reference microphone mounted outside. Printing and fit are in progress; the STL follows.",
    status: "IN PROGRESS",
  },
  {
    when: "Oct 2026",
    title: "Firmware hardening",
    detail:
      "C on the ARM core, with assembly on the hot paths: deterministic frame timing, static memory, no allocation after start-up.",
    status: "Semi-Done",
  },
  {
    when: "TODO",
    title: "Field evaluation with real recordings",
    detail:
      "Measure SNR, STOI and PESQ on recordings made in the environments the device is built for, rather than on generated pairs.",
    status: "PLANNED",
  },
];
