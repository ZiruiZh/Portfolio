import { gsap } from 'gsap';
import { initialOrientation, screenRotate, matrix } from './cube-math.js';

const photos = [
  ['img_9101', 'Zirui beside a research poster at a conference'],
  ['img_0133', 'A group at a campus art table'],
  ['img_5391', 'Egloo design presentation with teammates'],
  ['img_4147', 'University of Waterloo student card portrait'],
  ['img_7200', 'Team photo behind a project display'],
  ['on-stage', 'Zirui performing on stage under spotlights'],
];
const assets = import.meta.glob('../assets/about/*.webp', { query: '?url', import: 'default', eager: true });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class AboutCube {
  constructor(host, reducedQuery) {
    this.host = host; this.reducedQuery = reducedQuery;
    this.active = false; this.visible = false; this.orientation = initialOrientation();
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    host.classList.add('about-cube');
    host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Photos of Zirui');
    host.innerHTML = `<div class="cube-stage" tabindex="0" role="group" aria-label="Interactive photo cube. Drag to rotate. Arrow keys turn the cube; Home resets the view. Hold Space to pause rotation."><div class="cube-shadow" aria-hidden="true"></div><div class="cube-tilt"><div class="photo-cube"></div></div></div>`;
    this.stage = host.querySelector('.cube-stage'); this.rotor = host.querySelector('.photo-cube');
    this.cards = photos.map(([file, alt], i) => {
      const face = document.createElement('figure'); face.className = `cube-face cube-face-${i}`;
      const image = new Image(); image.alt = alt; image.decoding = 'async'; image.draggable = false;
      image.dataset.src = assets[`../assets/about/${file}.webp`];
      face.appendChild(image); this.rotor.appendChild(face);
      return face;
    });
    this.render();
    this.spinVelocity = { x: 3, y: 14 };
    this.spin = (_time, deltaTime) => {
      const dt = Math.min(deltaTime, 40) / 1000;
      this.orientation = screenRotate(this.orientation, dt * this.spinVelocity.x, dt * this.spinVelocity.y);
      this.render();
    };
    this.stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !this.active) return;
      e.preventDefault(); this.interact(); this.motion?.kill();
      this.stage.focus({ preventScroll: true });
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp, vx: 0, vy: 0 };
      this.stage.setPointerCapture(e.pointerId); this.stage.classList.add('is-dragging');
    }, options);
    this.stage.addEventListener('pointermove', e => this.pointer(e), options);
    this.stage.addEventListener('pointerup', e => this.release(e), options);
    this.stage.addEventListener('pointercancel', e => this.release(e, false), options);
    this.stage.addEventListener('lostpointercapture', () => { if (this.drag) { this.cancelDrag(); this.interact(); } }, options);
    this.stage.addEventListener('pointerenter', () => this.interact(), options);
    window.addEventListener('blur', () => this.stopMotion(), options);
    window.addEventListener('focus', () => this.interact(), options);
    this.stage.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', ' '].includes(e.key)) return;
      e.preventDefault(); this.interact(); this.cancelDrag();
      if (e.key === ' ') { this.paused = true; return; }
      if (e.key === 'Home') { this.motion?.kill(); this.orientation = initialOrientation(); this.render(); return; }
      this.rotate(e.key === 'ArrowUp' ? 90 : e.key === 'ArrowDown' ? -90 : 0,
        e.key === 'ArrowLeft' ? -90 : e.key === 'ArrowRight' ? 90 : 0);
    }, options);
    this.stage.addEventListener('keyup', e => { if (e.key === ' ') { this.paused = false; this.interact(); } }, options);
    this.stage.addEventListener('blur', () => { this.paused = false; this.interact(); }, options);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && this.entryPending) this.startIdleSpin();
      else if (this.visible) this.interact();
      else this.stopMotion();
    }, { threshold: .05 });
    this.observer.observe(host);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopMotion(); else this.interact(); }, options);
    reducedQuery.addEventListener('change', () => { this.stopMotion(); this.interact(); }, options);
  }

  render() { this.rotor.style.transform = `matrix3d(${matrix(this.orientation).join(',')})`; }

  startIdleSpin() {
    clearTimeout(this.idleTimer);
    if (!this.active || !this.visible || document.hidden || this.reducedQuery.matches || this.drag || this.paused) return;
    this.entryPending = false;
    this.motion?.kill(); this.spinTween?.kill(); gsap.ticker.remove(this.spin);
    this.stage.dataset.idle = 'true'; this.stage.dataset.spin = 'burst';
    this.spinVelocity.x = 90; this.spinVelocity.y = 540;
    gsap.ticker.add(this.spin);
    this.spinTween = gsap.to(this.spinVelocity, { x: 3, y: 14, duration: 2.8, ease: 'power2.out',
      onComplete: () => { this.stage.dataset.spin = 'cruise'; } });
  }

  interact() {
    clearTimeout(this.idleTimer); gsap.ticker.remove(this.spin); this.spinTween?.kill();
    this.stage.dataset.idle = 'false'; this.stage.dataset.spin = 'paused';
    if (!this.active || !this.visible || document.hidden || this.reducedQuery.matches) return;
    this.idleTimer = setTimeout(() => this.startIdleSpin(), 2000);
  }

  pointer(e) {
    if (!this.active) return;
    this.interact();
    if (this.drag?.id !== e.pointerId) return;
    const g = this.drag, dt = Math.max(8, e.timeStamp - g.time);
    const dx = (e.clientX - g.x) * .45, dy = -(e.clientY - g.y) * .45;
    g.vx = clamp(dy / dt, -.65, .65); g.vy = clamp(dx / dt, -.65, .65);
    g.x = e.clientX; g.y = e.clientY; g.time = e.timeStamp;
    this.orientation = screenRotate(this.orientation, dy, dx); this.render();
  }

  release(e, momentum = true) {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    this.cancelDrag(); this.interact();
    const glide = momentum && !this.reducedQuery.matches && e.timeStamp - drag.time < 100 ? 130 : 0;
    this.rotate(drag.vx * glide, drag.vy * glide);
  }

  cancelDrag() {
    const drag = this.drag; this.drag = null;
    if (drag && this.stage.hasPointerCapture(drag.id)) this.stage.releasePointerCapture(drag.id);
    this.stage.classList.remove('is-dragging');
  }

  rotate(x, y) {
    this.motion?.kill();
    const start = [...this.orientation], progress = { value: 0 };
    this.motion = gsap.to(progress, { value: 1, duration: this.reducedQuery.matches ? 0 : .42, ease: 'power3.out',
      onUpdate: () => { this.orientation = screenRotate(start, x * progress.value, y * progress.value); this.render(); } });
  }

  stopMotion() {
    clearTimeout(this.idleTimer); gsap.ticker.remove(this.spin); this.spinTween?.kill();
    this.stage.dataset.idle = 'false'; this.stage.dataset.spin = 'paused';
    this.cancelDrag(); this.motion?.kill(); this.paused = false;
  }

  setMode(page) {
    this.active = page === 'about';
    if (this.active) {
      this.cards.forEach(face => { const img = face.firstElementChild; if (!img.getAttribute('src')) img.src = img.dataset.src; });
      this.entryPending = true;
      if (this.visible) this.startIdleSpin();
    } else this.stopMotion();
  }

  dispose() {
    this.stopMotion(); this.controller.abort(); this.observer.disconnect(); this.host.replaceChildren();
  }
}
