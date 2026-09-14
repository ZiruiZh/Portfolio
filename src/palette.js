// Poster-like color families: electric accents, pale counterpoints, and tinted inks.
// Randomize within a family so layers feel related without losing their contrast.
const families = [
  ['#233DFF', '#C8F7FF', '#FF593E', '#21114D', '#ECFF79', '#AD83FF'],
  ['#7D29FF', '#E9FF87', '#FF70B8', '#211047', '#96E7FF', '#4055EE'],
  ['#006F76', '#BBFFD9', '#FF5C83', '#102D47', '#F6EF9C', '#85BFFF'],
  ['#ED3F26', '#F3F0D6', '#3339CD', '#191948', '#B5D5FF', '#FFACD3'],
  ['#154ED9', '#BCF1CA', '#FB7954', '#1F2947', '#FCE78B', '#9F9CFF'],
  ['#B72B92', '#FFDFA3', '#82E4D5', '#312060', '#F3BFFF', '#495DD7'],
  ['#4D26CE', '#F2F3AE', '#FF816E', '#17294D', '#A7EBFA', '#C5A6FF'],
  ['#137DE0', '#F9C9E1', '#D5F878', '#172944', '#E6E7FF', '#E3475E'],
];
const luminance = hex => {
  const rgb = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const swatches = families.map(colors => colors.map(color => ({ color, light: luminance(color) })));
const pick = values => values[Math.floor(Math.random() * values.length)];

export function makeRun(n, opts = {}) {
  const family = pick(swatches), out = [];
  let previous;
  for (let i = 0; i < n; i++) {
    const pool = opts.allowWhite && i > 0 ? [...family, { color: '#FFFFFF', light: 1 }] : family;
    // Strong value separation remains visible in grayscale as well as color.
    const candidates = pool.filter(s => i === 0 ? s.light < .55 : Math.abs(s.light - previous.light) >= .24);
    const unused = candidates.filter(s => !out.includes(s.color));
    const chosen = pick(unused.length ? unused : candidates);
    out.push(chosen.color); previous = chosen;
  }
  return out;
}

export function shapePalette(def) { return makeRun(def.slots); }
