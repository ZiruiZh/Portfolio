// The hover wash under the bar is a dithered orange texture, recoloured to the hovered shape's colour:
// every pixel keeps its offset from the texture's base orange in hue, saturation and lightness.
const textureURL = new URL('../assets/shape-gradient.png', import.meta.url).href;
const BASE = rgbToHsl(255, 129, 47);
const cache = new Map();
let source;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function loadSource() {
  source ||= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) });
    };
    img.onerror = reject;
    img.src = textureURL;
  });
  return source;
}

function parseHex(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null;
}

async function tint(color) {
  if (cache.has(color)) return cache.get(color);
  const rgb = parseHex(color);
  if (!rgb) return null;
  const { canvas, ctx, data } = await loadSource();
  const [ht, st, lt] = rgbToHsl(...rgb), [hb, sb, lb] = BASE;
  const dh = ht - hb, sk = sb ? st / sb : 0;
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), px = out.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    // lightness bends so the base orange lands on the target while white stays white
    const nl = l <= lb ? l * lt / lb : lt + (l - lb) * (1 - lt) / (1 - lb);
    const [r, g, b] = hslToRgb((h + dh + 360) % 360, Math.min(1, s * sk), nl);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(out, 0, 0);
  const url = await new Promise(resolve => canvas.toBlob(blob => resolve(URL.createObjectURL(blob))));
  cache.set(color, url);
  return url;
}

export function installShapeGradient() {
  const el = document.querySelector('.shape-gradient');
  if (!el) return;
  let current = '';
  const update = () => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--shape-color').trim();
    if (!color || color === current) return;
    current = color;
    // until the texture is tinted, the plain CSS wash shows the right colour
    const plain = () => { el.style.removeProperty('background-image'); el.classList.remove('is-textured'); };
    plain();
    tint(color).then(url => {
      if (current !== color || !url) return;
      el.style.backgroundImage = `url("${url}")`;
      el.classList.add('is-textured');
    }).catch(plain);
  };
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  update();
}
