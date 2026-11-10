import { installLinkGlide } from './link-motion.js';
import { iconPath } from './icons.js';
import './style.css';
import { gsap } from 'gsap';
import { SculptureStage } from './physics.js';
import { TextReactions } from './text-reactions.js';
import { installCursor } from './cursor.js';
import { installShapeGradient } from './shape-gradient.js';
import { installWebring } from './webring.js';
import { installPlaygroundHint } from './playground-hint.js';
import { PlaygroundBackground } from './playground-background.js';
import { installPlaygroundGallery } from './playground-gallery.js';
import { AboutCube } from './about-cube.js';
import { installWork } from './work.js';
import { installCaseStudy } from './case-study.js';
import { installPhoneMenu } from './phone-menu.js';
import { isProject } from './projects.js';
import { makeRun } from './palette.js';
import { makeAccent } from './experience-math.js';

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
// On a phone, Home is a short bio instead of the falling letters, and the top bar is just the logo and a menu.
const phoneQuery = matchMedia('(max-width: 600px)');
const sculpturesOnHome = () => !phoneQuery.matches;
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
installShapeGradient();
installWebring(reducedQuery);
const resumeURL = new URL('../assets/resume.pdf', import.meta.url).href;
document.querySelectorAll('.resume-link, [data-resume-link]').forEach(link => { link.href = resumeURL; });

// The footer keeps Montreal's time to the second. Footers are cloned onto every case study, so each tick finds them all.
const montreal = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function tickClock() {
  const now = new Date();
  const text = montreal.format(now);
  document.querySelectorAll('[data-clock]').forEach(clock => {
    clock.textContent = text;
    clock.dateTime = now.toISOString();
  });
  clockTimer = setTimeout(tickClock, 1000 - now.getMilliseconds() + 5);
}
let clockTimer = 0;
tickClock();
// A hidden tab has no one to tell the time to; it catches up the moment it is seen again.
document.addEventListener('visibilitychange', () => {
  clearTimeout(clockTimer);
  if (!document.hidden) tickClock();
});

// A link marked to copy puts its text on the clipboard instead of opening anything. Footers are cloned onto every
// case study, so one listener serves them all. If the clipboard is refused, the link opens as usual.
document.addEventListener('click', event => {
  const link = event.target.closest('[data-copy]');
  if (!link || !navigator.clipboard) return;
  event.preventDefault();
  navigator.clipboard.writeText(link.dataset.copy).then(() => {
    // The only sign on screen is the word waving again; screen readers are told it was copied.
    const note = link.parentElement.querySelector('.copy-note');
    if (note) note.textContent = 'copied';
    clearTimeout(link.waveTimer);
    // The icon becomes a check at the bottom of the dip, rises with the letters, and turns back after a moment.
    const path = link.querySelector('.copy-icon path');
    clearTimeout(link.checkTimer);
    link.checkTimer = setTimeout(() => {
      if (!path) return;
      // Still in view, it fades across rather than popping.
      const fade = path.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in' });
      fade.onfinish = () => {
        path.setAttribute('d', iconPath('copy'));
        link.classList.remove('is-copied');
        path.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      };
    }, 1630);
    if (reducedQuery.matches) {
      // No wave when motion is unwelcome: the check simply appears.
      path?.setAttribute('d', iconPath('check'));
      link.classList.add('is-copied');
      link.waveTimer = setTimeout(() => { if (note) note.textContent = ''; }, 1500);
      return;
    }
    link.classList.remove('is-wave');
    link.classList.add('is-rewave');
    link.waveTimer = setTimeout(() => {
      path?.setAttribute('d', iconPath('check'));
      link.classList.add('is-copied');
      link.classList.replace('is-rewave', 'is-wave');
      link.waveTimer = setTimeout(() => {
        link.classList.remove('is-wave');
        if (note) note.textContent = '';
      }, 900);
    }, 130);
  }, () => { location.href = link.href; });
});
// The router decides where each route lands, so the browser must not also guess.
history.scrollRestoration = 'manual';
const pages = ['home', 'work', 'playground', 'about'];
let current = 'home';
let currentProject = null;
const scrollMemory = { home: 0, work: 0 };
let transition;
let pendingShapeTheme = null;
const sculptures = new SculptureStage(document.getElementById('stage'), reduced);
sculptures.allowHome = sculpturesOnHome;
const phoneMenu = installPhoneMenu({ reducedQuery, phoneQuery });
installPlaygroundHint(sculptures.looping);
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
  document.querySelectorAll('.nav-link, .phone-menu-nav a').forEach(link => {
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
    // Home has a heading for each screen size; the one showing takes focus.
    const heading = [...document.querySelectorAll(`#${page} h1`)].find(h => h.getClientRects().length) ?? document.querySelector(`#${page} h1`);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function navigate(route, animate = true) {
  const { page, project } = route;
  if (!introFinished) finishIntro();
  if (transition) transition.kill();
  // Pages blur and fade out, then the next one blurs and fades in. The parts of each page fade rather than the page
  // itself, since a filter on a page would pull its fixed sculpture stage out of place for the length of the fade.
  const parts = () => document.querySelectorAll('.page:not([hidden]) > *');
  const settle = () => gsap.set('.page > *', { clearProps: 'opacity,filter' });
  if (page === current && project === currentProject) {
    settle();
    return;
  }
  const shapeColor = pendingShapeTheme?.page === page ? pendingShapeTheme.color : undefined;
  pendingShapeTheme = null;
  refreshAccent(shapeColor);
  if (reduced || !animate) { settle(); applyPage(route, true); return; }
  transition = gsap.to(parts(), {
    opacity: 0, filter: 'blur(10px)', duration: .2, ease: 'power2.in',
    onComplete: () => {
      applyPage(route, true);
      settle();
      transition = gsap.fromTo(parts(), { opacity: 0, filter: 'blur(10px)' }, {
        opacity: 1, filter: 'blur(0px)', duration: .3, ease: 'power2.out', clearProps: 'opacity,filter',
        onComplete: () => textReactions.measure(),
      });
    },
  });
}

// #work/allot is a case study; anything unknown falls back to the home page.
function routeFromHash() {
  const [name, key] = location.hash.slice(1).split('/');
  if (name === 'work' && isProject(key)) return { page: 'project', project: key };
  return { page: pages.includes(name) ? name : 'home', project: null };
}
window.addEventListener('hashchange', () => navigate(routeFromHash()));
document.querySelector('.skip-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('main').focus({ preventScroll: true }); });
document.getElementById('reset-home').addEventListener('click', () => sculptures.reset(!reduced));

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
  sculptures.active = sculpturesOnHome();
  if (!animate || reduced || !sculpturesOnHome()) { textReactions.measure(); return; }
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
  sculptures.active = current === 'playground' || (current === 'home' && sculpturesOnHome());
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
  if (current === 'home' && sculpturesOnHome()) sculptures.build();
  textReactions.measure();
  // A phone skips the opening circle and the falling letters and goes straight to the bio.
  if (reduced || current !== 'home' || !sculpturesOnHome()) { finishIntro(); return; }
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
  if (e.key.toLowerCase() === 'r' && sculptures.active) sculptures.remix();
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
    gsap.set('.page > *', { clearProps: 'opacity,filter' });
    if (sculptures.active) sculptures.build();
  }
});

phoneQuery.addEventListener('change', () => {
  if (current !== 'home' || !introFinished) return;
  sculptures.setMode('home');
  revealHome(false);
});

installLinkGlide();
applyPage(routeFromHash());
if (current === 'home') gsap.set(['.topbar', '.hero-copy', '#stage'], { autoAlpha: 0 });
// The page is already usable if a font is slow or unavailable.
Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 600))]).then(runIntro);
if (import.meta.env.DEV) window.__portfolio = { sculptures, textReactions };
if (import.meta.hot) import.meta.hot.dispose(() => { clearTimeout(introFailsafe); introTimeline?.kill(); document.body.classList.remove('intro-open'); stopHeroReveal(); work.dispose(); caseStudy.dispose(); phoneMenu.dispose(); aboutCube.dispose(); gallery.dispose(); sculptures.destroy(); visuals?.dispose(); removeCursor(); });
