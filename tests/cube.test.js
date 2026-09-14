import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, initialOrientation, multiply, screenRotate, matrix } from '../src/cube-math.js';
const near = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-10, `${actual} != ${expected}`));
const inverse = ([x,y,z,w]) => [-x,-y,-z,w];

test('the same drag rotates about screen axes on the front, back, sides, and upside down', () => {
  const drag = screenRotate(identity(), -18, 32);
  for (const x of [0, 90, 180, 270]) for (const y of [0, 90, 180, 270]) {
    const start = screenRotate(screenRotate(identity(), x, 0), 0, y);
    const end = screenRotate(start, -18, 32);
    near(multiply(end, inverse(start)), drag);
  }
});

test('screen-space right and downward drags move the facing surface with the pointer', () => {
  // CSS coordinates have positive Y pointing down and positive Z toward the viewer.
  for (const turn of [0, 180]) {
    const start = screenRotate(identity(), 0, turn);
    const facingZ = turn === 0 ? 1 : -1;
    const right = matrix(screenRotate(start, 0, 20));
    const down = matrix(screenRotate(start, -20, 0));
    assert.ok(right[8] * facingZ > 0);
    assert.ok(down[9] * facingZ > 0);
  }
});

test('thousands of free rotations preserve a rigid cube without scale drift', () => {
  let q = initialOrientation();
  for (let i = 0; i < 10000; i++) q = screenRotate(q, Math.sin(i)*3, Math.cos(i)*4);
  assert.ok(Math.abs(Math.hypot(...q) - 1) < 1e-12);
  const m = matrix(q), axes = [m.slice(0,3), m.slice(4,7), m.slice(8,11)];
  axes.forEach(axis => assert.ok(Math.abs(Math.hypot(...axis)-1) < 1e-12));
  for (let i = 0; i < 3; i++) {
    const a = axes[i], b = axes[(i+1)%3];
    assert.ok(Math.abs(a.reduce((sum, v, n) => sum + v*b[n], 0)) < 1e-12);
  }
});
