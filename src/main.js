import { installLinkGlide } from './link-motion.js';
import './style.css';
import { gsap } from 'gsap';
import { SculptureStage } from './physics.js';
import { TextReactions } from './text-reactions.js';
import { installCursor } from './cursor.js';
import { PlaygroundBackground } from './playground-background.js';
import { installPlaygroundGallery } from './playground-gallery.js';
import { AboutCube } from './about-cube.js';
import { installWork } from './work.js';
import { installCaseStudy } from './case-study.js';
import { isProject } from './projects.js';
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
// The router decides where each route lands, so the browser must not also guess.
history.scrollRestoration = 'manual';
const pages = ['home', 'work', 'playground', 'about'];
let current = 'home';
let currentProject = null;
const scrollMemory = { home: 0, work: 0 };
let transition;
let pendingShapeTheme = null;
const sculptures = new SculptureStage(document.getElementById('stage'), reduced);
const gallery = installPlaygroundGallery(sculptures, reducedQuery);
const caseStudy = installCaseStudy({ reducedQuery });
const work = installWork({ reducedQuery, openImage: gallery.open });
const visuals = new PlaygroundBackground(reducedQuery);
// Both layers read the same eased offset; pointer parallax cannot drift apart.
sculptures.parallax = visuals.offset;
sculptures.onNavigate = (page, color) => {
  if (page === routeFromHash().page) { refreshAccent(color); return; }
  pendingShapeTheme = { page, color };
  location.hash = page;
};
const aboutCube = new AboutCube(document.querySelector('.about-portraits'), reducedQuery);

function applyPage({ page, project }, focus = false) {
  stopHeroReveal();
  // Both are tall, so returning from a case study lands where the card was.
  if (current in scrollMemory) scrollMemory[current] = scrollY;
  const from = current;
  current = page;
  currentProject = project;
  document.body.dataset.page = page;
  // Work continues under the home screen, one scroll down from the sculptures.
  const shown = page === 'home' ? ['home', 'work'] : [page];
  document.querySelectorAll('.page').forEach(el => { el.hidden = !shown.includes(el.id); });
  const title = project ? caseStudy.render(project) : null;
  const tab = page === 'project' ? 'work' : page;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.hash === `#${tab}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = title ? `${title} · Zirui Zhao` : 'Zirui Zhao';
  sculptures.setMode(page);
  visuals?.setMode(page);
  aboutCube.setMode(page);
  caseStudy.setMode(page);
  textReactions.measure();
  window.scrollTo({ top: from === 'project' && page in scrollMemory ? scrollMemory[page] : 0, behavior: 'instant' });
  work.setMode(page);
  if (page === 'home' && introFinished) revealHome(!reduced);
  if (focus) {
    const heading = document.querySelector(`#${page} h1`);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function navigate(route, animate = true) {
  const { page, project } = route;
  if (!introFinished) finishIntro();
  if (transition) transition.kill();
  const wipe = document.querySelector('.route-wipe');
  if (page === current && project === currentProject) {
    gsap.set(wipe, { scaleY: 0 });
    gsap.set('.page h1', { clearProps: 'transform,opacity' });
    return;
  }
  const shapeColor = pendingShapeTheme?.page === page ? pendingShapeTheme.color : undefined;
  pendingShapeTheme = null;
  refreshAccent(shapeColor);
  if (reduced || !animate) { gsap.set(wipe, { scaleY: 0 }); applyPage(route, true); return; }
  transition = gsap.timeline()
    .set(wipe, { transformOrigin: 'bottom', scaleY: 0 })
    .to(wipe, { scaleY: 1, duration: .18, ease: 'power3.inOut' })
    .call(() => applyPage(route, true))
    .set(wipe, { transformOrigin: 'top' })
    .to(wipe, { scaleY: 0, duration: .25, ease: 'power3.inOut' })
    .fromTo(`#${page} h1`, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=.16')
    .call(() => textReactions.measure());
}

// #work/prism is a case study; anything unknown falls back to the home page.
function routeFromHash() {
  const [name, key] = location.hash.slice(1).split('/');
  if (name === 'work' && isProject(key)) return { page: 'project', project: key };
  return { page: pages.includes(name) ? name : 'home', project: null };
}
window.addEventListener('hashchange', () => navigate(routeFromHash()));
document.querySelector('.skip-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('main').focus({ preventScroll: true }); });
document.getElementById('reset-home').addEventListener('click', () => sculptures.reset(!reduced));
document.getElementById('reset-play').addEventListener('click', () => sculptures.reset(!reduced));
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
    if (transition) { transition.kill(); applyPage(routeFromHash()); }
    gsap.set('.route-wipe', { scaleY: 0 });
    if (sculptures.active) sculptures.build();
  }
});

installLinkGlide();
applyPage(routeFromHash());
if (current === 'home') gsap.set(['.topbar', '.hero-copy', '#stage'], { autoAlpha: 0 });
// The page is already usable if a font is slow or unavailable.
Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 600))]).then(runIntro);
if (import.meta.env.DEV) window.__portfolio = { sculptures, textReactions };
if (import.meta.hot) import.meta.hot.dispose(() => { clearTimeout(introFailsafe); introTimeline?.kill(); document.body.classList.remove('intro-open'); stopHeroReveal(); work.dispose(); caseStudy.dispose(); aboutCube.dispose(); gallery.dispose(); sculptures.destroy(); visuals?.dispose(); removeCursor(); });
