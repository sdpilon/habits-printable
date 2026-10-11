// Planning check for overflow (data-model.md, Fit rules). Typst's page count decides overflow;
// fit.test.ts fails if this model disagrees with it.
import type { TrackerOptions } from '../../web/src/options.ts';

const MARGIN_MM = 10;
const GAP_MM = 4;
const LABEL_H_MM = 2;
const LABEL_COL_H_MM = 30;
const HEADER_H_MM = 6;
const NUM_GAP_ABOVE_MM = 1;
const NUM_GAP_BELOW_MM = 0.4;
const NUM_TEXT_H_MM = 1.8;
const NUM_W_MM = 6;

export function usableArea(paper: TrackerOptions['paper']): { w: number; h: number } {
  const [pageW, pageH] = paper === 'letter' ? [215.9, 279.4] : [210, 297];
  return { w: pageW - 2 * MARGIN_MM, h: pageH - 2 * MARGIN_MM };
}

// Number of page-rows needed to pack a list of block widths left-to-right with wraparound,
// mirroring typst/tracker.typ's tile-blocks greedy packing (data-model.md Fit rules).
function packSideBySide(widths: number[], areaW: number): number {
  let pageRows = 1;
  let currentW = widths[0] ?? 0;
  for (let i = 1; i < widths.length; i++) {
    const w = widths[i];
    if (currentW + GAP_MM + w <= areaW) {
      currentW += GAP_MM + w;
    } else {
      pageRows++;
      currentW = w;
    }
  }
  return pageRows;
}

// True when the layout fits on one page, using the formulas in data-model.md.
export function predictFits(o: TrackerOptions): boolean {
  const pitch = o.dotDiameterMm + o.dotSpacingMm;
  const lineH = pitch + NUM_GAP_ABOVE_MM + NUM_TEXT_H_MM + NUM_GAP_BELOW_MM;
  const area = usableArea(o.paper);
  const headerH = o.title === '' ? 0 : HEADER_H_MM + GAP_MM;
  const effectiveDirection = o.shape === 'calendar' ? 'rows' : o.direction;
  let width: number;
  let height: number;

  if (effectiveDirection === 'rows') {
    const lines = Math.ceil(o.days / o.perRow);
    const blockW = o.perRow * pitch;
    const blockH = LABEL_H_MM + lines * lineH;
    width = blockW;
    if (o.repeat === 'side-by-side') {
      const widths = Array.from({ length: o.habits }, () => blockW);
      const rows = packSideBySide(widths, area.w);
      height = rows * blockH + (rows - 1) * GAP_MM;
    } else {
      height = o.habits * blockH + (o.habits - 1) * GAP_MM;
    }
  } else {
    const groupCount = Math.ceil(o.habits / o.perRow);
    const groupWidths = Array.from(
      { length: groupCount },
      (_, g) => NUM_W_MM + Math.min(o.perRow, o.habits - g * o.perRow) * pitch,
    );
    const groupH = LABEL_COL_H_MM + o.days * pitch;
    width = NUM_W_MM + Math.min(o.habits, o.perRow) * pitch;
    if (o.repeat === 'side-by-side') {
      const rows = packSideBySide(groupWidths, area.w);
      height = rows * groupH + (rows - 1) * GAP_MM;
    } else {
      height = groupCount * groupH + (groupCount - 1) * GAP_MM;
    }
  }

  return width <= area.w && height <= area.h - headerH;
}
