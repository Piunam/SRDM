import { Section } from "@/components/ui/Section";
import { MetricCell, MetricRow } from "@/components/ui/MetricCell";
import { bestResults, footnote, metricsEyebrow } from "@/content/metrics";
import { Reveal } from "./Reveal";

/** First thing after the hero: the four headline figures, all still TARGET. */
export function MetricsStrip() {
  return (
    <Section id="metrics-strip" ariaLabel="Best result" className="bg-abyss">
      <Reveal>
        <p className="mono-caps mb-8 text-dim">{metricsEyebrow}</p>
        <MetricRow>
          {bestResults.map((m) => (
            <MetricCell
              key={m.key}
              label={m.label}
              value={m.value}
              decimals={m.decimals}
              unit={m.unit}
              sub={m.target}
              status={m.status}
            />
          ))}
        </MetricRow>
        {footnote && <p className="mt-10 border-t border-line pt-5 text-[14px] leading-[1.6] text-dim">{footnote}</p>}
      </Reveal>
    </Section>
  );
}
