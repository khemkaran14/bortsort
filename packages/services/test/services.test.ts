import { describe, expect, it } from 'vitest';
import { allKeys, checkIn, defaultSave, EN_TEXT, HI_TEXT, migrate, t } from '../src';

describe('save data', () => {
  it('migrates partial old saves without losing progress', () => {
    const s = migrate({ unlocked: 37, coins: 500, settings: { music: false } });
    expect(s.unlocked).toBe(37);
    expect(s.coins).toBe(500);
    expect(s.settings.music).toBe(false);
    expect(s.settings.sfx).toBe(true);
    expect(s.version).toBe(3);
    expect(s.wit.unlocked).toBe(1);
    expect(s.wit.freeHints).toBe(3);
    expect(s.blueprint.unlocked).toBe(1);
    expect(s.rush.best).toBe(0);
  });
  it('falls back to defaults on garbage', () => {
    expect(migrate('nope')).toEqual(defaultSave());
  });
});

describe('streak', () => {
  const fresh = { day: 0, lastDate: null, freezesUsedWeek: null };
  it('counts consecutive days and wraps after 7', () => {
    let s = checkIn(fresh, '2026-11-10')!.streak;
    expect(s.day).toBe(1);
    s = checkIn(s, '2026-11-11')!.streak;
    expect(s.day).toBe(2);
    expect(checkIn(s, '2026-11-11')).toBeNull();
  });
  it('uses one free streak freeze per week for a single missed day', () => {
    const s = { day: 3, lastDate: '2026-11-10', freezesUsedWeek: null };
    const r = checkIn(s, '2026-11-12')!;
    expect(r.streak.day).toBe(4);
    expect(r.usedFreeze).toBe(true);
    const again = checkIn({ ...r.streak, lastDate: '2026-11-12' }, '2026-11-14')!;
    expect(again.streak.day).toBe(1);
  });
  it('restarts after two missed days', () => {
    expect(checkIn({ day: 5, lastDate: '2026-11-01', freezesUsedWeek: null }, '2026-11-05')!.streak.day).toBe(1);
  });
});

describe('translations', () => {
  it('Hindi has every English key', () => {
    for (const k of allKeys()) expect(HI_TEXT[k], k).toBeTruthy();
    expect(Object.keys(HI_TEXT).length).toBe(Object.keys(EN_TEXT).length);
  });
  it('fills variables', () => {
    expect(t('en', 'level', { n: 137 })).toBe('Level 137');
    expect(t('hi', 'level', { n: 5 })).toBe('लेवल 5');
  });
});
