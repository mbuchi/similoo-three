import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALL_YEARS,
  DEFAULT_YEARS,
  YEARS_LADDER,
  coerceYearsWindow,
  isAllYears,
  normalizeYearsWindow,
} from '../src/js/yearsWindow.js';

// The sidebar's years filter is a discrete precision ladder, and the value it
// holds is what goes on the wire to /score/similoo. Two things have to hold at
// once: the unrestricted window must survive as 'all' (the old
// `Number.isFinite(x) ? x : 10` coercion silently turned it into ten years),
// and anything that is not a real window must still land on the default.

describe('the ladder', () => {
  it('is the shipped set of steps, tightest first, unrestricted last', () => {
    assert.deepEqual(YEARS_LADDER, [5, 10, 15, 20, 40, 60, ALL_YEARS]);
  });

  it('keeps 10 as a step, so the default is not a behavior change', () => {
    assert.equal(DEFAULT_YEARS, 10);
    assert.ok(YEARS_LADDER.includes(DEFAULT_YEARS));
  });
});

describe('isAllYears', () => {
  it('accepts the string and the numeric synonym', () => {
    assert.equal(isAllYears('all'), true);
    assert.equal(isAllYears(' ALL '), true);
    assert.equal(isAllYears('All'), true);
    assert.equal(isAllYears(0), true);
    assert.equal(isAllYears('0'), true);
  });

  it('does not read the falsy values that merely COERCE to 0 as "all"', () => {
    // Number(null) === Number('') === Number(false) === 0. None of them is a
    // user asking for every construction year, and treating them as one would
    // silently drop the year filter on an empty input.
    assert.equal(isAllYears(null), false);
    assert.equal(isAllYears(''), false);
    assert.equal(isAllYears(false), false);
    assert.equal(isAllYears(undefined), false);
  });

  it('rejects real windows', () => {
    assert.equal(isAllYears(10), false);
    assert.equal(isAllYears('10'), false);
    // 100 is NOT "all": Swiss parcels carry construction years well before it.
    assert.equal(isAllYears(100), false);
  });
});

describe('coerceYearsWindow (the wire contract)', () => {
  it("passes the unrestricted window through as 'all'", () => {
    assert.equal(coerceYearsWindow('all'), ALL_YEARS);
    assert.equal(coerceYearsWindow(0), ALL_YEARS);
  });

  it('passes an in-range integer through, from a number or a numeric string', () => {
    assert.equal(coerceYearsWindow(5), 5);
    assert.equal(coerceYearsWindow(60), 60);
    assert.equal(coerceYearsWindow('7'), 7);
    assert.equal(coerceYearsWindow(1), 1);
    assert.equal(coerceYearsWindow(100), 100);
  });

  it('rounds a fractional window instead of forwarding it', () => {
    assert.equal(coerceYearsWindow(7.6), 8);
  });

  it('defaults anything that is not a window, including out-of-range numbers', () => {
    for (const garbage of [undefined, null, '', '   ', 'banana', NaN, Infinity, true, {}, [], -5, 0.4, 101, 1e9]) {
      assert.equal(coerceYearsWindow(garbage), DEFAULT_YEARS);
    }
  });

  it('honors an explicit fallback', () => {
    assert.equal(coerceYearsWindow('banana', 20), 20);
    assert.equal(coerceYearsWindow(undefined, ALL_YEARS), ALL_YEARS);
  });
});

describe('normalizeYearsWindow (the control contract)', () => {
  it('leaves every ladder step alone', () => {
    for (const step of YEARS_LADDER) {
      assert.equal(normalizeYearsWindow(step), step);
    }
  });

  it('reads the DOM dataset spellings the ladder buttons carry', () => {
    // `button.dataset.years` is always a string, including for the numbers.
    assert.equal(normalizeYearsWindow('15'), 15);
    assert.equal(normalizeYearsWindow('all'), ALL_YEARS);
  });

  it('snaps an off-ladder window to the nearest step', () => {
    assert.equal(normalizeYearsWindow(1), 5);
    assert.equal(normalizeYearsWindow(12), 10);
    assert.equal(normalizeYearsWindow(13), 15);
    assert.equal(normalizeYearsWindow(25), 20);
    assert.equal(normalizeYearsWindow(55), 60);
  });

  it("widens on a tie, because a sparse set is this filter's failure mode", () => {
    assert.equal(normalizeYearsWindow(30), 40); // 20 and 40 are equidistant
    assert.equal(normalizeYearsWindow(50), 60); // 40 and 60 are equidistant
  });

  it('never reaches the unrestricted window by being a large number', () => {
    // The old slider topped out at 30; a stale 100 is still a bounded window.
    assert.equal(normalizeYearsWindow(100), 60);
  });

  it('falls back to the default step for garbage', () => {
    assert.equal(normalizeYearsWindow(undefined), DEFAULT_YEARS);
    assert.equal(normalizeYearsWindow('banana'), DEFAULT_YEARS);
    assert.equal(normalizeYearsWindow(null), DEFAULT_YEARS);
  });
});
