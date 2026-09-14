// Unit quaternions keep drag axes fixed to the screen at every orientation.
export const identity = () => [0, 0, 0, 1];
export function multiply([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [aw*bx + ax*bw + ay*bz - az*by, aw*by - ax*bz + ay*bw + az*bx,
    aw*bz + ax*by - ay*bx + az*bw, aw*bw - ax*bx - ay*by - az*bz];
}
export function screenRotate(q, xDegrees, yDegrees) {
  const angle = Math.hypot(xDegrees, yDegrees);
  if (!angle) return [...q];
  const half = angle * Math.PI / 360, s = Math.sin(half) / angle;
  const result = multiply([xDegrees*s, yDegrees*s, 0, Math.cos(half)], q);
  const length = Math.hypot(...result);
  return result.map(v => v / length);
}
export function matrix(q) {
  const [x, y, z, w] = q;
  return [1-2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w), 0,
    2*(x*y-z*w), 1-2*(x*x+z*z), 2*(y*z+x*w), 0,
    2*(x*z+y*w), 2*(y*z-x*w), 1-2*(x*x+y*y), 0, 0, 0, 0, 1];
}
export const initialOrientation = () => screenRotate(screenRotate(identity(), -14, 0), 0, -22);
