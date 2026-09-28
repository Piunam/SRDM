import { HERO } from "./hero-config";

// One composition system for every shot. All values are CSS px relative to the
// hero section (which is the full viewport while pinned).
export type FrameLayout = {
  W: number;
  H: number;
  mobile: boolean;
  col: (k: number) => { l: number; r: number; c: number };
  baseline: number;
  amp: number;
  gap: number; // split between primary and ref streams
  bandL: number;
  bandR: number;
  barsL: number;
  barsR: number;
  maxH: number;
  device: { x: number; y: number; width: number };
  headset: { x: number; y: number };
  stageTop: number;
  stageBottom: number;
};

export function frameLayout(W: number, H: number, mobile: boolean): FrameLayout {
  const f = HERO.frame;
  if (mobile) {
    const m = f.mobile;
    const col = () => ({ l: m.margin, r: W - m.margin, c: W / 2 });
    const baseline = H * m.baseline;
    return {
      W, H, mobile, col, baseline,
      amp: H * m.ampFrac,
      gap: H * 0.05,
      bandL: m.margin,
      bandR: W - m.margin,
      barsL: m.margin,
      barsR: W - m.margin,
      maxH: H * m.barsFrac,
      device: { x: W * m.deviceX, y: H * m.deviceY, width: W * m.deviceWidthFrac },
      headset: { x: W * m.headsetX, y: H * m.headsetY },
      stageTop: 0,
      stageBottom: H * m.stageFrac,
    };
  }
  const colW = (W - 2 * f.margin - 11 * f.gutter) / 12;
  const col = (k: number) => {
    const l = f.margin + (k - 1) * (colW + f.gutter);
    return { l, r: l + colW, c: l + colW / 2 };
  };
  const baseline = H * f.baseline;
  const deviceSpan = col(11).r - col(9).l;
  return {
    W, H, mobile, col, baseline,
    amp: H * f.ampFrac,
    gap: H * 0.14,
    bandL: col(5).l,
    bandR: col(12).r,
    barsL: col(6).l,
    barsR: col(12).r,
    maxH: H * f.barsFrac,
    device: { x: (col(9).l + col(11).r) / 2, y: baseline, width: deviceSpan * f.deviceWidthFrac },
    headset: { x: col(7).c + 20, y: H * 0.3 },
    stageTop: f.header,
    stageBottom: H,
  };
}

// CSS helpers for DOM zones on the desktop 12-column grid.
const F = HERO.frame;
const colExpr = `((100% - ${2 * F.margin}px - ${11 * F.gutter}px) / 12)`;
export const gridLeft = (k: number) => `calc(${F.margin}px + ${k - 1} * (${colExpr} + ${F.gutter}px))`;
export const gridWidth = (n: number) => `calc(${n} * ${colExpr} + ${n - 1} * ${F.gutter}px)`;
