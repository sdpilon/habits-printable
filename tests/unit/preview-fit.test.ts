// Pure scale-math for the preview fit modes (contracts/preview-fit.md). No DOM.
import { describe, expect, it } from 'vitest';
import { computePreviewScale, type FitMode } from '../../web/src/preview-fit.ts';

const page = { width: 612, height: 792 }; // US Letter, points

describe('computePreviewScale', () => {
  it.each<[FitMode]>([['page'], ['height'], ['width']])(
    'preserves the page aspect ratio exactly in %s mode',
    (mode) => {
      const container = { width: 500, height: 300 };
      const { displayWidth, displayHeight } = computePreviewScale(page, container, mode);
      expect(displayWidth / displayHeight).toBeCloseTo(page.width / page.height, 10);
    },
  );

  it('page mode never exceeds the container in either dimension', () => {
    const cases = [
      { width: 500, height: 300 },
      { width: 300, height: 500 },
      { width: 1000, height: 1000 },
    ];
    for (const container of cases) {
      const { displayWidth, displayHeight } = computePreviewScale(page, container, 'page');
      expect(displayWidth).toBeLessThanOrEqual(container.width + 1e-6);
      expect(displayHeight).toBeLessThanOrEqual(container.height + 1e-6);
    }
  });

  it('height mode always matches the container height exactly, width may over/under-shoot', () => {
    const wide = { width: 1000, height: 300 };
    const narrow = { width: 100, height: 300 };
    for (const container of [wide, narrow]) {
      const { displayHeight } = computePreviewScale(page, container, 'height');
      expect(displayHeight).toBeCloseTo(container.height, 10);
    }
    expect(computePreviewScale(page, wide, 'height').displayWidth).toBeLessThan(wide.width);
    expect(computePreviewScale(page, narrow, 'height').displayWidth).toBeGreaterThan(narrow.width);
  });

  it('width mode always matches the container width exactly, height may over/under-shoot', () => {
    const tall = { width: 300, height: 1000 };
    const short = { width: 300, height: 100 };
    for (const container of [tall, short]) {
      const { displayWidth } = computePreviewScale(page, container, 'width');
      expect(displayWidth).toBeCloseTo(container.width, 10);
    }
    expect(computePreviewScale(page, tall, 'width').displayHeight).toBeLessThan(tall.height);
    expect(computePreviewScale(page, short, 'width').displayHeight).toBeGreaterThan(short.height);
  });

  it('is a pure function of plain object inputs', () => {
    const container = { width: 500, height: 300 };
    const a = computePreviewScale(page, container, 'page');
    const b = computePreviewScale({ ...page }, { ...container }, 'page');
    expect(a).toEqual(b);
  });
});
