// Pure scale-math for fitting the preview (contracts/preview-fit.md). No DOM.
import { describe, expect, it } from 'vitest';
import { computePreviewScale } from '../../web/src/preview-fit.ts';

const page = { width: 612, height: 792 }; // US Letter, points

describe('computePreviewScale', () => {
  it('preserves the page aspect ratio exactly', () => {
    const container = { width: 500, height: 300 };
    const { displayWidth, displayHeight } = computePreviewScale(page, container);
    expect(displayWidth / displayHeight).toBeCloseTo(page.width / page.height, 10);
  });

  it('never exceeds the container in either dimension', () => {
    const cases = [
      { width: 500, height: 300 },
      { width: 300, height: 500 },
      { width: 1000, height: 1000 },
    ];
    for (const container of cases) {
      const { displayWidth, displayHeight } = computePreviewScale(page, container);
      expect(displayWidth).toBeLessThanOrEqual(container.width + 1e-6);
      expect(displayHeight).toBeLessThanOrEqual(container.height + 1e-6);
    }
  });

  it('is a pure function of plain object inputs', () => {
    const container = { width: 500, height: 300 };
    const a = computePreviewScale(page, container);
    const b = computePreviewScale({ ...page }, { ...container });
    expect(a).toEqual(b);
  });
});
