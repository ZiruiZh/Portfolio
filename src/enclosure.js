import Matter from 'matter-js';
const { Bodies, Body, Bounds } = Matter;

export const SCULPTURE_MATERIAL = {
  density: .014, restitution: .10, friction: .72,
  frictionStatic: 1.1, frictionAir: .025, sleepThreshold: 65,
};

export function createEnclosure(width, height) {
  const thickness = 300;
  const options = { isStatic: true, friction: .8, restitution: .05 };
  return [
    Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, { ...options, label: 'ceiling' }),
    Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, { ...options, label: 'floor' }),
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height + thickness * 2, { ...options, label: 'left wall' }),
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height + thickness * 2, { ...options, label: 'right wall' }),
  ];
}

// Discrete collision detection needs a final containment check for fast throws.
export function containBody(body, width, height) {
  // Matter's cached broad-phase bounds include velocity. Use actual vertices
  // here so a fast throw is not incorrectly pushed away from the opposite wall.
  Bounds.update(body.bounds, body.vertices);
  const { min, max } = body.bounds;
  const dx = min.x < 0 ? -min.x : max.x > width ? width - max.x : 0;
  const dy = min.y < 0 ? -min.y : max.y > height ? height - max.y : 0;
  if (dx || dy) {
    Body.translate(body, { x: dx, y: dy });
    Body.setVelocity(body, { x: dx ? 0 : body.velocity.x, y: dy ? 0 : body.velocity.y });
    Bounds.update(body.bounds, body.vertices);
  }
}
