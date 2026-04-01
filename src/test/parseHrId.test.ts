import { describe, it, expect } from 'vitest';

// Mirror of parseHrId from App.tsx
function parseHrId(hrId: string) {
  const [, dateStr, hrNum] = hrId.split('_');
  return {
    date: dateStr,
    seasonHRNumber: Number(hrNum),
  };
}

describe('parseHrId', () => {
  it('parses a well-formed hrId correctly', () => {
    const result = parseHrId('656811_2026-03-27_1');
    expect(result.date).toBe('2026-03-27');
    expect(result.seasonHRNumber).toBe(1);
  });

  it('parses multi-digit HR numbers', () => {
    const result = parseHrId('656811_2026-09-15_42');
    expect(result.date).toBe('2026-09-15');
    expect(result.seasonHRNumber).toBe(42);
  });

  it('returns undefined date for malformed input (missing underscores)', () => {
    const result = parseHrId('badformat');
    expect(result.date).toBeUndefined();
    expect(result.seasonHRNumber).toBeNaN();
  });

  it('returns undefined date for empty string without throwing', () => {
    expect(() => parseHrId('')).not.toThrow();
    const result = parseHrId('');
    expect(result.date).toBeUndefined();
  });

  it('returns NaN seasonHRNumber when hr number part is not a number', () => {
    const result = parseHrId('656811_2026-03-27_abc');
    expect(result.seasonHRNumber).toBeNaN();
  });
});
