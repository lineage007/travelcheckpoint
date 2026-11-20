import { describe, it, expect } from 'vitest';
import { contrastRatio } from './contrast';

const ACCENT = '#35c6ad';
const ACCENT_HOVER = '#43d7c0';
const ON_ACCENT = '#06060a';

describe('contrastRatio', () => {
  it('dark text on the accent meets WCAG AA (4.5:1)', () => {
    expect(contrastRatio(ON_ACCENT, ACCENT)).toBeGreaterThanOrEqual(4.5);
  });

  it('dark text on the accent hover colour meets WCAG AA (4.5:1)', () => {
    expect(contrastRatio(ON_ACCENT, ACCENT_HOVER)).toBeGreaterThanOrEqual(4.5);
  });

  it('white text on the accent fails WCAG AA (control)', () => {
    expect(contrastRatio('#ffffff', ACCENT)).toBeLessThan(4.5);
  });

  it('matches known reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#fff', '#fff')).toBeCloseTo(1, 5);
    expect(contrastRatio(ACCENT, ON_ACCENT)).toBeCloseTo(contrastRatio(ON_ACCENT, ACCENT), 10);
  });
});
