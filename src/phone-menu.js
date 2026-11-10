import { gsap } from 'gsap';
import logo from '../assets/ziruilogo.svg?raw';

const NAME = 'Zirui';
const NOISE = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
// The logo's letters, left to right, by the parts of the drawing that make each one up.
const LETTERS = [['#z'], ['#i'], ['#R', '#R_2'], ['#U'], ['#i_2']];

// Five slots, one per letter. Each holds its own piece of the logo, cut out of the full drawing so it lines up
// exactly where it sits in the logo, and can show a character instead. A slot is as wide as the step from its
// letter to the next, so the letters keep their places whatever the slots show.
function buildSlots(mark) {
  const source = new DOMParser().parseFromString(logo, 'image/svg+xml').documentElement;
  const height = Number(source.getAttribute('viewBox').split(' ')[3]);
  const measure = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  measure.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.append(measure);
  const pieces = LETTERS.map(ids => {
    const svg = source.cloneNode(true);
    svg.querySelectorAll('#Logo > *').forEach(part => { if (!ids.some(id => part.matches(id))) part.remove(); });
    measure.replaceChildren(svg.querySelector('#Logo').cloneNode(true));
    const box = measure.firstChild.getBBox();
    return { svg, x: box.x, width: box.width };
  });
  measure.remove();
  const slots = pieces.map((piece, i) => {
    const step = (pieces[i + 1]?.x ?? piece.x + piece.width) - piece.x;
    const { svg } = piece;
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.setAttribute('viewBox', `${piece.x} 0 ${piece.width} ${height}`);
    svg.setAttribute('class', 'phone-head-glyph');
    svg.style.setProperty('--w', piece.width / height);
    const char = document.createElement('span');
    char.className = 'phone-head-char';
    const el = document.createElement('span');
    el.className = 'phone-head-slot';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--step', step / height);
    el.append(svg, char);
    return { el, show(what) {
      const glyph = what === 'glyph';
      el.classList.toggle('is-char', !glyph);
      if (!glyph) char.textContent = what;
    } };
  });
  mark.replaceChildren(...slots.map(slot => slot.el));
  return slots;
}

// On a phone there is no top bar: the bio (or the logo) leads each page with a two-line menu icon beside it. The icon opens the whole site as one page:
// it comes down from under its top row like a blind, its lines turn into a cross, and it rolls back up once a choice is made.
// A modal dialog keeps focus inside, closes on Escape and hands focus back to the icon.
export function installPhoneMenu({ reducedQuery, phoneQuery }) {
  const dialog = document.getElementById('phone-menu');
  const opener = document.querySelector('.phone-head .menu-toggle');
  const closer = dialog.querySelector('.menu-toggle');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let tween;
  // Everything under the bar is cut away, so only the bar shows.
  const hidden = () => `inset(0px 0px ${dialog.clientHeight - dialog.querySelector('.phone-menu-bar').offsetHeight}px 0px)`;

  function open() {
    if (dialog.open) return;
    tween?.kill();
    dialog.showModal();
    document.documentElement.classList.add('menu-open');
    opener.setAttribute('aria-expanded', 'true');
    closer.focus({ preventScroll: true });
    if (reducedQuery.matches) { dialog.classList.add('is-open'); return; }
    // The lines start as the icon that was tapped and turn into a cross once the page is showing.
    void dialog.offsetWidth;
    dialog.classList.add('is-open');
    // The menu's own row (logo and cross) shows first, and the page below it comes down like a blind.
    tween = gsap.fromTo(dialog, { clipPath: hidden() }, { clipPath: 'inset(0px 0px 0px 0px)', duration: .4, ease: 'power3.out', clearProps: 'clipPath' });
  }

  // Put everything back the moment the dialog shuts, however it was shut.
  function settle() {
    tween?.kill();
    gsap.set(dialog, { clearProps: 'clipPath' });
    dialog.classList.remove('is-open');
    document.documentElement.classList.remove('menu-open');
    opener.setAttribute('aria-expanded', 'false');
  }
  const shut = () => { if (dialog.open) dialog.close(); settle(); };

  function close(instant = false) {
    if (!dialog.open) return;
    tween?.kill();
    dialog.classList.remove('is-open');
    if (instant || reducedQuery.matches) { shut(); return; }
    tween = gsap.fromTo(dialog, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: hidden(), duration: .3, ease: 'power3.in', onComplete: shut });
  }

  dialog.addEventListener('close', settle, options);
  // Escape slides it away like the cross does, rather than snapping shut.
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, options);
  opener.addEventListener('click', open, options);
  closer.addEventListener('click', () => close(), options);
  // A section or the logo takes the reader there; the page changes behind the menu as it slides away.
  dialog.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) close();
  }, options);
  window.addEventListener('hashchange', () => close(), options);
  // Grown past phone width, there is a full navigation bar again and no menu to keep open.
  phoneQuery.addEventListener('change', () => { if (!phoneQuery.matches) close(true); }, options);

  // Every few seconds the logo at the start of the bio scrambles into the name "Zirui" and back. The logo's five
  // letterforms and the name's five letters share five slots: each slot runs through random characters and then
  // locks, left to right, into its letter or its piece of the logo. A tap, or a mouse passing over it, sets it off too.
  const mark = document.querySelector('.phone-head-mark');
  const slots = mark ? buildSlots(mark) : [];
  let glitchTimer = 0, scrambleTimer = 0, inView = true, busy = false, state = 'logo';
  const showing = () => phoneQuery.matches && document.body.dataset.page === 'home' && !document.hidden && !dialog.open && inView;

  function scrambleTo(target, done) {
    clearInterval(scrambleTimer);
    busy = true;
    mark.classList.add('is-scrambling');
    let locked = 0;
    scrambleTimer = setInterval(() => {
      slots.forEach((slot, i) => {
        if (i < locked) slot.show(target === 'logo' ? 'glyph' : NAME[i]);
        else slot.show(NOISE[Math.floor(Math.random() * NOISE.length)]);
      });
      if (locked >= slots.length) {
        clearInterval(scrambleTimer);
        mark.classList.remove('is-scrambling');
        busy = false;
        state = target;
        done?.();
      }
      locked += 1 / 3;
    }, 30);
  }
  function cycle() {
    clearTimeout(glitchTimer);
    if (reducedQuery.matches || !showing()) { glitchTimer = setTimeout(cycle, 3000); return; }
    scrambleTo('name', () => {
      glitchTimer = setTimeout(() => scrambleTo('logo', () => { glitchTimer = setTimeout(cycle, 6000 + Math.random() * 4000); }), 1800);
    });
  }
  const poke = () => { if (!busy && state === 'logo' && !reducedQuery.matches) cycle(); };
  if (mark) {
    glitchTimer = setTimeout(cycle, 3000);
    mark.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') poke(); }, options);
    // On Home the logo is already where it leads, so a tap plays the scramble instead.
    mark.addEventListener('click', e => { if (document.body.dataset.page === 'home') { e.preventDefault(); poke(); } }, options);
    const seen = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    seen.observe(mark);
    controller.signal.addEventListener('abort', () => seen.disconnect());
  }

  return {
    dispose: () => {
      close(true); controller.abort(); clearTimeout(glitchTimer); clearInterval(scrambleTimer);
      mark?.classList.remove('is-scrambling'); slots.forEach(slot => slot.show('glyph'));
    },
  };
}
