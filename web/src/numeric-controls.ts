// Phone-friendly companions (steppers, sliders) for the five numeric fields in #options. The
// existing <input name="..."> stays the single source of truth read by readForm()/validate();
// these helpers only ever write back into it and dispatch the same `input` event typing does
// (spec FR-010, data-model.md). Limits come from LIMITS, never duplicated here.

import { LIMITS } from './options.ts';

type NumericField = keyof typeof LIMITS;
type Direction = 'increase' | 'decrease';
type NumericRule = (typeof LIMITS)[NumericField];

// 0 decimals for integer fields, 1 for the 0.1-step mm fields — derived from `integer`, not
// hardcoded per field, so a future LIMITS change can't drift out of sync with this file.
function decimalsFor(rule: NumericRule): number {
  return rule.integer ? 0 : 1;
}

function stepSizeFor(rule: NumericRule): number {
  return rule.integer ? 1 : 0.1;
}

// Rounds away the floating-point drift from repeated +/- 0.1 (e.g. 1.6000000000000001 -> 1.6).
function round(value: number, rule: NumericRule): number {
  return Number(value.toFixed(decimalsFor(rule)));
}

export function clampToRange(value: number, rule: NumericRule): number {
  return Math.min(rule.max, Math.max(rule.min, value));
}

// The next value after one tap in `direction`, clamped to [min, max] and rounded to the field's
// decimals. Empty or non-numeric text steps to the limit in the tapped direction (spec edge case):
// "+" goes to the minimum (the lowest valid value is the natural starting point to count up from),
// "−" goes to the maximum. A numeric value already outside the range clamps to the nearer limit on
// either tap, rather than stepping further away from the valid range.
export function stepValue(text: string, direction: Direction, rule: NumericRule): number {
  const current = Number(text.trim());
  if (text.trim() === '' || !Number.isFinite(current)) {
    return direction === 'increase' ? rule.min : rule.max;
  }
  if (current < rule.min || current > rule.max) {
    return clampToRange(current, rule);
  }
  const step = stepSizeFor(rule);
  const next = current + (direction === 'increase' ? step : -step);
  return clampToRange(round(next, rule), rule);
}

// True when a tap in `direction` would not change the field's value — i.e. the button for that
// direction should be disabled. Empty/non-numeric text is never "at limit": a tap would move it
// to a real value (see stepValue above).
export function atLimit(text: string, direction: Direction, rule: NumericRule): boolean {
  const trimmed = text.trim();
  const current = Number(trimmed);
  if (trimmed === '' || !Number.isFinite(current)) return false;
  return direction === 'increase' ? current >= rule.max : current <= rule.min;
}

// The nearest in-range number for `text`, for driving a <input type="range"> from the field's
// text — null when the text isn't a number at all (the slider is then left wherever it was).
export function sliderValueFor(text: string, rule: NumericRule): number | null {
  const value = Number(text.trim());
  if (text.trim() === '' || !Number.isFinite(value)) return null;
  return clampToRange(value, rule);
}

const INTEGER_FIELDS: readonly NumericField[] = ['habits', 'days', 'perRow'];
const SLIDER_FIELDS: readonly NumericField[] = ['dotDiameterMm', 'dotSpacingMm'];

function fieldInput(form: HTMLFormElement, field: NumericField): HTMLInputElement {
  return form.elements.namedItem(field) as HTMLInputElement;
}

// Wires every stepper button in `form` to its field. One call at startup is enough: buttons and
// fields don't change after the page loads.
export function initSteppers(form: HTMLFormElement): void {
  function updateDisabled(field: NumericField): void {
    const input = fieldInput(form, field);
    for (const direction of ['decrease', 'increase'] as const) {
      const button = form.querySelector<HTMLButtonElement>(
        `[data-stepper="${field}"][data-direction="${direction}"]`,
      );
      if (button) button.disabled = atLimit(input.value, direction, LIMITS[field]);
    }
  }

  for (const field of INTEGER_FIELDS) {
    updateDisabled(field);
    for (const direction of ['decrease', 'increase'] as const) {
      const button = form.querySelector<HTMLButtonElement>(
        `[data-stepper="${field}"][data-direction="${direction}"]`,
      );
      button?.addEventListener('click', () => {
        const input = fieldInput(form, field);
        const next = stepValue(input.value, direction, LIMITS[field]);
        const nextText = String(next);
        if (input.value === nextText) return; // no-op change, no recompile (spec edge case)
        input.value = nextText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }

  // Typed input can move a field past, to, or away from a limit; keep every button in sync.
  form.addEventListener('input', () => {
    for (const field of INTEGER_FIELDS) updateDisabled(field);
  });
}

// Wires every slider+readout pair in `form` to its mm field, in both directions, without ever
// giving the <input type="range"> a `name` (contracts/page-interface.md: it must not collide
// with the field's own name in readForm()/the e2e suite).
export function initSliders(form: HTMLFormElement): void {
  let dragStartText = '';

  for (const field of SLIDER_FIELDS) {
    const rule = LIMITS[field];
    const input = fieldInput(form, field);
    const slider = form.querySelector<HTMLInputElement>(`[data-slider-for="${field}"]`);
    const readout = form.querySelector<HTMLOutputElement>(`[data-readout-for="${field}"]`);
    if (!slider || !readout) continue;

    readout.textContent = input.value;

    // Fires continuously during a drag: track the slider and readout, but don't recompile yet
    // (spec FR-010: one recompile per drag, on release, not one per intermediate position).
    slider.addEventListener('input', () => {
      input.value = slider.value;
      readout.textContent = slider.value;
    });

    // Fires once, on release (pointer) or on each committed key press (keyboard — arrow keys and
    // Home/End fire `change` with no preceding `pointerdown`). Recompile only if the value
    // actually changed since the interaction began, so releasing back at the starting value is a
    // no-op (spec edge case). `focus` catches the keyboard case; `pointerdown` catches drags that
    // start on an already-focused slider.
    slider.addEventListener('focus', () => {
      dragStartText = input.value;
    });
    slider.addEventListener('pointerdown', () => {
      dragStartText = input.value;
    });
    slider.addEventListener('change', () => {
      if (input.value === dragStartText) return;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Typing into the field moves the slider to the nearest value it can represent, and the
    // readout always shows the field's text verbatim (spec FR-007/FR-008) — never rounded, and
    // never fed back into the field, so there's no loop between this handler and the one above.
    input.addEventListener('input', () => {
      const value = sliderValueFor(input.value, rule);
      if (value !== null) slider.value = String(value);
      readout.textContent = input.value;
    });
  }
}
