import { describe, expect, it } from 'vitest';
import { DEFAULTS, toTypstInputs, validate, type RawOptions } from '../../web/src/options.ts';

const valid: RawOptions = {
  layout: 'rows',
  habits: '5',
  days: '31',
  perRow: '7',
  dotDiameterMm: '4',
  dotSpacingMm: '1.5',
  paper: 'a4',
};

describe('validate', () => {
  it('accepts the defaults', () => {
    const result = validate(valid);
    expect(result).toEqual({ ok: true, options: DEFAULTS });
  });

  it.each([
    ['habits', '0'], ['habits', '21'], ['habits', '-1'], ['habits', '2.5'],
    ['days', '0'], ['days', '366'], ['days', ''],
    ['perRow', '32'], ['perRow', 'abc'],
    ['dotDiameterMm', '1.9'], ['dotDiameterMm', '5.1'],
    ['dotSpacingMm', '0.4'], ['dotSpacingMm', '5.5'],
  ])('rejects %s = %j with a message on that field', (field, value) => {
    const result = validate({ ...valid, [field]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field as keyof RawOptions]).toBeTruthy();
  });

  it('rejects an unknown layout and paper', () => {
    const result = validate({ ...valid, layout: 'grid', paper: 'b5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.layout).toBeTruthy();
      expect(result.errors.paper).toBeTruthy();
    }
  });

  it('accepts the limit values', () => {
    const result = validate({ ...valid, habits: '20', days: '365', perRow: '31', dotDiameterMm: '2', dotSpacingMm: '0.5' });
    expect(result.ok).toBe(true);
  });
});

describe('toTypstInputs', () => {
  it('passes every option as a string', () => {
    expect(toTypstInputs(DEFAULTS)).toEqual({
      layout: 'rows',
      habits: '5',
      days: '31',
      perRow: '7',
      dotDiameterMm: '4',
      dotSpacingMm: '1.5',
      paper: 'a4',
    });
  });
});
