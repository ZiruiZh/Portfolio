import { arrowIcon } from './icons.js';
import Matter from 'matter-js';
import { gsap } from 'gsap';
import { LoopingCanvas } from './looping-canvas.js';
import { playgroundImages, playgroundImage } from './playground-gallery.js';
import { DESTINATIONS } from './experience-math.js';
import { DEFS } from './shapes.js';
import { makeRun, shapePalette } from './palette.js';
import { createEnclosure, containBody, SCULPTURE_MATERIAL } from './enclosure.js';

const artwork = import.meta.glob('../assets/shapes/*.svg', { query: '?raw', import: 'default', eager: true });
const { Engine, Bodies, Body, Composite, Constraint, Vertices, Sleeping, Query } = Matter;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class SculptureStage {
  constructor(element, reduced) {
    this.element = element;
    this.reduced = reduced;
    this.engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 10 });
    this.engine.gravity.y = 1.9;
    this.items = [];
    this.mode = 'home';
    this.palettes = DEFS.map(shapePalette);
    this.active = false;
    this.drag = null;
    this.accumulator = 0;
    this.last = 0;
    this.hovered = null;
    this.pointer = { x: 0, y: 0 };
    this.controller = new AbortController();
    const opts = { signal: this.controller.signal };
    window.addEventListener('pointermove', e => this.move(e), opts);
    window.addEventListener('pointerup', () => this.release(true), opts);
    window.addEventListener('pointercancel', () => this.release(), opts);
    window.addEventListener('blur', () => this.release(), opts);
    this.looping = new LoopingCanvas(this);
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  setMode(mode) {
    this.release();
    this.clearFocus();
    this.mode = mode;
    this.active = ['home', 'playground'].includes(mode);
    this.element.hidden = !this.active;
    this.element.tabIndex = mode === 'playground' ? 0 : -1;
    this.element.setAttribute('aria-label', mode === 'playground' ? 'Infinite canvas. Scroll or drag in any direction. Arrow keys pan.' : 'Interactive letter sculptures');
    if (this.active) {
      document.getElementById(mode).appendChild(this.element);
      this.build();
    }
  }

  build(animate = false) {
    this.release();
    this.clearFocus();
    this.items.forEach(item => { item.colorTween?.kill(); gsap.killTweensOf(item); });
    gsap.killTweensOf(this.items.map(item => item.el));
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.element.replaceChildren();
    this.items = [];
    this.hovered = null;
    this.navigating = false;
    this.accumulator = 0;
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    const W = this.width, H = this.height;
    this.walls = this.mode === 'home' ? createEnclosure(W, H) : [];
    Composite.add(this.engine.world, this.walls);
    const mobile = W < 600;
    const S = mobile ? Math.min(W / 1550, H * .28 / 662) : Math.min(W / 2830, H * .49 / 662);
    const lane = [.12, .305, .49, .70, .89];
    (this.mode === 'home' ? DEFS : []).forEach((def, i) => {
      const scale = this.mode === 'playground' ? Math.min(S, 280 / Math.max(def.w, def.h)) : S;
      const w = def.w * scale, h = def.h * scale;
      const el = document.createElement('div');
      el.className = 'piece';
      el.dataset.shape = def.key;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', this.mode === 'playground' ? `Animate sculpture ${i + 1}. Drag to pan.` : `Letter sculpture ${i + 1}. Drag to move, or press Enter to toss.`);
      el.innerHTML = artwork[`../assets/shapes/${def.key}.svg`];
      const svg = el.querySelector('svg');
      svg.setAttribute('aria-hidden', 'true');
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      this.element.appendChild(el);
      const vertices = def.hull.map(([x, y]) => ({ x: x * scale, y: y * scale }));
      const center = Vertices.centre(vertices);
      const x = mobile ? W * [.24, .67, .4, .78, .47][i] : clamp(W * lane[i], center.x + 5, W - (w - center.x) - 5);
      const settledY = mobile ? H - h * [.8, 1.45, 1.2, .8, .55][i] : H - h + center.y - (i === 1 ? H * .14 : i === 3 ? H * .10 : 12);
      const y = this.mode === 'home' && !this.reduced ? Math.min(H * (.2 + (i % 3) * .055), H - h - 70) + center.y : settledY;
      const body = Bodies.fromVertices(x, y, [vertices], {
        ...SCULPTURE_MATERIAL, label: `sculpture-${def.key}`,
      }, true);
      const item = { entrance: 1, svg, el, body, def, center, w, h, hover: 0, press: 0, offsets: [], index: i, destination: DESTINATIONS[def.key] };
      if (item.destination) {
        el.dataset.destination = item.destination;
        el.setAttribute('role', 'link');
        el.setAttribute('aria-label', `Open ${item.destination}. ${this.mode === 'playground' ? 'Drag to pan the canvas.' : 'Drag to move the shape.'}`);
        const label = document.createElement('span');
        label.className = 'shape-label';
        label.innerHTML = `${item.destination} ${arrowIcon()}`;
        el.appendChild(label);
      }
      item.layers = [...el.querySelectorAll('[data-fs],[data-ss]')];
      if (item.destination) {
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        base.setAttribute('width', def.w); base.setAttribute('height', def.h);
        svg.querySelector('g[mask]').prepend(base);
        item.hoverBase = base;
      }
      this.setPalette(item, this.palettes[i]);
      el.style.transformOrigin = `${center.x}px ${center.y}px`;
      el.addEventListener('pointerdown', e => this.grab(e, item));
      el.addEventListener('pointerenter', () => { this.hovered = item; });
      el.addEventListener('pointerleave', () => { if (!this.drag) this.hovered = null; });
      el.addEventListener('focus', () => { this.hovered = item; if (this.mode === 'playground') this.looping.focus(item); });
      el.addEventListener('blur', () => { this.hovered = null; });
      el.addEventListener('keydown', e => {
        if (item.destination && ['Enter',' '].includes(e.key)) { e.preventDefault(); this.activate(item); return; }
        if (this.mode === 'playground') { if (['Enter',' '].includes(e.key)) { e.preventDefault(); this.activate(item); } return; }
        if (['Enter', ' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          Sleeping.set(body, false);
          Body.setVelocity(body, { x: e.key === 'ArrowLeft' ? -7 : e.key === 'ArrowRight' ? 7 : 0, y: -11 });
          Body.setAngularVelocity(body, e.key === 'ArrowLeft' ? -.035 : .035);
          this.interacting = true;
        }
      });
      this.items.push(item);
      Composite.add(this.engine.world, body);
    });
    if (this.mode === 'playground') {
      this.addCircles();
      this.addImages();
      this.looping.layout(this.items);
      this.paint();
      return;
    }
    // Reduced motion opens at rest; otherwise gravity is visible after reveal.
    if (this.reduced) for (let step = 0; step < 300; step++) Engine.update(this.engine, 1000 / 120);
    this.addCircles();
    this.items.forEach(item => {
      Sleeping.set(item.body, true);
      this.constrain(item.body);
    });
    this.paint();
    if (!this.reduced) this.popIn();
  }

  addCircles() {
    const stageRect = this.element.getBoundingClientRect();
    const hero = document.querySelector('.hero-copy').getBoundingClientRect();
    const safeText = { left: hero.left - 75, right: hero.right + 75, top: hero.top - stageRect.top - 75, bottom: hero.bottom - stageRect.top + 75 };
    const count = 3 + Math.floor(Math.random() * 3);
    const base = Math.min(this.width, this.height);
    for (let i = 0; i < count; i++) {
      let diameter = Math.max(56, Math.min(290, base * (.09 + Math.random() * .19)));
      const existingBodies = this.items.map(item => item.body);
      let spawn = { x: this.width * ((i + .5) / count), y: this.height * .75 };
      if (this.mode === 'home') {
        let found = false;
        for (let attempt = 0; attempt < 5 && !found; attempt++) {
          const radius = diameter / 2;
          const candidates = [];
          for (let y = this.height - radius - 4; y >= radius + 4; y -= 24) {
            for (let x = radius + 4; x <= this.width - radius - 4; x += 24) candidates.push({ x, y });
          }
          // Keep natural variation, but prefer space below the copy.
          const offset = Math.floor(Math.random() * Math.max(1, candidates.length));
          const probe = Bodies.circle(0, 0, radius + 3);
          for (let n = 0; n < candidates.length; n++) {
            const point = candidates[(offset + n) % candidates.length];
            if (point.x + radius > safeText.left && point.x - radius < safeText.right && point.y + radius > safeText.top && point.y - radius < safeText.bottom) continue;
            Body.setPosition(probe, point);
            if (Query.collides(probe, existingBodies).length) continue;
            spawn = point; found = true; break;
          }
          if (!found) diameter *= .7;
        }
        if (!found) continue;
      }
      const r = diameter / 2;
      const layerCount = 4 + Math.floor(Math.random() * 3);
      const radii = [1];
      for (let n = 1; n < layerCount; n++) radii.push(radii[n - 1] * (.58 + Math.random() * .29));
      const el = document.createElement('div');
      el.className = 'piece ring-piece';
      el.style.cssText = `width:${diameter}px;height:${diameter}px;border-radius:50%;`;
      const colors = makeRun(layerCount, { allowWhite: true });
      colors.forEach((color, n) => {
        const ring = document.createElement('div');
        ring.className = 'ring-layer';
        const size = diameter * radii[n];
        ring.style.cssText = `position:absolute;border-radius:50%;width:${size}px;height:${size}px;left:${(diameter - size) / 2}px;top:${(diameter - size) / 2}px;background:${color};pointer-events:none;`;
        el.appendChild(ring);
      });
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Recolor circle ${i + 1}. ${this.mode === 'playground' ? 'Drag to pan.' : 'Drag to move.'}`);
      const body = Bodies.circle(spawn.x, spawn.y, r, { density: .008, friction: .65, frictionAir: .022, restitution: .16 });
      const item = { entrance: 1, el, body, center: { x: r, y: r }, w: diameter, h: diameter, layers: [], radii };
      el.addEventListener('pointerdown', e => this.grab(e, item));
      el.addEventListener('focus', () => { if (this.mode === 'playground') this.looping.focus(item); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.activate(item); } });
      this.element.appendChild(el);
      this.items.push(item);
      Composite.add(this.engine.world, body);
    }
  }

  addImages() {
    const baseSize = this.width < 600 ? clamp(this.width * .65, 210, 310) : clamp(this.width * .32, 340, 430);
    const sizeVariation = [1.1, .82, 1.32, .94, 1.2, .88, 1.26, 1.02];
    for (const image of playgroundImages) {
      const size = baseSize * sizeVariation[(Number(image.id) - 1) % sizeVariation.length];
      const scale = size / Math.max(image.width, image.height);
      const w = image.width * scale, h = image.height * scale;
      const el = document.createElement('div');
      el.className = 'piece playground-image'; el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-haspopup', 'dialog');
      el.setAttribute('aria-label', `View ${image.title}. Drag to pan.`);
      el.style.cssText = `width:${w}px;height:${h}px;transform-origin:center;`;
      const img = new Image();
      img.alt = image.title; img.width = image.width; img.height = image.height;
      img.decoding = 'async'; img.draggable = false;
      el.appendChild(img);
      const item = { image, el, img, w, h, center: { x: w / 2, y: h / 2 }, entrance: 1 };
      el.addEventListener('pointerdown', e => this.grab(e, item));
      el.addEventListener('focus', () => this.looping.focus(item));
      el.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); this.activate(item); } });
      this.element.appendChild(el); this.items.push(item);
    }
  }

  activate(item) {
    if (item.image) { this.onImageOpen?.(item); return; }
    if (!item.def) { this.extrudeCircle(item); return; }
    if (!item.destination) return;
    if (this.navigating) return;
    this.navigating = true;
    this.hovered = item;
    gsap.to(item, { press: 1, duration: this.reduced ? 0 : .2, ease: 'power3.in', onComplete: () => {
      this.navigating = false;
      item.press = 0;
      if (this.onNavigate) this.onNavigate(item.destination, item.outerColor);
      else location.hash = item.destination;
    } });
  }

  clearFocus() {
    document.body.classList.remove('shape-focus');
    this.items.forEach(item => item.el.classList.remove('shape-focused'));
    this.focusedShape = null;
    this.hovered = null;
  }

  extrudeCircle(item) {
    // Finish an interrupted color cycle before starting the next one.
    if (item.colorTween) { const previous = item.colorTween; previous.progress(1); previous.kill(); }
    const oldLayers = [...item.el.children];
    const colors = makeRun(item.radii.length, { allowWhite: true });
    if (this.reduced) {
      oldLayers.forEach((layer, i) => { layer.style.backgroundColor = colors[i]; });
      return;
    }
    const newLayers = oldLayers.map((layer, i) => {
      const next = layer.cloneNode();
      next.style.backgroundColor = colors[i];
      next.style.opacity = '1';
      item.el.appendChild(next);
      return next;
    });
    item.el.dataset.recoloring = 'true';
    item.colorTween = gsap.timeline({ onComplete: () => {
      oldLayers.forEach(layer => layer.remove());
      gsap.set(newLayers, { clearProps: 'transform,opacity' });
      delete item.el.dataset.recoloring;
      item.colorTween = null;
    } });
    // Opaque colors replace each other inside the fixed circular silhouette.
    item.colorTween.to(oldLayers, { scale: 2.4, duration: .42, stagger: .018, ease: 'power4.inOut' }, 0)
      .fromTo(newLayers, { scale: 0 }, { scale: 1, duration: .48, stagger: .026, ease: 'power4.inOut' }, .035);
  }

  setPalette(item, colors) {
    item.outerColor = colors[0];
    item.hoverBase?.setAttribute('fill', colors[0]);
    item.layers.forEach(el => {
      if (el.dataset.fs !== undefined) el.setAttribute('fill', colors[+el.dataset.fs]);
      if (el.dataset.ss !== undefined) el.setAttribute('stroke', colors[+el.dataset.ss]);
    });
  }

  remix() {
    this.palettes = DEFS.map(shapePalette);
    this.items.forEach(item => {
      if (item.def) this.setPalette(item, this.palettes[item.index]);
      else if (!item.image) {
        this.extrudeCircle(item);
      }
    });
  }

  scatter() {
    if (this.mode === 'playground') { this.looping.shuffle(); return; }
    this.items.forEach((item, i) => {
      Sleeping.set(item.body, false);
      Body.setVelocity(item.body, { x: (i % 2 ? 1 : -1) * 5, y: -13 - i % 3 * 2 });
      Body.setAngularVelocity(item.body, (i % 2 ? 1 : -1) * .055);
    });
    this.interacting = true;
  }

  popIn() {
    gsap.killTweensOf(this.items, 'entrance');
    if (this.mode === 'home' && !this.reduced) {
      this.items.forEach((item, i) => {
        item.entrance = 0;
        item.dropQueued = true;
        item.dropDelay = i / Math.max(1, this.items.length - 1) * 720;
        // Unrevealed shapes must not collide with ones already falling.
        Composite.remove(this.engine.world, item.body);
        Sleeping.set(item.body, true);
      });
      this.paint();
      return;
    }
    gsap.set(this.items, { entrance: this.reduced ? 1 : 0 });
    this.paint();
    if (!this.reduced) gsap.to(this.items, {
      entrance: 1, duration: .28, stagger: { amount: .72 }, ease: 'back.out(1.8)',
    });
  }

  reveal() { this.popIn(); }

  grab(e, item) {
    if (e.button !== 0) return;
    if (this.mode === 'playground') { this.looping.begin(e, item); return; }
    e.preventDefault();
    this.release();
    const rect = this.element.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    Sleeping.set(item.body, false);
    const constraint = Constraint.create({ pointA: point, bodyB: item.body,
      pointB: { x: point.x - item.body.position.x, y: point.y - item.body.position.y },
      stiffness: .12, damping: .28, length: 0 });
    Composite.add(this.engine.world, constraint);
    item.el.setPointerCapture(e.pointerId);
    item.el.classList.add('dragging');
    this.drag = { item, constraint, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, distance: 0 };
    this.hovered = item;
    this.interacting = true;
  }

  move(e) {
    if (this.mode === 'playground') this.looping.move(e);
    const rect = this.element.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (this.drag && this.drag.pointerId === e.pointerId) {
      this.drag.distance = Math.max(this.drag.distance, Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY));
      this.drag.constraint.pointA.x = clamp(this.pointer.x, 0, this.width);
      this.drag.constraint.pointA.y = clamp(this.pointer.y, 0, this.height);
    }
  }

  release(activate = false) {
    this.looping?.end(activate);
    if (!this.drag) return;
    const { item, constraint, pointerId, distance } = this.drag;
    Composite.remove(this.engine.world, constraint);
    item.el.classList.remove('dragging');
    if (item.el.hasPointerCapture(pointerId)) item.el.releasePointerCapture(pointerId);
    // Limit releases to keep fast gestures from tunneling through the enclosure.
    Body.setVelocity(item.body, { x: clamp(item.body.velocity.x, -20, 20), y: clamp(item.body.velocity.y, -20, 20) });
    this.drag = null;
    this.hovered = null;
    if (activate && distance < 7) this.activate(item);
  }

  constrain(body) {
    containBody(body, this.width, this.height);
  }

  paint() {
    const focus = this.hovered?.destination ? this.hovered : null;
    if (focus !== this.focusedShape) {
      this.focusedShape?.el.classList.remove('shape-focused');
      focus?.el.classList.add('shape-focused');
      document.body.classList.toggle('shape-focus', !!focus);
      if (focus) document.documentElement.style.setProperty('--shape-color', focus.outerColor);
      for (const item of this.items.filter(item => item.destination)) {
        gsap.to(item, { hover: item === focus ? 1 : 0, duration: this.reduced ? 0 : .2, ease: 'power3.inOut', overwrite: 'auto' });
      }
      this.focusedShape = focus;
    }
    this.items.forEach(item => {
      const { body, center, el } = item;
      const position = this.mode === 'playground' ? this.looping.position(item) : body.position;
      if (this.mode === 'playground' && this.parallax) { position.x += this.parallax.x; position.y += this.parallax.y; }
      if (item.image && !item.loaded && position.x > -item.w - 300 && position.x < this.width + item.w + 300 && position.y > -item.h - 300 && position.y < this.height + item.h + 300) {
        item.img.src = playgroundImage(item.image.id);
        item.loaded = true;
      }
      const angle = this.mode === 'playground' ? item.world.angle : body.angle;
      const transform = `translate3d(${(position.x - center.x).toFixed(2)}px,${(position.y - center.y).toFixed(2)}px,0) rotate(${angle.toFixed(4)}rad) scale(${((item.entrance ?? 1) * (1 + (item.pulse || 0))).toFixed(3)})`;
      if (transform !== item.lastTransform) { el.style.transform = transform; item.lastTransform = transform; }
      if (angle !== item.lastAngle) { el.style.setProperty('--counter-angle', `${-angle}rad`); item.lastAngle = angle; }
      if (!item.destination) return;
      if (item.hover === item.lastHover && item.press === item.lastPress) return;
      item.lastHover = item.hover; item.lastPress = item.press;
      const svg = item.svg;
      const p = item.press;
      svg.style.transform = `scale(${1 - p * .12})`;
      item.layers.forEach(layer => {
        const slot = +(layer.dataset.fs ?? layer.dataset.ss);
        const collapse = slot === 0 ? 0 : Math.min(1, item.hover * (1 + slot * .12));
        layer.style.transformOrigin = `${item.def.ox}px ${item.def.oy}px`;
        layer.style.transform = `scale(${1 - collapse})`;
      });
    });
  }

  frame(time) {
    const frameStart = performance.now();
    const delta = Math.min(time - this.last || 16, 50);
    this.last = time;
    if (this.active && !document.hidden) {
      let moving = false;
      if (this.mode === 'home') for (const item of this.items) {
        if (!item.dropQueued) continue;
        item.dropDelay -= delta;
        if (item.dropDelay > 0) continue;
        item.dropQueued = false;
        Composite.add(this.engine.world, item.body);
        Sleeping.set(item.body, false);
        gsap.to(item, { entrance: 1, duration: .28, ease: 'back.out(1.8)' });
      }
      if (this.mode === 'playground') this.looping.update(delta);
      else if ((!this.reduced || this.interacting) && (this.drag || this.items.some(item => !item.body.isSleeping))) {
        moving = true;
        this.accumulator += delta;
        const step = 1000 / 120;
        while (this.accumulator >= step) {
          Engine.update(this.engine, step);
          this.items.forEach(item => this.constrain(item.body));
          this.accumulator -= step;
        }
      }
      this.paint();
      this.onFrame?.(time, moving);
    }
    if (import.meta.env.DEV && this.active) {
      const stats = this.stats ||= { frames: 0, work: 0, start: time };
      stats.frames++; stats.work += performance.now() - frameStart;
      if (time - stats.start > 2000) {
        this.element.dataset.performance = JSON.stringify({ fps: Math.round(stats.frames * 1000 / (time - stats.start)), stageMs: +(stats.work / stats.frames).toFixed(2) });
        this.stats = { frames: 0, work: 0, start: time };
      }
    }
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.release();
    this.clearFocus();
    this.items.forEach(item => item.colorTween?.kill());
    cancelAnimationFrame(this.raf);
    this.controller.abort();
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
