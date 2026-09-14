import { gsap } from 'gsap';

// A single composited tile replaces a full-screen WebGL draw on every frame.
export class PlaygroundBackground {
  constructor(reducedQuery) {
    this.reducedQuery = reducedQuery;
    this.el = document.createElement('div');
    this.el.className = 'playground-grid';
    this.el.setAttribute('aria-hidden', 'true');
    document.getElementById('playground').prepend(this.el);
    this.camera = { x: 0, y: 0 };
    this.pointer = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0 };
    this.last = '';
    this.moveX = gsap.quickTo(this.offset, 'x', { duration: .35, ease: 'power3.out', onUpdate: () => this.paint() });
    this.moveY = gsap.quickTo(this.offset, 'y', { duration: .35, ease: 'power3.out', onUpdate: () => this.paint() });
    this.controller = new AbortController();
    window.addEventListener('pointermove', e => {
      if (!this.active || reducedQuery.matches || e.pointerType === 'touch') return;
      this.moveX((e.clientX / innerWidth - .5) * 28);
      this.moveY((e.clientY / innerHeight - .5) * 28);
    }, { passive: true, signal: this.controller.signal });
  }
  setMode(mode) { this.active = mode === 'playground'; this.el.hidden = !this.active; }
  pan(x, y) { this.camera.x = x; this.camera.y = y; this.paint(); }
  paint() {
    if (!this.active) return;
    const x = (-this.camera.x * .25 % 48) + this.offset.x;
    const y = (-this.camera.y * .25 % 48) + this.offset.y;
    const transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    if (transform !== this.last) { this.el.style.transform = transform; this.last = transform; }
  }
  dispose() { this.controller.abort(); gsap.killTweensOf(this.offset); this.el.remove(); }
}
