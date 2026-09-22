import { Panel } from "@/components/ui/Panel";
import { EMPTY_MESSAGE } from "./manifest";

/** Shown whenever the manifest has no items — the state this page ships in. */
export function EmptyState({ detail }: { detail?: string }) {
  return (
    <Panel className="p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">NO DATA</p>
      <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.55] text-silver">{EMPTY_MESSAGE}</p>
      {detail && <p className="mt-3 max-w-[52ch] font-mono text-[11px] leading-[1.6] text-faint">{detail}</p>}
      <div className="mt-6 border-t border-line pt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">EXPECTED LAYOUT</p>
        <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-[1.7] text-silver">{`public/demo/noisy/<noise>_<snr>dB_<clip>.wav
public/demo/clean/<noise>_<snr>dB_<clip>.wav
public/demo/stages/<noise>_<snr>dB_<clip>_<stage>.wav

npm run demo-manifest`}</pre>
        <p className="mt-4 max-w-[60ch] font-mono text-[11px] leading-[1.6] text-faint">
          The script pairs the files and writes public/demo/manifest.json with every metric set to null. Fill SNR, STOI and PESQ from the
          evaluation output; they are never computed here.
        </p>
      </div>
    </Panel>
  );
}
