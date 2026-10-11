import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../web/src/options.ts';
import {
  atLimit,
  clampToRange,
  sliderValueFor,
  stepValue,
} from '../../web/src/numeric-controls.ts';

const habits = LIMITS.habits; // min 1, max 20, integer, step 1
const spacing = LIMITS.dotSpacingMm; // min 0.5, max 5, not integer, step 0.1

describe('stepValue', () => {
  it('steps an integer field by one unit', () => {
    expect(stepValue('5', 'increase', habits)).toBe(6);
    expect(stepValue('5', 'decrease', habits)).toBe(4);
  });

  it('clamps at the maximum and minimum', () => {
    expect(stepValue('20', 'increase', habits)).toBe(20);
    expect(stepValue('1', 'decrease', habits)).toBe(1);
  });

  it('steps empty or non-numeric text to the limit in the tapped direction', () => {
    expect(stepValue('', 'increase', habits)).toBe(1);
    expect(stepValue('', 'decrease', habits)).toBe(20);
    expect(stepValue('abc', 'increase', habits)).toBe(1);
    expect(stepValue('abc', 'decrease', habits)).toBe(20);
  });

  it('clamps a numeric value above the maximum or below the minimum on either tap', () => {
    expect(stepValue('25', 'increase', habits)).toBe(20);
    expect(stepValue('25', 'decrease', habits)).toBe(20);
    expect(stepValue('-3', 'increase', habits)).toBe(1);
    expect(stepValue('-3', 'decrease', habits)).toBe(1);
  });

  it('steps an mm field by 0.1 without floating-point drift', () => {
    expect(stepValue('1.5', 'increase', spacing)).toBe(1.6);
    expect(stepValue('1.6', 'decrease', spacing)).toBe(1.5);
  });

  it('clamps an mm field at its maximum and minimum', () => {
    expect(stepValue('5', 'increase', spacing)).toBe(5);
    expect(stepValue('0.5', 'decrease', spacing)).toBe(0.5);
  });
});

describe('atLimit', () => {
  it('is true only when a step in that direction would not change the value', () => {
    expect(atLimit('20', 'increase', habits)).toBe(true);
    expect(atLimit('20', 'decrease', habits)).toBe(false);
    expect(atLimit('1', 'decrease', habits)).toBe(true);
    expect(atLimit('1', 'increase', habits)).toBe(false);
    expect(atLimit('5', 'increase', habits)).toBe(false);
  });

  it('is false for empty or non-numeric text, since a step would change it', () => {
    expect(atLimit('', 'increase', habits)).toBe(false);
    expect(atLimit('', 'decrease', habits)).toBe(false);
  });
});

describe('clampToRange', () => {
  it('leaves an in-range value unchanged', () => {
    expect(clampToRange(10, habits)).toBe(10);
  });

  it('clamps above the maximum and below the minimum', () => {
    expect(clampToRange(25, habits)).toBe(20);
    expect(clampToRange(-3, habits)).toBe(1);
  });
});

describe('sliderValueFor', () => {
  it('returns the number for valid in-range text', () => {
    expect(sliderValueFor('1.5', spacing)).toBe(1.5);
  });

  it('clamps an out-of-range value to the nearest end', () => {
    expect(sliderValueFor('9', spacing)).toBe(5);
    expect(sliderValueFor('-1', spacing)).toBe(0.5);
  });

  it('returns null for empty or non-numeric text', () => {
    expect(sliderValueFor('', spacing)).toBeNull();
    expect(sliderValueFor('abc', spacing)).toBeNull();
  });
});
