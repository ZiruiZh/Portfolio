import { gsap } from 'gsap';
import { wrap } from './experience-math.js';

export class LoopingCanvas {
  constructor(stage) {
    this.stage = stage;
    this.camera = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.gesture = null;
    const options = { signal: stage.controller.signal };
    stage.element.addEventListener('wheel', e => {
      if (stage.mode !== 'playground') return;
      if (e.ctrlKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? stage.height : 1;
      this.target.x += (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
      this.target.y += (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
    }, { ...options, passive: false });
    stage.element.addEventListener('pointerdown', e => {
      if (stage.mode === 'playground' && !e.target.closest('.piece')) this.begin(e);
    }, options);
    stage.element.addEventListener('keydown', e => {
      if (stage.mode !== 'playground' || !e.key.startsWith('Arrow')) return;
      e.preventDefault();
      this.target.x += e.key === 'ArrowLeft' ? -180 : e.key === 'ArrowRight' ? 180 : 0;
      this.target.y += e.key === 'ArrowUp' ? -180 : e.key === 'ArrowDown' ? 180 : 0;
    }, options);
  }

  layout(items) {
    this.items = items;
    const W = this.stage.width, H = this.stage.height;
    // Interleave artwork with sculptures across a loose, two-dimensional field.
    const photos = items.filter(item => item.image), shapes = items.filter(item => !item.image);
    const ordered = [];
    photos.forEach((photo, i) => { ordered.push(photo); if (i % 2 === 0 && shapes.length) ordered.push(shapes.shift()); });
    ordered.push(...shapes);
    // A salon wall rather than rows: the pieces stack in columns, each column starts at its own height and each piece
    // sits a little off its column's centre, so no two neighbours share a top line or a baseline.
    const GAP_X = 44, GAP_Y = 40;
    const count = Math.max(2, Math.round(Math.sqrt(ordered.length * 1.4)));
    const columns = Array.from({ length: count }, () => ({ items: [], height: 0, width: 0 }));
    // Each piece joins the shortest column so far, so the columns come out about the same height.
    for (const item of ordered) {
      const column = columns.reduce((low, c) => (c.height < low.height ? c : low));
      column.items.push(item);
      column.height += item.h + GAP_Y;
      column.width = Math.max(column.width, item.w);
    }
    // The canvas repeats every tallest column. Shorter columns spread their slack across their own gaps, the one at
    // the seam included, so the spacing where the canvas wraps matches the spacing everywhere else; sideways it
    // repeats after the last column and one ordinary gap.
    const period = Math.max(...columns.map(c => c.height));
    const golden = .618034;
    let x = 32, i = 0;
    columns.forEach((column, c) => {
      const gap = GAP_Y + (period - column.height) / column.items.length;
      let y = ((c * golden) % 1) * period;
      column.items.forEach(item => {
        // A steady sway left and right within the column, never past its edges.
        const sway = (column.width - item.w) / 2 * Math.sin(i * 2.399);
        item.world = { x: x + column.width / 2 + sway, y: y + item.h / 2, angle: item.image ? 0 : (i % 3 - 1) * .13 };
        y += item.h + gap;
        i++;
      });
      x += column.width + GAP_X;
    });
    // A canvas smaller than the screen would show a piece twice, so it never repeats sooner than that.
    this.bounds = { width: Math.max(x - 32, W), height: Math.max(period, H) };
    this.camera = { x: 0, y: 0 };
    // The canvas opens centred on Weightless, in the part of it that is showing: on a phone the header row sits over
    // its top, so the middle is measured from below that.
    const start = items.find(item => item.image?.id === '16');
    if (start) {
      const head = document.querySelector('.phone-head');
      const covered = head && head.getClientRects().length
        ? Math.max(0, head.getBoundingClientRect().bottom - this.stage.element.getBoundingClientRect().top) : 0;
      const p = this.position(start);
      this.camera = { x: p.x - W / 2, y: p.y - (H + covered) / 2 };
    }
    this.target = { ...this.camera };
  }

  begin(e, item = null) {
    if (e.button !== 0) return;
    e.preventDefault();
    this.gesture = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, distance: 0, item, id: e.pointerId, time: performance.now() };
    this.stage.element.setPointerCapture(e.pointerId);
    this.stage.element.classList.add('panning');
  }

  move(e) {
    const g = this.gesture;
    if (!g || g.id !== e.pointerId) return;
    this.target.x -= e.clientX - g.x;
    this.target.y -= e.clientY - g.y;
    g.distance = Math.max(g.distance, Math.hypot(e.clientX - g.startX, e.clientY - g.startY));
    g.x = e.clientX; g.y = e.clientY;
  }

  end(activate = false) {
    const g = this.gesture;
    if (!g) return;
    if (this.stage.element.hasPointerCapture(g.id)) this.stage.element.releasePointerCapture(g.id);
    this.stage.element.classList.remove('panning');
    this.gesture = null;
    if (activate && g.distance < 7 && g.item) this.stage.activate(g.item);
  }

  update(dt) {
    if (!this.bounds) return;
    if (Math.abs(this.target.x - this.camera.x) < .01 && Math.abs(this.target.y - this.camera.y) < .01) return;
    const ease = this.stage.reduced ? 1 : 1 - Math.exp(-dt / 90);
    this.velocity.x = (this.target.x - this.camera.x) * ease;
    this.velocity.y = (this.target.y - this.camera.y) * ease;
    this.camera.x += this.velocity.x; this.camera.y += this.velocity.y;
    // Normalize the camera and its target together; wheel deltas never grow unbounded.
    for (const [axis, period] of [['x', this.bounds.width], ['y', this.bounds.height]]) {
      const shift = Math.floor(this.camera[axis] / period) * period;
      this.camera[axis] -= shift; this.target[axis] -= shift;
    }
    const position = `${Math.round(this.camera.x)},${Math.round(this.camera.y)}`;
    if (position !== this.lastPosition) { this.stage.element.dataset.camera = position; this.lastPosition = position; }
  }

  position(item) {
    return {
      x: wrap(item.world.x - this.camera.x + item.w / 2, this.bounds.width) - item.w / 2,
      y: wrap(item.world.y - this.camera.y + item.h / 2, this.bounds.height) - item.h / 2,
    };
  }

  shuffle() {
    this.items.forEach((item, i) => {
      gsap.to(item.world, { angle: item.world.angle + (i % 2 ? 1 : -1) * Math.PI * 2, duration: this.stage.reduced ? 0 : 1.3, ease: 'power3.inOut' });
    });
    this.target.x += this.stage.width * .6;
    this.target.y += this.stage.height * .5;
  }

  focus(item) {
    const p = this.position(item);
    this.target.x += p.x - this.stage.width / 2;
    this.target.y += p.y - this.stage.height / 2;
  }
}
