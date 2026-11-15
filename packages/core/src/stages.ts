import type { Mechanic } from './types';

export interface StageSpec {
  stage: number;
  theme: string;
  /** Range of colors (one filled bolt per color). */
  colors: [number, number];
  /** Bolt capacity range. */
  cap: [number, number];
  /** The idea this stage introduces (taught by its first level). */
  introduces: Mechanic | 'basics';
  /** Mechanics that may appear in this stage's levels. */
  uses: Mechanic[];
}

export const LEVELS_PER_STAGE = 50;

export const STAGES: StageSpec[] = [
  { stage: 1, theme: 'Garage Bench', colors: [3, 5], cap: [4, 4], introduces: 'basics', uses: [] },
  { stage: 2, theme: 'Bike Shop', colors: [4, 6], cap: [4, 4], introduces: 'oneSpare', uses: ['oneSpare'] },
  { stage: 3, theme: 'Clock Tower', colors: [5, 7], cap: [4, 4], introduces: 'hidden', uses: ['hidden', 'oneSpare'] },
  { stage: 4, theme: 'Shipyard', colors: [5, 7], cap: [5, 5], introduces: 'tall', uses: ['tall', 'hidden'] },
  { stage: 5, theme: 'Rail Yard', colors: [6, 8], cap: [5, 5], introduces: 'lock', uses: ['tall', 'lock', 'hidden'] },
  {
    stage: 6,
    theme: 'Power Plant',
    colors: [6, 8],
    cap: [5, 5],
    introduces: 'frozen',
    uses: ['tall', 'frozen', 'lock', 'hidden'],
  },
  {
    stage: 7,
    theme: 'Space Dock',
    colors: [7, 9],
    cap: [5, 5],
    introduces: 'short',
    uses: ['tall', 'short', 'frozen', 'hidden'],
  },
  {
    stage: 8,
    theme: 'Robot Factory',
    colors: [7, 10],
    cap: [6, 6],
    introduces: 'moveLimit',
    uses: ['tall', 'moveLimit', 'hidden', 'lock'],
  },
  {
    stage: 9,
    theme: 'Deep Sea Rig',
    colors: [8, 10],
    cap: [6, 6],
    introduces: 'chain',
    uses: ['tall', 'chain', 'frozen', 'hidden'],
  },
  {
    stage: 10,
    theme: 'Grand Workshop',
    colors: [8, 12],
    cap: [4, 6],
    introduces: 'basics',
    uses: ['hidden', 'lock', 'frozen', 'short', 'moveLimit', 'chain', 'oneSpare'],
  },
];

export function stageOfLevel(levelId: number): number {
  return Math.floor((levelId - 1) / LEVELS_PER_STAGE) + 1;
}

/** Position inside the 10-level sawtooth block: 1..10. 8 = Hard, 9 = breather, 10 = Boss. */
export function blockSlot(levelId: number): number {
  return ((levelId - 1) % 10) + 1;
}
