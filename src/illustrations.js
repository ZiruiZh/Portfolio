import { gsap } from 'gsap';
import { projectImage } from './projects.js';
import scenes from './illustration-layers.json';

// Each illustration is cut into small images (scripts/generate-zeen-illustrations.py), so that
// moving a piece only moves an image. Sizes below are in the units of the original artwork.
// A move is written as where a piece starts: it always lands where the artwork has it.
function stage(name, parts) {
  const { w: width, h: height } = scenes[name];
  const part = key => parts[key].node;
  const shift = (key, dx, dy) => ({ xPercent: dx / parts[key].w * 100, yPercent: dy / parts[key].h * 100 });
  const origin = (key, x, y) => `${(x - parts[key].x) / parts[key].w * 100}% ${(y - parts[key].y) / parts[key].h * 100}%`;
  const centre = key => origin(key, parts[key].x + parts[key].w / 2, parts[key].y + parts[key].h / 2);
  const home = { xPercent: 0, yPercent: 0 };
  const timeline = gsap.timeline({ paused: true });

  // Slides a piece in from an offset, landing on its place in the artwork.
  const slide = (key, dx, dy, duration, ease, at) =>
    timeline.fromTo(part(key), shift(key, dx, dy), { ...home, duration, ease }, at);
  // Scales a piece up from nothing, as if it pops out of the page.
  const pop = (key, duration, ease, at) => {
    gsap.set(part(key), { transformOrigin: centre(key) });
    timeline.fromTo(part(key), { scale: 0 }, { scale: 1, duration, ease }, at);
  };

  const moves = {
    // The zines fly in from beyond the frame until they settle around the question.
    digital() {
      ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'].forEach((key, index) => {
        gsap.set(part(key), { transformOrigin: origin(key, width / 2, height / 2) });
        timeline.fromTo(part(key), { scale: 2.4 }, { scale: 1, duration: 1.2, ease: 'power3.out' }, index * .07);
      });
    },
    // The two shapes drift smoothly into their corners.
    glorified() {
      slide('corner-start', -240, -190, 1.5, 'power2.out', 0);
      slide('corner-end', 260, 210, 1.5, 'power2.out', .1);
    },
    // Each cut and fold line snaps in along its own direction, while the scissors cut three times.
    create() {
      ['line1', 'line2', 'line3', 'line4', 'line5', 'line6'].forEach((key, index) =>
        slide(key, parts[key].dx, parts[key].dy, .32, 'back.out(1.5)', index * .07));
      [['scissors-a', -12], ['scissors-b', 12]].forEach(([key, rotation]) => {
        gsap.set(part(key), { transformOrigin: origin(key, ...parts[key].pivot) });
        [0, 1, 2].forEach(snap => {
          const at = .1 + snap * .24;
          timeline.to(part(key), { rotation, duration: .09, ease: 'power3.in' }, at);
          timeline.to(part(key), { rotation: 0, duration: .15, ease: 'power2.out' }, at + .09);
        });
      });
    },
    // Not in the brief: its pieces simply slide into place.
    flatten() {
      slide('export', -420, 0, .8, 'power3.out', 0);
      slide('zine', 0, 340, .8, 'power3.out', .1);
      slide('page', 460, 0, .8, 'power3.out', .2);
    },
    // The zine opens like an accordion, then the cut line draws across from its first dot.
    interactive() {
      const panels = ['panel1', 'panel2', 'panel3', 'panel4', 'panel5'];
      const hinge = parts.panel1.x;
      gsap.set(part('line'), { clipPath: 'inset(-10% 100% -10% 0%)' });
      panels.forEach(key => {
        gsap.set(part(key), { transformOrigin: origin(key, parts[key].x, parts[key].y) });
        timeline.fromTo(part(key), { ...shift(key, hinge - parts[key].x, 0), scaleX: .02 },
          { ...home, scaleX: 1, duration: 1, ease: 'power2.inOut' }, 0);
      });
      timeline.fromTo(part('shadow'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .6 }, .4);
      pop('start', .25, 'back.out(2.5)', 1);
      timeline.to(part('line'), { clipPath: 'inset(-10% 0% -10% 0%)', duration: .9, ease: 'power1.inOut' }, 1.15);
      pop('end', .25, 'back.out(2.5)', 1.95);
      pop('cursor', .25, 'back.out(2.5)', 2);
    },
    // Everything slides into view from its nearest side.
    creative() {
      slide('paper', 0, 300, .8, 'power3.out', 0);
      slide('squiggle', 0, -130, .7, 'power3.out', .1);
      slide('photo', 280, 0, .8, 'power3.out', .15);
      slide('tape1', 0, -220, .7, 'power3.out', .3);
      slide('tape2', 120, -220, .7, 'power3.out', .35);
      slide('sticker', -180, 0, .7, 'power3.out', .25);
      ['letter-z', 'letter-e', 'letter-e2', 'letter-n'].forEach((key, index) =>
        slide(key, 0, 180, .6, 'power3.out', .35 + index * .07));
    },
    // The booklet slides in from the right, then its top right zine pops out of the sleeve.
    collect() {
      const travel = width - parts.sheet.x + 20;
      const pocket = shift('zine', 0, 30).yPercent; // it starts tucked into its sleeve
      slide('sheet', travel, 0, 1, 'power3.out', 0);
      slide('sleeves', travel, 0, 1, 'power3.out', 0);
      timeline.fromTo(part('zine'), { ...shift('zine', travel, 0), yPercent: pocket }, { xPercent: 0, yPercent: pocket, duration: 1, ease: 'power3.out' }, 0);
      timeline.fromTo(part('star'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, .6);
      timeline.fromTo(part('dot'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, .7);
      timeline.to(part('zine'), { yPercent: 0, duration: .4, ease: 'back.out(3)' }, 1.1);
      ['spark1', 'spark2', 'spark3'].forEach((key, index) => pop(key, .22, 'back.out(3)', 1.35 + index * .04));
    },
    // The shutters swing open from closed over the window, and the bubbles pop out.
    accessible() {
      const closed = { 'shutter-left': -2.5, 'shutter-right': -2.4 };
      gsap.set(part('shutter-left'), { transformOrigin: '100% 50%' });
      gsap.set(part('shutter-right'), { transformOrigin: '0% 50%' });
      Object.entries(closed).forEach(([key, scaleX]) =>
        timeline.fromTo(part(key), { scaleX }, { scaleX: 1, duration: .45, ease: 'back.out(1.3)' }, 0));
      ['bubble1', 'bubble2', 'bubble3', 'star', 'bubble4', 'bubble5'].forEach((key, index) =>
        pop(key, .28, 'back.out(3)', .32 + index * .07));
    },
  };
  moves[name]();
  return timeline;
}

const settle = 'case-anim--settled';
// The small "Zines should be..." cards run faster than the wide illustrations.
const speeds = { interactive: 3, creative: 3, collect: 3, accessible: 3 };

// An illustration that plays once when it comes into view, then rests as the finished artwork.
// The dithered artwork fades in over the moving pieces at the end, and the pieces are let go.
export function installIllustration(node, name) {
  const scene = scenes[name];
  const speed = speeds[name] ?? 1;
  const parts = {};
  const pieces = scene.layers.map(layer => {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'sync'; // A piece must be ready to draw on the frame it first moves.
    img.style.cssText = `left:${layer.x / scene.w * 100}%;top:${layer.y / scene.h * 100}%;width:${layer.w / scene.w * 100}%;height:${layer.h / scene.h * 100}%`;
    parts[layer.name] = { ...layer, node: img };
    return img;
  });
  const final = node.querySelector('.case-anim-final');
  node.style.aspectRatio = `${scene.w} / ${scene.h}`;
  node.prepend(...pieces);

  let timeline, ready, inView = false, played = false;
  const finish = () => {
    node.classList.add(settle);
    gsap.fromTo(final, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5 / speed, ease: 'power1.inOut', onComplete: () => pieces.forEach(piece => piece.remove()) });
  };
  const play = () => {
    if (played || !inView || !timeline) return;
    played = true;
    near.disconnect();
    view.disconnect();
    timeline.eventCallback('onComplete', finish).timeScale(speed).play();
  };
  const near = new IntersectionObserver(entries => {
    if (ready || !entries.some(entry => entry.isIntersecting)) return;
    ready = true;
    Promise.all(pieces.map((piece, index) => new Promise((loaded, failed) => {
      piece.onload = loaded;
      piece.onerror = failed;
      piece.src = projectImage(scene.layers[index].file);
    }))).then(() => {
      timeline = stage(name, parts);
      node.classList.add('case-anim--ready');
      play();
    }).catch(() => { played = true; finish(); }); // The finished artwork stands in if a piece fails to load.
  }, { rootMargin: '700px 0px' });
  const view = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    play();
  }, { threshold: .35 });
  near.observe(node);
  view.observe(node);
  return () => { near.disconnect(); view.disconnect(); timeline?.kill(); };
}
