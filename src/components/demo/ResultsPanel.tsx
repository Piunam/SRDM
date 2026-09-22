"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { StatusTag, type Status } from "@/components/ui/StatusTag";
import { fmt } from "@/lib/format";
import { MonoNote } from "./controls";
import { EmptyState } from "./EmptyState";
import { delta, METRICS_NOTE, noiseOptions, snrLabel, type DemoItem } from "./manifest";

type Row = {
  id: string;
  noise: string;
  inputSnrDb: number;
  outputSnrDb: number | null;
  deltaSnrDb: number | null;
  stoi: number | null;
  pesq: number | null;
  status: Status | null;
};

type SortKey = keyof Omit<Row, "id">;

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "noise", label: "Noise", numeric: false },
  { key: "inputSnrDb", label: "Input SNR", numeric: true },
  { key: "outputSnrDb", label: "Output SNR", numeric: true },
  { key: "deltaSnrDb", label: "Δ SNR", numeric: true },
  { key: "stoi", label: "STOI", numeric: true },
  { key: "pesq", label: "PESQ", numeric: true },
  { key: "status", label: "Status", numeric: false },
];

const LEGEND: Status[] = ["MEASURED", "SIMULATED", "TARGET", "PLANNED"];

const toRow = (item: DemoItem): Row => ({
  id: item.id,
  noise: item.noise,
  inputSnrDb: item.inputSnrDb,
  outputSnrDb: item.enhanced.snrDb,
  deltaSnrDb: delta(item.noisy.snrDb, item.enhanced.snrDb),
  stoi: item.enhanced.stoi,
  pesq: item.enhanced.pesq,
  status: item.status,
});

const cellText = (row: Row, key: SortKey): string => {
  const value = row[key];
  if (value === null) return "—";
  if (key === "inputSnrDb") return snrLabel(row.inputSnrDb);
  if (typeof value === "number") return key === "stoi" || key === "pesq" ? fmt(value, 2) : fmt(value, 1);
  return String(value);
};

/** Missing figures sort last in either direction, so `—` never looks like a winner. */
function compare(a: Row, b: Row, key: SortKey, dir: 1 | -1): number {
  const x = a[key];
  const y = b[key];
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
  return String(x).localeCompare(String(y)) * dir;
}

const mean = (values: (number | null)[]) => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
};
const best = (values: (number | null)[]) => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.max(...present) : null;
};

function toCsv(rows: Row[]): string {
  const head = COLUMNS.map((c) => c.label);
  const body = rows.map((row) => COLUMNS.map((c) => (row[c.key] === null ? "" : String(row[c.key]))));
  return [head, ...body].map((line) => line.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",")).join("\n");
}

export function ResultsPanel({ items }: { items: DemoItem[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "noise", dir: 1 });
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    const filtered = items.filter((item) => filter === "all" || item.noise === filter).map(toRow);
    return filtered.sort((a, b) => compare(a, b, sort.key, sort.dir));
  }, [items, filter, sort]);

  if (items.length === 0) return <EmptyState />;

  const noises = noiseOptions(items);
  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `demo-results${filter === "all" ? "" : `-${filter}`}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = [
    { label: "MEAN", value: (key: SortKey) => mean(rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : null))) },
    { label: "BEST", value: (key: SortKey) => best(rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : null))) },
  ];

  const th = "border-b border-line px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-dim";
  const td = "border-b border-line2 px-3 py-2.5 font-mono text-[12px] tabular-nums text-silver";

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Field label="Noise type" className="w-full max-w-[220px]">
            {({ id, className }) => (
              <select id={id} className={className} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">all</option>
                {noises.map((noise) => (
                  <option key={noise} value={noise}>
                    {noise}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            {LEGEND.map((status) => (
              <StatusTag key={status} status={status} />
            ))}
            <Button variant="ghost" size="sm" onClick={download} disabled={rows.length === 0}>
              DOWNLOAD CSV
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">Every clip in the manifest, with its offline metrics.</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={th}
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s.key === column.key ? { key: s.key, dir: s.dir === 1 ? -1 : 1 } : { key: column.key, dir: 1 }))}
                      className={`inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy ${
                        active ? "text-cy" : ""
                      }`}
                    >
                      {column.label}
                      <span aria-hidden="true" className="text-[9px]">
                        {active ? (sort.dir === 1 ? "▲" : "▼") : "·"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={`${td} ${column.key === "deltaSnrDb" && (row.deltaSnrDb ?? 0) > 0 ? "text-cy" : ""}`}>
                    {column.key === "status" ? row.status ? <StatusTag status={row.status} /> : "—" : cellText(row, column.key)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className={`${td} text-dim`} colSpan={COLUMNS.length}>
                  No clips match this filter.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {summary.map((line) => (
              <tr key={line.label}>
                <th scope="row" className="border-t border-line px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                  {line.label}
                </th>
                {COLUMNS.slice(1).map((column) => {
                  const value = column.numeric ? line.value(column.key) : null;
                  return (
                    <td key={column.key} className={`${td} border-t border-line text-white`}>
                      {value === null ? "—" : fmt(value, column.key === "stoi" || column.key === "pesq" ? 2 : 1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tfoot>
        </table>
      </Panel>

      <MonoNote>
        {rows.length} of {items.length} clips shown · CSV exports exactly what is on screen · {METRICS_NOTE}
      </MonoNote>
    </div>
  );
}
