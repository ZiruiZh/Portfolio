export const DESTINATIONS = { z: 'work', r: 'playground', i: 'about' };

// OKLCH keeps perceived lightness fixed as the hue changes.
export function makeAccent(random = Math.random) {
  return `oklch(88% 0.15 ${Math.floor(random() * 360)})`;
}

export function wrap(value, period) {
  return ((value % period) + period) % period;
}

export function loopBounds(items, width, height) {
  const minX = Math.min(...items.map(i => i.world.x - i.w / 2));
  const maxX = Math.max(...items.map(i => i.world.x + i.w / 2));
  const minY = Math.min(...items.map(i => i.world.y - i.h / 2));
  const maxY = Math.max(...items.map(i => i.world.y + i.h / 2));
  return { x: minX, y: minY, width: Math.max(width * 1.6, maxX - minX + width * .35), height: Math.max(height * 1.6, maxY - minY + height * .35) };
}

export function proximity(point, rect, reach = 100) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.max(0, 1 - Math.hypot(dx, dy) / reach);
}
