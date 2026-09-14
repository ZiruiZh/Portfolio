import { gsap } from 'gsap';
import { proximity } from './experience-math.js';

export class TextReactions {
  constructor(stage, reduced) {
    this.stage = stage;
    this.reduced = reduced;
    this.pointer = { x: -1000, y: -1000 };
    this.targets = [];
    window.addEventListener('pointermove', e => { this.pointer = { x: e.clientX, y: e.clientY }; }, { signal: stage.controller.signal });
    document.addEventListener('pointerleave', () => { this.pointer = { x: -1000, y: -1000 }; }, { signal: stage.controller.signal });
    stage.onFrame = () => this.update();
  }

  measure() {
    if (this.stage.mode !== 'home') return;
    this.targets.forEach(target => gsap.killTweensOf(target.impact));
    this.dirty = true;
    this.targets = [...document.querySelectorAll('.name .letter:not(.space), .hero-line .text-word')].map(el => {
      const impact = el.querySelector('.text-impact');
      return { rect: el.getBoundingClientRect(), impact,
        y: gsap.quickTo(impact, 'y', { duration: .25, ease: 'elastic.out(1,.45)' }),
        rotation: gsap.quickTo(impact, 'rotation', { duration: .2, ease: 'power3.out' }),
        scale: gsap.quickTo(impact, 'scaleY', { duration: .25, ease: 'elastic.out(1,.45)' }), value: -1 };
    });
  }

  update(time = performance.now()) {
    if (this.stage.mode !== 'home' || time - (this.lastUpdate || 0) < 32) return;
    if (!this.dirty && this.lastX === this.pointer.x && this.lastY === this.pointer.y) return;
    this.lastUpdate = time; this.lastX = this.pointer.x; this.lastY = this.pointer.y; this.dirty = false;
    for (const target of this.targets) {
      const rect = target.rect;
      const strength = this.reduced ? 0 : proximity(this.pointer, rect, 100);
      const direction = this.pointer.x - (rect.left + rect.width / 2);
      if (Math.abs(strength - target.value) < .01) continue;
      target.value = strength;
      target.y(-strength * 11);
      target.rotation(Math.sign(direction) * strength * 4);
      target.scale(1 + strength * .09);
    }
  }
}
