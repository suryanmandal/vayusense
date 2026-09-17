import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsAroundCenter, validateBounds, imageCoordinates } from '../src/lib/satelliteBounds.mjs';

test('selected city drives preview extent and raster corner order', () => {
  const bounds = boundsAroundCenter([77.25, 28.5]);
  assert.deepEqual(bounds, [77, 28.25, 77.5, 28.75]);
  assert.deepEqual(imageCoordinates(bounds), [[77, 28.75], [77.5, 28.75], [77.5, 28.25], [77, 28.25]]);
  assert.notDeepEqual(boundsAroundCenter([72.8, 19]), bounds);
});

test('rejects malformed, reversed, nonfinite and out-of-range bounds', () => {
  for (const value of [null, {}, [], [1, 2, 3], ['1', 2, 3, 4], [NaN, 2, 3, 4],
    [1, 2, Infinity, 4], [3, 2, 1, 4], [1, 4, 3, 2], [1, 2, 1, 4],
    [-181, 2, 3, 4], [1, -91, 3, 4], [1, 2, 181, 4], [1, 2, 3, 91]]) {
    assert.throws(() => validateBounds(value));
  }
});
