// Tiny shared store so site chrome (header, scroll indicator) can react to the
// pinned hero without importing it.

export type HeroTrack = {
  start: number; // document scroll offset where the pin starts
  end: number; // ... and ends
  active: boolean; // pin currently engaged
  acts: number[]; // act boundaries, 0–1 of the pinned span
};

let hero: HeroTrack | null = null;
const subs = new Set<() => void>();

export function getHeroTrack() {
  return hero;
}

export function setHeroTrack(next: HeroTrack | null) {
  hero = next;
  subs.forEach((fn) => fn());
}

export function onHeroTrack(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
