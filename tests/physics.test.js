import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { createEnclosure, containBody, SCULPTURE_MATERIAL } from '../src/enclosure.js';
import { shapePalette, makeRun } from '../src/palette.js';
import { makeAccent, wrap, loopBounds, DESTINATIONS } from '../src/experience-math.js';
import { DEFS } from '../src/shapes.js';
const { Engine, Bodies, Body, Composite, Events } = Matter;

test('shapes pass through the text region without physical obstacles', () => {
  const engine = Engine.create();
  engine.gravity.y = 1.9;
  const circle = Bodies.circle(225, 90, 25, SCULPTURE_MATERIAL);
  const text = { left: 100, top: 250, right: 350, bottom: 310 };
  Composite.add(engine.world, circle);
  for (let i = 0; i < 160; i++) {
    Engine.update(engine, 1000 / 120);
  }
  assert.ok(circle.position.y > text.bottom + 100);
  assert.equal(engine.world.bodies.length, 1, 'text never adds physical obstacles');
});

test('refresh accents change hue while retaining the same perceptual lightness', () => {
  assert.equal(makeAccent(() => 0), 'oklch(88% 0.15 0)');
  assert.equal(makeAccent(() => .5), 'oklch(88% 0.15 180)');
});

test('infinite canvas coordinates loop equally in every direction', () => {
  for (const period of [700, 1700, 3100]) {
    for (const value of [-100000, -1700, -1, 0, 1, 250, 100000]) {
      assert.ok(wrap(value, period) >= 0 && wrap(value, period) < period);
      assert.equal(wrap(value + period, period), wrap(value, period));
      assert.equal(wrap(value - period, period), wrap(value, period));
    }
  }
});

test('loop boundaries expand with the farthest object', () => {
  const items = [{ world: { x: 100, y: 100 }, w: 100, h: 100 }, { world: { x: 500, y: 400 }, w: 300, h: 200 }];
  const initial = loopBounds(items, 400, 400);
  items[1].world = { x: 2100, y: 1800 };
  const expanded = loopBounds(items, 400, 400);
  assert.ok(expanded.width > initial.width);
  assert.ok(expanded.height > initial.height);
  assert.deepEqual(DESTINATIONS, { z: 'work', r: 'playground', i: 'about' });
});

test('fresh palettes vary across generations and all layers receive valid colors', () => {
  const first = DEFS.map(shapePalette), next = DEFS.map(shapePalette);
  assert.notDeepEqual(first, next);
  first.forEach((palette, i) => {
    assert.equal(palette.length, DEFS[i].slots);
    palette.forEach(color => assert.match(color, /^#[0-9A-F]{6}$/));
  });
  for (const count of [4, 5, 6]) assert.equal(makeRun(count, { allowWhite: true }).length, count);
});

test('an upward throw collides with the ceiling and falls back inside the stage', () => {
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 10 });
  engine.gravity.y = 1.9;
  const body = Bodies.rectangle(300, 170, 80, 100, SCULPTURE_MATERIAL);
  const walls = createEnclosure(600, 700);
  let hitCeiling = false;
  Events.on(engine, 'collisionStart', event => {
    if (event.pairs.some(pair => pair.bodyA.label === 'ceiling' || pair.bodyB.label === 'ceiling')) hitCeiling = true;
  });
  Composite.add(engine.world, [...walls, body]);
  Body.setVelocity(body, { x: 0, y: -18 });
  for (let i = 0; i < 720; i++) {
    Engine.update(engine, 1000 / 120);
    containBody(body, 600, 700);
  }
  assert.equal(hitCeiling, true);
  assert.ok(body.bounds.min.y >= -.1);
  assert.ok(body.bounds.max.y <= 700.1);
  assert.ok(body.position.y > 550, 'the body returns to the floor');
});

for (const size of [{ width: 390, height: 800 }, { width: 1712, height: 1102 }]) {
  test(`all artwork hulls remain enclosed during extreme throws at ${size.width}px`, () => {
    const engine = Engine.create({ positionIterations: 10, velocityIterations: 10 });
    engine.gravity.y = 1.9;
    const scale = Math.min(size.width / 2830, size.height * .49 / 662);
    const bodies = DEFS.map((def, index) => {
      const vertices = def.hull.map(([x, y]) => ({ x: x * scale, y: y * scale }));
      const body = Bodies.fromVertices(size.width * (.12 + index * .18), size.height * .5, [vertices], SCULPTURE_MATERIAL, true);
      Body.setVelocity(body, { x: index % 2 ? 80 : -80, y: -100 });
      Body.setAngularVelocity(body, .3);
      return body;
    });
    Composite.add(engine.world, [...createEnclosure(size.width, size.height), ...bodies]);
    for (let i = 0; i < 600; i++) {
      Engine.update(engine, 1000 / 120);
      for (const body of bodies) {
        containBody(body, size.width, size.height);
        assert.ok(body.bounds.min.x >= -.01 && body.bounds.max.x <= size.width + .01);
        assert.ok(body.bounds.min.y >= -.01 && body.bounds.max.y <= size.height + .01);
        assert.ok(Number.isFinite(body.angle));
      }
    }
  });
}

test('heavy sculptures move less than the original under the same force', () => {
  const engine = Engine.create();
  engine.gravity.y = 0;
  const heavy = Bodies.rectangle(100, 100, 80, 80, SCULPTURE_MATERIAL);
  const original = Bodies.rectangle(300, 100, 80, 80, { density: .0022, frictionAir: .010 });
  Composite.add(engine.world, [heavy, original]);
  Body.applyForce(heavy, heavy.position, { x: .1, y: 0 });
  Body.applyForce(original, original.position, { x: .1, y: 0 });
  Engine.update(engine, 1000 / 120);
  assert.ok(heavy.mass > original.mass * 6);
  assert.ok(heavy.velocity.x < original.velocity.x / 5);
});


test('curated palettes preserve strong value contrast between neighboring layers', () => {
  const luminance = hex => {
    const c = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
    return c[0]*.2126 + c[1]*.7152 + c[2]*.0722;
  };
  for (let i = 0; i < 500; i++) {
    const colors = makeRun(6, { allowWhite: true });
    assert.ok(luminance(colors[0]) < .55, 'the outside layer is visible on white');
    for (let j = 1; j < colors.length; j++) assert.ok(Math.abs(luminance(colors[j])-luminance(colors[j-1])) >= .24);
  }
});
