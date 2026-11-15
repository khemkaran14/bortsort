import type { Bolt, Nut } from '../src/types';

/** Build bolts from strings like "AABB" (bottom→top). Letters are colors A=0, B=1, ... */
export function bolts(spec: string[], cap = 4): Bolt[] {
  return spec.map((s) => ({ cap, nuts: [...s].map((ch): Nut => ({ c: ch.charCodeAt(0) - 65 })) }));
}
