import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureSpan, parseRatio, visualColumns, distributeColumns } from '../src/work-layout.js';

test('feature rows alternate wide and narrow cards across twelve columns', () => {
  const spans = [0, 1, 2, 3, 4, 5].map(featureSpan);
  assert.deepEqual(spans, [7, 5, 5, 7, 7, 5]);
  for (let row = 0; row < spans.length; row += 2) assert.equal(spans[row] + spans[row + 1], 12);
});

test('aspect ratios parse from CSS ratio strings', () => {
  assert.equal(parseRatio('4 / 5'), .8);
  assert.equal(parseRatio('1800 / 1156'), 1800 / 1156);
  assert.equal(parseRatio('2'), 2);
});

test('visual grid narrows from four columns to two', () => {
  assert.equal(visualColumns(1512), 4);
  assert.equal(visualColumns(1024), 3);
  assert.equal(visualColumns(768), 3);
  assert.equal(visualColumns(600), 2);
  assert.equal(visualColumns(375), 2);
});

test('masonry fills the first row in reading order', () => {
  const columns = distributeColumns([300, 300, 300, 300, 200], 4);
  assert.deepEqual(columns, [[0, 4], [1], [2], [3]]);
});

test('masonry places every item once and keeps columns balanced', () => {
  const heights = [420, 310, 520, 380, 300, 460, 350, 390, 470, 330, 360, 400];
  const columns = distributeColumns(heights, 4);
  assert.deepEqual(columns.flat().sort((a, b) => a - b), heights.map((_, index) => index));
  for (const column of columns) assert.deepEqual(column, [...column].sort((a, b) => a - b), 'order is kept within a column');
  const totals = columns.map(column => column.reduce((sum, index) => sum + heights[index], 0));
  assert.ok(Math.max(...totals) - Math.min(...totals) <= Math.max(...heights));
});

test('masonry tolerates fewer items than columns', () => {
  assert.deepEqual(distributeColumns([100, 100], 4), [[0], [1], [], []]);
  assert.deepEqual(distributeColumns([100], 0), [[0]]);
});
