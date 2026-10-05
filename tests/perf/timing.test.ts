// SC-002: preview updates within 0.2 s. Times the largest page that fits (20 habits, 31 days, calendars), median of ten runs.
import { describe, expect, it } from 'vitest';
import { compileTracker } from '../../web/src/typst-engine.ts';

const largestFit = {
  layout: 'calendars' as const,
  habits: 20,
  days: 31,
  perRow: 7,
  dotDiameterMm: 4,
  dotSpacingMm: 1.5,
  paper: 'a4' as const,
};

describe('preview timing', () => {
  it('compiles the largest fitting page within 0.2 s (median of 10)', async () => {
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await compileTracker(largestFit);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    console.log(`median compile: ${median.toFixed(1)} ms`);
    expect(median).toBeLessThanOrEqual(200);
  });
});
