import type { ReactNode } from "react";
import { StatusTag, type Status } from "@/components/ui/StatusTag";

export type SpecRowObject = { key: string; value: ReactNode; note?: string; status?: Status };
export type SpecRowTuple = readonly [key: string, value: ReactNode, note?: string];
export type SpecRow = SpecRowObject | SpecRowTuple;

const normalise = (row: SpecRow): SpecRowObject =>
  "key" in row ? row : { key: row[0], value: row[1], note: row[2] };

/**
 * Key / value table with hairline row dividers. Rows accept either the short
 * tuple form or an object, which additionally carries a status tag — that is how
 * the status ledger in section 11 is rendered.
 */
export function SpecTable({
  rows,
  caption,
  className = "",
}: {
  rows: readonly SpecRow[];
  caption?: string;
  className?: string;
}) {
  const items = rows.map(normalise);
  const hasStatus = items.some((row) => row.status);

  return (
    <div className={`my-8 overflow-x-auto ${className}`}>
      <table className="w-full min-w-[420px] border-collapse text-left">
        {caption && <caption className="mb-3 text-left font-mono text-[11px] text-dim">{caption}</caption>}
        <tbody>
          {items.map((row) => (
            <tr key={row.key} className="border-t border-line last:border-b">
              <th
                scope="row"
                className="w-[34%] py-3 pr-5 align-top font-mono text-[12px] font-normal leading-[1.5] text-dim"
              >
                {row.key}
              </th>
              <td className="py-3 align-top text-[14px] leading-[1.6] text-white tabular-nums">
                <span className="block">{row.value}</span>
                {row.note && <span className="mt-1 block font-mono text-[11px] leading-[1.5] text-dim">{row.note}</span>}
              </td>
              {hasStatus && (
                <td className="w-px py-3 pl-5 align-top text-right">{row.status && <StatusTag status={row.status} />}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
