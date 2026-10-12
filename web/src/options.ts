// Option types, defaults, and validation (FR-012). Limits come from data-model.md and the spec.

export type Shape = 'line' | 'calendar';
export type Direction = 'rows' | 'columns';
export type Repeat = 'stacked' | 'side-by-side';

export interface TrackerOptions {
  shape: Shape;
  direction: Direction;
  repeat: Repeat;
  habits: number;
  days: number;
  perRow: number;
  dotDiameterMm: number;
  dotSpacingMm: number;
  title: string;
}

export const DEFAULTS: TrackerOptions = {
  shape: 'line',
  direction: 'rows',
  repeat: 'stacked',
  habits: 5,
  days: 31,
  perRow: 7,
  dotDiameterMm: 4,
  dotSpacingMm: 1.5,
  title: '',
};

export const SHAPES: readonly Shape[] = ['line', 'calendar'];
export const DIRECTIONS: readonly Direction[] = ['rows', 'columns'];
export const REPEATS: readonly Repeat[] = ['stacked', 'side-by-side'];

type NumericField = 'habits' | 'days' | 'perRow' | 'dotDiameterMm' | 'dotSpacingMm';

export const LIMITS: Record<
  NumericField,
  { min: number; max: number; integer: boolean; label: string }
> = {
  habits: { min: 1, max: 20, integer: true, label: 'Habits' },
  days: { min: 1, max: 365, integer: true, label: 'Days' },
  perRow: { min: 1, max: 31, integer: true, label: 'Dots per row' },
  dotDiameterMm: { min: 2, max: 5, integer: false, label: 'Dot diameter (mm)' },
  dotSpacingMm: { min: 0.5, max: 5, integer: false, label: 'Dot spacing (mm)' },
};

export type Field = NumericField | 'shape' | 'direction' | 'repeat' | 'title';

export type ValidationResult =
  | { ok: true; options: TrackerOptions }
  | { ok: false; errors: Partial<Record<Field, string>> };

// Raw form values are strings, exactly as typed.
export type RawOptions = Record<Field, string>;

function validateNumber(field: NumericField, raw: string): { value?: number; error?: string } {
  const rule = LIMITS[field];
  const text = raw.trim();
  if (text === '') return { error: `${rule.label} is required.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: `${rule.label} must be a number.` };
  if (rule.integer && !Number.isInteger(value))
    return { error: `${rule.label} must be a whole number.` };
  if (value < rule.min || value > rule.max) {
    return { error: `${rule.label} must be between ${rule.min} and ${rule.max}.` };
  }
  return { value };
}

// Returns the parsed options, or one message per invalid field. Any error means download stays disabled.
export function validate(raw: RawOptions): ValidationResult {
  const errors: Partial<Record<Field, string>> = {};
  const numbers: Partial<Record<NumericField, number>> = {};

  for (const field of Object.keys(LIMITS) as NumericField[]) {
    const result = validateNumber(field, raw[field]);
    if (result.error !== undefined) errors[field] = result.error;
    else numbers[field] = result.value;
  }

  // A direction value validates independently of shape — it has no effect when shape is
  // 'calendar' (FR-003), but that isn't a validation error.
  const shape = raw.shape as Shape;
  if (!SHAPES.includes(shape)) errors.shape = 'Choose a shape.';
  const direction = raw.direction as Direction;
  if (!DIRECTIONS.includes(direction)) errors.direction = 'Choose a direction.';
  const repeat = raw.repeat as Repeat;
  if (!REPEATS.includes(repeat)) errors.repeat = 'Choose a repeat direction.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    options: {
      shape,
      direction,
      repeat,
      habits: numbers.habits!,
      days: numbers.days!,
      perRow: numbers.perRow!,
      dotDiameterMm: numbers.dotDiameterMm!,
      dotSpacingMm: numbers.dotSpacingMm!,
      title: raw.title.slice(0, 200),
    },
  };
}

// Typst reads every input as a string (typst/tracker.typ, sys.inputs).
export function toTypstInputs(options: TrackerOptions): Record<string, string> {
  return {
    shape: options.shape,
    direction: options.direction,
    repeat: options.repeat,
    habits: String(options.habits),
    days: String(options.days),
    perRow: String(options.perRow),
    dotDiameterMm: String(options.dotDiameterMm),
    dotSpacingMm: String(options.dotSpacingMm),
    title: options.title,
  };
}
