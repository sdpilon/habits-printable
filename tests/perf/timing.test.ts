// SC-002: preview updates within 0.2 s. Times the fitting page with the most dots (US Letter, 9 habits, 360 days,
// calendars, 24 per row, 2 mm dots: 3,240 dots), median of ten compiles. Rendering with PDF.js is not timed.
import { describe, expect, it } from 'vitest';
import { compileTracker } from '../../web/src/typst-engine.ts';

const largestFit = {
  layout: 'calendars' as const,
  habits: 9,
  days: 360,
  perRow: 24,
  dotDiameterMm: 2,
  dotSpacingMm: 0.5,
  paper: 'letter' as const,
  title: '',
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
