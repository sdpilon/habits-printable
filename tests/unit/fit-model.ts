// Planning check for overflow (data-model.md, Fit rules). Typst's page count decides overflow;
// fit.test.ts fails if this model disagrees with it.
import type { TrackerOptions } from '../../web/src/options.ts';

const MARGIN_MM = 10;
const GAP_MM = 4;
const LABEL_H_MM = 6;
const LABEL_COL_H_MM = 30;
const NUM_H_MM = 3;
const NUM_W_MM = 6;
const ROW_LABEL_W_MM = 40;

export function usableArea(paper: TrackerOptions['paper']): { w: number; h: number } {
  const [pageW, pageH] = paper === 'letter' ? [215.9, 279.4] : [210, 297];
  return { w: pageW - 2 * MARGIN_MM, h: pageH - 2 * MARGIN_MM };
}

// True when the layout fits on one page, using the formulas in data-model.md.
export function predictFits(o: TrackerOptions): boolean {
  const pitch = o.dotDiameterMm + o.dotSpacingMm;
  const lineH = pitch + NUM_H_MM;
  const area = usableArea(o.paper);
  let width: number;
  let height: number;

  if (o.layout === 'rows') {
    const lines = Math.ceil(o.days / o.perRow);
    width = ROW_LABEL_W_MM + o.perRow * pitch;
    height = o.habits * lines * lineH + (o.habits - 1) * GAP_MM;
  } else if (o.layout === 'columns') {
    const groups = Math.ceil(o.habits / o.perRow);
    width = NUM_W_MM + Math.min(o.habits, o.perRow) * pitch;
    height = groups * (LABEL_COL_H_MM + o.days * pitch) + (groups - 1) * GAP_MM;
  } else {
    const blockW = o.perRow * pitch;
    const blockH = LABEL_H_MM + Math.ceil(o.days / o.perRow) * lineH;
    const blocksPerRow = Math.max(1, Math.floor((area.w + GAP_MM) / (blockW + GAP_MM)));
    const rows = Math.ceil(o.habits / blocksPerRow);
    width = blockW;
    height = rows * blockH + (rows - 1) * GAP_MM;
  }

  return width <= area.w && height <= area.h;
}
