"use client";

import { MonoNote } from "./controls";
import { PresetDemoPanel } from "./PresetDemoPanel";

export function DemoShell() {
  return (
    <div className="min-w-0">
      <PresetDemoPanel />

      <div className="mt-8 border-t border-line pt-4">
        <MonoNote>Seven dB endpoints are ready · audio changes with the selected level · metrics load when playback starts</MonoNote>
      </div>
    </div>
  );
}
