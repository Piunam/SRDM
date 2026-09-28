/**
 * Static orthographic outline of the printed enclosure, shown while
 * `siteConfig.assets.stlUrl` is undefined. Hairlines only — same drawing
 * language as the rest of the site.
 */
export function EnclosureOutline({ className = "" }: { className?: string }) {
  const edge = "fill-none stroke-line3";
  const detail = "fill-none stroke-line";
  const hidden = "fill-none stroke-line2";

  return (
    <svg
      viewBox="0 0 480 300"
      className={`h-full w-full ${className}`}
      aria-hidden="true"
      strokeWidth={1}
      strokeLinejoin="round"
    >
      {/* the drawing's own bounds sit up and to the left; this squares it in the frame */}
      <g transform="translate(27,-10)">
        {/* hidden back edges */}
        <g className={hidden} strokeDasharray="3 4">
          <path d="M90 230 L152 184 M152 184 L412 184 M152 184 L152 64" />
        </g>

        {/* body: front face, top face, right face */}
        <g className={edge}>
          <rect x="90" y="110" width="260" height="120" rx="4" />
          <path d="M90 110 L152 64 L412 64 L350 110" />
          <path d="M350 110 L412 64 L412 184 L350 230" />
        </g>

        {/* lid parting line and gasket groove */}
        <g className={detail}>
          <path d="M90 152 H350 M350 152 L412 106" />
          <path d="M90 159 H350" />
        </g>

        {/* lid screws on the top face */}
        <g className={detail}>
          <ellipse cx="136.7" cy="98.5" rx="5" ry="3" />
          <ellipse cx="167.7" cy="75.5" rx="5" ry="3" />
          <ellipse cx="334.3" cy="98.5" rx="5" ry="3" />
          <ellipse cx="365.3" cy="75.5" rx="5" ry="3" />
        </g>

        {/* status LED: the one accent in the drawing */}
        <rect
          x="294"
          y="127"
          width="24"
          height="8"
          rx="4"
          className="fill-none stroke-cy"
        />

        {/* engraved front panel */}
        <rect
          x="110"
          y="172"
          width="142"
          height="44"
          rx="2"
          className={detail}
        />
        <text
          x="122"
          y="192"
          className="fill-dim font-mono tracking-[0.08em]"
          fontSize="12"
        >
          ANC-01
        </text>
        <text
          x="122"
          y="207"
          className="fill-faint font-mono tracking-[0.08em]"
          fontSize="9"
        >
          IP67 · 5 V ⎓ 1 A
        </text>

        {/* cable gland, with the reference mic on its tail */}
        <g className={detail}>
          <path d="M90 182 H76 a6 6 0 00-6 6 v8 a6 6 0 006 6 h14" />
          <path d="M72 196 C 60 210, 52 230, 48 250" />
          <rect x="20" y="244" width="30" height="13" rx="6.5" />
          <circle cx="20" cy="250.5" r="6" />
        </g>
      </g>
    </svg>
  );
}
