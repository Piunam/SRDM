import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { HOME, type PipelineNode } from "./home-copy";
import { Reveal } from "./Reveal";

const { pipeline } = HOME;
const NODES: Record<string, PipelineNode> = Object.fromEntries(pipeline.nodes.map((n) => [n.id, n]));

const linkClass =
  "group focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy";
const rectClass = "fill-panel stroke-line transition-colors duration-200 group-hover:stroke-cy group-focus-visible:stroke-cy";
const titleClass = "fill-white font-mono uppercase tracking-[0.1em] transition-colors duration-200 group-hover:fill-cy";
const subClass = "fill-dim font-mono tracking-[0.02em]";
const wireClass = "stroke-line3 fill-none";
const labelClass = "fill-dim font-mono tracking-[0.06em]";

/** A box with its title and sub-label, wrapped in a link to its /system anchor. */
function Box({ node, x, y, w, h }: { node: PipelineNode; x: number; y: number; w: number; h: number }) {
  return (
    <a href={node.href} className={linkClass} aria-label={`${node.title} — ${node.sub}. Read more on the system page.`}>
      <rect x={x} y={y} width={w} height={h} rx={4} strokeWidth={1} className={rectClass} />
      <text x={x + 15} y={y + 23} className={titleClass} fontSize={12}>
        {node.title}
      </text>
      <text x={x + 15} y={y + 41} className={subClass} fontSize={9.5}>
        {node.sub}
      </text>
    </a>
  );
}

/** Arrowhead pointing right (dir 1) or down (dir 0). */
function Tip({ x, y, down = false }: { x: number; y: number; down?: boolean }) {
  const d = down ? `M ${x - 3.5} ${y - 6} L ${x} ${y} L ${x + 3.5} ${y - 6}` : `M ${x - 6} ${y - 3.5} L ${x} ${y} L ${x - 6} ${y + 3.5}`;
  return <path d={d} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className={wireClass} />;
}

/* ------------------------------------------------------------- horizontal */

const W = 150;
const H = 56;
const X = { mics: 0, prefilter: 202, gate: 404, rnnoise: 606, postfilter: 808, output: 1010 };
const MAIN = 102; // main-lane box top
const BRANCH = 20; // neural-lane box top
const MY = MAIN + H / 2;
const BY = BRANCH + H / 2;
const TAP = 578; // where the neural detour leaves the main lane
const MERGE = 784; // and rejoins it

function Horizontal() {
  return (
    <svg viewBox="0 0 1160 168" className="hidden h-auto w-full md:block" role="group" aria-label={pipeline.lede}>
      {/* the main lane runs straight through: skipping the network is the default */}
      <path d={`M ${X.mics + W} ${MY} H ${X.prefilter - 6}`} strokeWidth={1} className={wireClass} />
      <Tip x={X.prefilter} y={MY} />
      <path d={`M ${X.prefilter + W} ${MY} H ${X.gate - 6}`} strokeWidth={1} className={wireClass} />
      <Tip x={X.gate} y={MY} />
      <path d={`M ${X.gate + W} ${MY} H ${X.postfilter - 6}`} strokeWidth={1} className={wireClass} />
      <Tip x={X.postfilter} y={MY} />
      <path d={`M ${X.postfilter + W} ${MY} H ${X.output - 6}`} strokeWidth={1} className={wireClass} />
      <Tip x={X.output} y={MY} />

      {/* low-SNR frames take the detour above it */}
      <path d={`M ${TAP} ${MY} V ${BY} H ${X.rnnoise - 6}`} strokeWidth={1} className={wireClass} />
      <Tip x={X.rnnoise} y={BY} />
      <path d={`M ${X.rnnoise + W} ${BY} H ${MERGE} V ${MY}`} strokeWidth={1} className={wireClass} />

      <text x={X.rnnoise + W / 2} y={12} textAnchor="middle" fontSize={10} className={labelClass}>
        {pipeline.branchLabel}
      </text>
      <text x={(TAP + MERGE) / 2} y={MY + 20} textAnchor="middle" fontSize={10} className={labelClass}>
        {pipeline.skipLabel}
      </text>

      <Box node={NODES.mics} x={X.mics} y={MAIN} w={W} h={H} />
      <Box node={NODES.prefilter} x={X.prefilter} y={MAIN} w={W} h={H} />
      <Box node={NODES.gate} x={X.gate} y={MAIN} w={W} h={H} />
      <Box node={NODES.rnnoise} x={X.rnnoise} y={BRANCH} w={W} h={H} />
      <Box node={NODES.postfilter} x={X.postfilter} y={MAIN} w={W} h={H} />
      <Box node={NODES.output} x={X.output} y={MAIN} w={W} h={H} />
    </svg>
  );
}

/* --------------------------------------------------------------- vertical */

const VW = 210;
const VH = 54;
const PITCH = 90;
const VX = 105; // connector centre line

function Vertical() {
  return (
    <svg viewBox="0 0 360 504" className="mx-auto h-auto w-full max-w-[380px] md:hidden" role="group" aria-label={pipeline.lede}>
      {pipeline.nodes.map((node, i) => {
        const top = i * PITCH;
        const label = node.id === "rnnoise" ? pipeline.branchLabel : node.id === "postfilter" ? pipeline.skipLabel : undefined;
        return (
          <g key={node.id}>
            {i > 0 && (
              <>
                <path d={`M ${VX} ${top - PITCH + VH} V ${top - 6}`} strokeWidth={1} className={wireClass} />
                <Tip x={VX} y={top} down />
                {label && (
                  <text x={VW + 12} y={top - 14} fontSize={9} className={labelClass}>
                    {label}
                  </text>
                )}
              </>
            )}
            <Box node={node} x={0} y={top} w={VW} h={VH} />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ section */

export function Pipeline() {
  return (
    <Section id="pipeline" className="border-t border-line bg-abyss">
      <Reveal>
        <SectionHeader
          number={pipeline.number}
          label={pipeline.label}
          title={pipeline.title}
          lede={pipeline.lede}
          headingId="pipeline-title"
        />
      </Reveal>

      <Reveal delay={0.06} className="mt-14">
        <Horizontal />
        <Vertical />
      </Reveal>

      <Reveal delay={0.12}>
        <dl className="mt-14 grid border-t border-line md:grid-cols-3">
          {pipeline.captions.map((c, i) => (
            <div
              key={c.title}
              className={`border-line py-6 max-md:border-b max-md:last:border-b-0 md:pr-8 ${i > 0 ? "md:border-l md:pl-8" : ""}`}
            >
              <dt className="mono-caps text-cy">{c.title}</dt>
              <dd className="mt-3 text-[15px] leading-[1.65] text-silver">{c.body}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={0.16} className="mt-10">
        <ButtonLink href="/system" variant="ghost" size="md">
          {pipeline.cta}
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
