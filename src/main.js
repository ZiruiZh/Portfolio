import { installLinkGlide } from './link-motion.js';
import './style.css';
import { gsap } from 'gsap';
import { SculptureStage } from './physics.js';
import { projects, projectImage, projectVideo } from './projects.js';
import { TextReactions } from './text-reactions.js';
import { installCursor } from './cursor.js';
import { PlaygroundBackground } from './playground-background.js';
import { installPlaygroundGallery } from './playground-gallery.js';
import { AboutCube } from './about-cube.js';
import { installWork } from './work.js';
import { makeRun } from './palette.js';
import { makeAccent } from './experience-math.js';

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
let accentHue = Math.floor(Math.random() * 360);
function refreshAccent(shapeColor) {
  // Advance by at least 45 degrees so consecutive routes always look different.
  accentHue = (accentHue + 45 + Math.floor(Math.random() * 270)) % 360;
  const color = shapeColor || makeAccent(() => accentHue / 360);
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--shape-color', color);
}
const introAccents = ['#FF3899', '#CDFF00', '#FF5934', '#FFBE00', '#AC80FF', '#00FFD0', '#F0FF00'];
refreshAccent(introAccents[Math.floor(Math.random() * introAccents.length)]);
const removeCursor = installCursor(reducedQuery);
const resumeURL = new URL('../assets/resume.pdf', import.meta.url).href;
document.querySelectorAll('.resume-link, [data-resume-link]').forEach(link => { link.href = resumeURL; });
const pages = ['home', 'work', 'playground', 'about'];
let current = 'home';
let transition;
let pendingShapeTheme = null;
const sculptures = new SculptureStage(document.getElementById('stage'), reduced);
const gallery = installPlaygroundGallery(sculptures, reducedQuery);
const work = installWork({ reducedQuery, openProject, openImage: gallery.open });
const visuals = new PlaygroundBackground(reducedQuery);
// Both layers read the same eased offset; pointer parallax cannot drift apart.
sculptures.parallax = visuals.offset;
sculptures.onNavigate = (page, color) => {
  if (page === pageFromHash()) { refreshAccent(color); return; }
  pendingShapeTheme = { page, color };
  location.hash = page;
};
const aboutCube = new AboutCube(document.querySelector('.about-portraits'), reducedQuery);

function renderArt(target, key) {
  const project = projects[key];
  const image = document.createElement('img');
  image.className = 'project-image';
  image.src = projectImage(project.images[0].file);
  image.alt = project.images[0].caption;
  image.width = project.images[0].width;
  image.height = project.images[0].height;
  image.decoding = 'async';
  target.replaceChildren(image);
}

function applyPage(page, focus = false) {
  stopHeroReveal();
  current = page;
  document.body.dataset.page = page;
  document.querySelectorAll('.page').forEach(el => { el.hidden = el.id !== page; });
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = 'Zirui Zhao';
  sculptures.setMode(page);
  visuals?.setMode(page);
  aboutCube.setMode(page);
  textReactions.measure();
  window.scrollTo({ top: 0, behavior: 'instant' });
  work.setMode(page);
  if (page === 'home' && introFinished) revealHome(!reduced);
  if (focus) {
    const heading = document.querySelector(`#${page} h1`);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function navigate(page, animate = true) {
  if (!pages.includes(page)) page = 'home';
  if (!introFinished) finishIntro();
  if (transition) transition.kill();
  const wipe = document.querySelector('.route-wipe');
  if (page === current) {
    gsap.set(wipe, { scaleY: 0 });
    gsap.set('.page h1', { clearProps: 'transform,opacity' });
    return;
  }
  const shapeColor = pendingShapeTheme?.page === page ? pendingShapeTheme.color : undefined;
  pendingShapeTheme = null;
  refreshAccent(shapeColor);
  if (reduced || !animate) { gsap.set(wipe, { scaleY: 0 }); applyPage(page, true); return; }
  transition = gsap.timeline()
    .set(wipe, { transformOrigin: 'bottom', scaleY: 0 })
    .to(wipe, { scaleY: 1, duration: .18, ease: 'power3.inOut' })
    .call(() => applyPage(page, true))
    .set(wipe, { transformOrigin: 'top' })
    .to(wipe, { scaleY: 0, duration: .25, ease: 'power3.inOut' })
    .fromTo(`#${page} h1`, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=.16')
    .call(() => textReactions.measure());
}

function pageFromHash() {
  const hash = location.hash.slice(1);
  return hash === 'top' || !pages.includes(hash) ? 'home' : hash;
}
window.addEventListener('hashchange', () => navigate(pageFromHash()));
document.querySelector('.skip-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('main').focus({ preventScroll: true }); });
document.getElementById('reset-home').addEventListener('click', () => sculptures.build(!reduced));
document.getElementById('reset-play').addEventListener('click', () => sculptures.build(!reduced));
document.getElementById('remix').addEventListener('click', () => sculptures.remix());

// A character responds to proximity without making the heading look like a link.
const name = document.querySelector('.name');
name.innerHTML = [...name.textContent].map(char => char === ' ' ? '<span class="letter space"> </span>' : `<span class="letter"><span class="text-impact">${char}</span></span>`).join('');
document.querySelectorAll('.hero-line').forEach(line => {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(word => {
      if (!word.trim()) {
        const space = document.createElement('span');
        space.className = 'text-space';
        space.setAttribute('aria-hidden', 'true');
        space.textContent = ' ';
        fragment.appendChild(space);
      } else {
        const span = document.createElement('span');
        span.className = 'text-word';
        const impact = document.createElement('span');
        impact.className = 'text-impact';
        impact.setAttribute('aria-hidden', 'true');
        const readable = document.createElement('span');
        readable.className = 'sr-only';
        readable.textContent = word;
        // Individual characters type on without changing the final word wrapping.
        for (const char of word) {
          const letter = document.createElement('span');
          letter.className = 'typed-char';
          letter.textContent = char;
          impact.appendChild(letter);
        }
        span.append(readable, impact);
        fragment.appendChild(span);
      }
    });
    node.replaceWith(fragment);
  });
});
const textReactions = new TextReactions(sculptures, reduced);
sculptures.onFrame = (time, moving) => {
  textReactions.update(time, moving);
  if (sculptures.mode === 'playground') visuals?.pan(sculptures.looping.camera.x, sculptures.looping.camera.y);
};

const projectKeys = Object.keys(projects);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) dialog.querySelectorAll('video').forEach(video => video.pause());
});

const dialog = document.getElementById('project-dialog');
let activeProjectKey = null;
let projectOpener = null;
function openProject(key) {
  dialog.querySelectorAll('video').forEach(video => video.pause());
  const wasOpen = dialog.open;
  if (!wasOpen) projectOpener = document.activeElement;
  activeProjectKey = key;
  const project = projects[key];
  const index = projectKeys.indexOf(key);
  document.querySelector('.project-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(projectKeys.length).padStart(2, '0')} · ${project.title}`;
  document.getElementById('previous-project').title = projects[projectKeys[(index - 1 + projectKeys.length) % projectKeys.length]].title;
  document.getElementById('next-project').title = projects[projectKeys[(index + 1) % projectKeys.length]].title;
  document.getElementById('dialog-title').textContent = project.title;
  document.getElementById('dialog-category').textContent = project.category;
  document.getElementById('dialog-description').textContent = project.description;
  renderArt(document.getElementById('dialog-art'), key);
  const meta = document.getElementById('dialog-meta');
  meta.replaceChildren(...Object.entries(project.metadata).map(([label, value]) => {
    const group = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = label === 'My Role' ? 'Role' : label;
    const description = document.createElement('dd'); description.textContent = value;
    group.append(term, description); return group;
  }));
  document.getElementById('dialog-gallery').replaceChildren(...project.images.slice(1).map(image => {
    const figure = document.createElement('figure');
    const link = document.createElement('a'); link.href = projectImage(image.file); link.target = '_blank'; link.rel = 'noopener';
    link.setAttribute('aria-label', `View full image: ${image.caption}`);
    const img = document.createElement('img'); img.src = link.href; img.alt = image.caption;
    img.width = image.width; img.height = image.height; img.loading = 'lazy'; img.decoding = 'async';
    const caption = document.createElement('figcaption'); caption.textContent = image.caption;
    link.appendChild(img); figure.append(link, caption); return figure;
  }));
  if (project.walkthrough) {
    const figure = document.createElement('figure');
    figure.className = 'project-walkthrough';
    const video = document.createElement('video');
    video.src = projectVideo(project.walkthrough);
    video.poster = projectImage(project.cover);
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', 'PRISM Collective website walkthrough');
    const caption = document.createElement('figcaption');
    caption.textContent = 'Full PRISM Collective website walkthrough';
    figure.append(video, caption);
    document.getElementById('dialog-gallery').prepend(figure);
  }
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0;
 
  document.dispatchEvent(new Event('portfolio:dialog-open'));
  gsap.killTweensOf(dialog);
  if (!reduced && !wasOpen) gsap.fromTo(dialog, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: .3, clearProps: 'transform,opacity' });
  else gsap.set(dialog, { clearProps: 'transform,opacity' });
}
function stepProject(direction) {
  if (!dialog.open || !activeProjectKey) return;
  const index = projectKeys.indexOf(activeProjectKey);
  openProject(projectKeys[(index + direction + projectKeys.length) % projectKeys.length]);
}
document.getElementById('previous-project').addEventListener('click', () => stepProject(-1));
document.getElementById('next-project').addEventListener('click', () => stepProject(1));
dialog.addEventListener('keydown', e => {
  if (e.target.closest('video')) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault(); e.stopPropagation(); stepProject(e.key === 'ArrowLeft' ? -1 : 1);
});
dialog.addEventListener('close', () => {
  dialog.querySelectorAll('video').forEach(video => video.pause());
  if (projectOpener?.isConnected) projectOpener.focus({ preventScroll: true });
  activeProjectKey = null;
});
document.getElementById('close-project').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });

let introFinished = false;
let introTimeline;
let introFailsafe;
let heroTimeline;
const heroAnimated = '.hero-copy, .name .letter, .chinese, .hero-line, .text-word, .typed-char';

function stopHeroReveal() {
  heroTimeline?.kill();
  heroTimeline = null;
  gsap.set(heroAnimated, { clearProps: 'opacity,visibility,transform,clipPath' });
  document.querySelector('.hero-copy').inert = false;
  delete document.body.dataset.homeReveal;
}

function revealHome(animate = true) {
  stopHeroReveal();
  if (current !== 'home') return;
  sculptures.active = true;
  if (!animate || reduced) { textReactions.measure(); return; }
  sculptures.reveal();
  document.body.dataset.homeReveal = 'shapes';
  document.querySelector('.hero-copy').inert = true;
  gsap.set('.hero-copy', { autoAlpha: 0 });
  gsap.set('.name .letter', { yPercent: 115, xPercent: -18, rotation: -5 });
  gsap.set('.chinese', { autoAlpha: 0, x: -18 });
  gsap.set('.text-word', { y: 5, x: 0, rotation: 0 });
  gsap.set('.typed-char', { autoAlpha: 0, yPercent: 25, scaleX: 1, scaleY: .94, rotation: 0 });
  const subtitles = [...document.querySelectorAll('.hero-line')];
  heroTimeline = gsap.timeline({ onComplete: () => {
    stopHeroReveal();
    textReactions.measure();
  } });
  // Start the text as the last shapes pop in, without a separate pause.
  heroTimeline.call(() => { document.body.dataset.homeReveal = 'text'; }, [], .72)
    .set('.hero-copy', { autoAlpha: 1 }, .72)
    .to('.name .letter', { yPercent: 0, xPercent: 0, rotation: 0, duration: .65, stagger: .035, ease: 'power4.out' }, .72)
    .to('.chinese', { autoAlpha: 1, x: 0, duration: .45, ease: 'power3.out' }, .95);
  let nextLine = .88;
  subtitles.forEach(line => {
    let characterOffset = 0;
    line.querySelectorAll('.text-word').forEach(word => {
      const letters = word.querySelectorAll('.typed-char');
      const start = nextLine + characterOffset * .012;
      heroTimeline.to(word, { y: 0, x: 0, rotation: 0, duration: .3,
        ease: 'power2.out' }, start)
        .to(letters, { autoAlpha: 1, yPercent: 0, scaleX: 1, scaleY: 1, rotation: 0,
          duration: .3, stagger: .012, ease: 'back.out(1.1)' }, start);
      characterOffset += letters.length;
    });
    nextLine += characterOffset * .012 + .13;
  });
}

function finishIntro(animateHero = false) {
  if (introFinished) return;
  introFinished = true;
  clearTimeout(introFailsafe);
  introTimeline?.kill();
  introTimeline = null;
  const intro = document.getElementById('intro');
  const restoreFocus = intro.contains(document.activeElement);
  intro.hidden = true;
  document.body.classList.remove('intro-open');
  document.querySelector('.intro-shapes').replaceChildren();
  document.querySelector('.skip-link').inert = false;
  document.getElementById('main').inert = false;
  document.querySelector('.topbar').inert = false;
  visuals?.setMode(current);
  gsap.set(['.topbar', '#stage'], { clearProps: 'opacity,visibility,transform' });
  sculptures.active = ['home', 'playground'].includes(current);
  revealHome(animateHero);
  if (animateHero && !reduced) {
    gsap.fromTo('.topbar', { yPercent: -110 }, {
      yPercent: 0, duration: .32, ease: 'power3.out', clearProps: 'transform',
    });
  }
  if (restoreFocus) document.getElementById('main').focus({ preventScroll: true });
}

function runIntro() {
  if (introFinished) return;
  if (current === 'home') sculptures.build();
  textReactions.measure();
  if (reduced || current !== 'home') { finishIntro(); return; }
  const intro = document.getElementById('intro');
  const host = document.querySelector('.intro-shapes');
  intro.hidden = false;
  document.body.classList.add('intro-open');
  sculptures.active = false;
  document.getElementById('main').inert = true;
  document.querySelector('.topbar').inert = true;
  document.querySelector('.skip-link').inert = true;
  gsap.set(['.topbar', '.hero-copy', '#stage'], { autoAlpha: 0 });

  const circle = document.createElement('div');
  circle.className = 'intro-circle';
  const radii = [1, .91, .62, .57, .31, .12];
  const colors = [...makeRun(radii.length - 1), '#FFFFFF'];
  radii.forEach((radius, index) => {
    const layer = document.createElement('div');
    layer.className = 'intro-circle-layer';
    layer.style.cssText = `width:${radius * 100}%;height:${radius * 100}%;background:${colors[index]}`;
    circle.appendChild(layer);
  });
  host.replaceChildren(circle);
  const diameter = Math.min(innerWidth, innerHeight) * .65;
  circle.style.width = circle.style.height = `${diameter}px`;
  // The innermost white circle covers every corner before revealing the page.
  const finalScale = Math.hypot(innerWidth, innerHeight) / (diameter * radii.at(-1)) * 1.02;
  introFailsafe = setTimeout(() => finishIntro(true), 4500);
  introTimeline = gsap.timeline({ onComplete: () => finishIntro(true) })
    .fromTo(circle, { scale: .001 }, {
      scale: finalScale, duration: 1.05,
      ease: t => .002 * t + .998 * Math.pow(t, 12),
    });
  intro.focus({ preventScroll: true });
}

document.getElementById('enter-portfolio').addEventListener('click', e => {
  e.preventDefault();
  finishIntro(true);
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !introFinished) finishIntro(true);
  else if (e.key === 'Escape' && heroTimeline) { stopHeroReveal(); textReactions.measure(); }
  if (!['home','playground'].includes(current) || !introFinished || document.querySelector('dialog[open]') || e.target.closest('button,a,input,textarea,[role=button]')) return;
  if (e.key.toLowerCase() === 'r') sculptures.remix();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!introFinished) finishIntro(true);
    if (sculptures.active) sculptures.build();
    textReactions.measure();
    visuals?.paint();
  }, 160);
});
reducedQuery.addEventListener('change', e => {
  reduced = e.matches;
  sculptures.reduced = reduced;
  textReactions.reduced = reduced;
  if (reduced) {
    finishIntro();
    stopHeroReveal();
    textReactions.update();
    if (transition) { transition.kill(); applyPage(pageFromHash()); }
    gsap.set('.route-wipe', { scaleY: 0 });
    if (sculptures.active) sculptures.build();
  }
});

installLinkGlide();
applyPage(pageFromHash());
if (current === 'home') gsap.set(['.topbar', '.hero-copy', '#stage'], { autoAlpha: 0 });
// The page is already usable if a font is slow or unavailable.
Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 600))]).then(runIntro);
if (import.meta.env.DEV) window.__portfolio = { sculptures, textReactions };
if (import.meta.hot) import.meta.hot.dispose(() => { clearTimeout(introFailsafe); introTimeline?.kill(); document.body.classList.remove('intro-open'); stopHeroReveal(); work.dispose(); aboutCube.dispose(); gallery.dispose(); sculptures.destroy(); visuals?.dispose(); removeCursor(); });
