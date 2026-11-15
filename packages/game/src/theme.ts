/**
 * Colors, symbols, stage backgrounds and skins. The nut palette was chosen so neighbours differ
 * in brightness as well as hue (readable with the common color-blindness types); the optional
 * symbols make every color unambiguous.
 */
export const NUT_COLORS = [
  0xe8554e, // red
  0x3d8bf2, // blue
  0xf7c531, // yellow
  0x2fae63, // green
  0x9b5de5, // purple
  0xf28c28, // orange
  0x46d3d8, // cyan
  0xf47cbc, // pink
  0x8d6e63, // brown
  0xf4f4f4, // white
  0x3b4a57, // charcoal
  0xb8e655, // lime
];

export const SYMBOLS = [
  'circle',
  'square',
  'triangle',
  'star',
  'diamond',
  'plus',
  'heart',
  'hexagon',
  'cross',
  'ring',
  'bars',
  'moon',
] as const;

export interface StageLook {
  top: number;
  bottom: number;
  accent: number;
  deco:
    | 'gears'
    | 'spokes'
    | 'clock'
    | 'waves'
    | 'rails'
    | 'bolts'
    | 'stars'
    | 'circuits'
    | 'bubbles'
    | 'mix'
    | 'grid'
    | 'speed'
    | 'leaves';
}

export const STAGE_LOOKS: Record<number, StageLook> = {
  1: { top: 0x3a2f2a, bottom: 0x1f1a17, accent: 0xf3b562, deco: 'gears' },
  2: { top: 0x24414f, bottom: 0x13232b, accent: 0x7fd1b9, deco: 'spokes' },
  3: { top: 0x3b3355, bottom: 0x1c1830, accent: 0xe8c872, deco: 'clock' },
  4: { top: 0x1f4466, bottom: 0x0f2236, accent: 0x9fd8ff, deco: 'waves' },
  5: { top: 0x4a3b2a, bottom: 0x261e15, accent: 0xff9a5a, deco: 'rails' },
  6: { top: 0x2e4630, bottom: 0x152417, accent: 0xc6ff6b, deco: 'bolts' },
  7: { top: 0x1b1f3f, bottom: 0x07091a, accent: 0xb6a7ff, deco: 'stars' },
  8: { top: 0x3c3f46, bottom: 0x1c1d21, accent: 0x5ee0ff, deco: 'circuits' },
  9: { top: 0x0d3b4f, bottom: 0x041722, accent: 0x5ff0c8, deco: 'bubbles' },
  10: { top: 0x4b2e1f, bottom: 0x22140c, accent: 0xffd166, deco: 'mix' },
  11: { top: 0x4a2330, bottom: 0x220e15, accent: 0xff8a80, deco: 'bolts' },
  12: { top: 0x2f4a1e, bottom: 0x15230b, accent: 0xb5e655, deco: 'bubbles' },
  0: { top: 0x2c3e66, bottom: 0x141d33, accent: 0xffd166, deco: 'stars' }, // daily
  20: { top: 0x1f4f8f, bottom: 0x0f2a52, accent: 0xffffff, deco: 'grid' }, // blueprint
  21: { top: 0x5a1f2a, bottom: 0x220a10, accent: 0xffd166, deco: 'speed' }, // rush
  22: { top: 0x1f4a44, bottom: 0x0c221f, accent: 0xa8e6cf, deco: 'leaves' }, // zen
};

export type NutSkin = 'metal' | 'wood' | 'gems' | 'candy' | 'neon';
export type BoltSkin = 'steel' | 'brass';

export interface SkinItem {
  id: string;
  kind: 'nut' | 'bolt';
  name: string;
  price: number;
  /** Only from rewards (streak day 7, stage chests). */
  rewardOnly?: boolean;
}

export const SKINS: SkinItem[] = [
  { id: 'metal', kind: 'nut', name: 'Metal', price: 0 },
  { id: 'wood', kind: 'nut', name: 'Wood', price: 300 },
  { id: 'candy', kind: 'nut', name: 'Candy', price: 450 },
  { id: 'neon', kind: 'nut', name: 'Neon', price: 600 },
  { id: 'gems', kind: 'nut', name: 'Gems', price: 900 },
  { id: 'steel', kind: 'bolt', name: 'Steel', price: 0 },
  { id: 'brass', kind: 'bolt', name: 'Brass', price: 350 },
];

export const UI = {
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif',
  panel: 0x1d2b3a,
  panelLight: 0x2a3d52,
  gold: 0xf3c14b,
  green: 0x3cb371,
  blue: 0x3d8bf2,
  red: 0xe8554e,
  grey: 0x5d6d7e,
  text: '#ffffff',
  textDim: '#b9c6d3',
  badge: { normal: 0x3cb371, hard: 0xf28c28, superhard: 0xe8554e } as Record<string, number>,
};

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
