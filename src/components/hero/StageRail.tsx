"use client";

import { useEffect, useRef, useState } from "react";
import { HERO } from "./hero-config";
import { COPY } from "./hero-copy";
import { actIndexAt, heroState, onHeroFrame } from "./hero-state";

type Props = {
  mobile: boolean;
  onSelect: (index: number) => void;
};

// Left-edge pipeline progress (desktop) or a thin top bar (mobile).
export function StageRail({ mobile, onSelect }: Props) {
  const fill = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(
    () =>
      onHeroFrame(() => {
        const p = heroState.progress;
        if (fill.current) fill.current.style.transform = mobile ? `scaleX(${p})` : `scaleY(${p})`;
        const idx = actIndexAt(p);
        setActive((cur) => (cur === idx ? cur : idx));
      }),
    [mobile],
  );

  if (mobile) {
    return (
      <div className="absolute inset-x-0 top-0 z-30 h-[2px] bg-line" aria-hidden="true">
        <div ref={fill} className="h-full origin-left bg-cy" style={{ transform: "scaleX(0)" }} />
      </div>
    );
  }

  return (
    <nav aria-label="Pipeline stages" className="absolute left-6 top-1/2 z-30 -translate-y-1/2">
      <div className="relative flex flex-col gap-5 py-1">
        <div className="absolute left-[5px] top-0 h-full w-px bg-line" aria-hidden="true" />
        <div
          ref={fill}
          className="absolute left-[5px] top-0 h-full w-px origin-top bg-cy"
          style={{ transform: "scaleY(0)" }}
          aria-hidden="true"
        />
        {HERO.acts.map((a, i) => {
          const on = i === active;
          const past = i < active;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-current={on ? "step" : undefined}
              aria-label={`Stage ${i}: ${COPY.stages[i].short}`}
              className="group relative flex items-center gap-3 rounded-[3px] text-left outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-cy"
            >
              <span
                className={`relative z-10 block h-[11px] w-[11px] rounded-[2px] border transition-all duration-300 ${
                  on
                    ? "border-cy bg-cy"
                    : past
                      ? "border-cy/60 bg-deep"
                      : "border-line3 bg-deep"
                }`}
              />
              <span
                className={`mono-caps pointer-events-none absolute left-6 whitespace-nowrap rounded-[3px] bg-abyss/80 px-1.5 py-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                  on ? "text-cy" : "text-dim"
                }`}
              >
                {String(i).padStart(2, "0")} {COPY.stages[i].short}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
