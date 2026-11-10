import { gsap } from 'gsap';

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

  // Every few seconds the logo at the start of the bio glitches into the name it stands for, holds, and glitches back.
  // A tap, or a mouse passing over it, sets it off too. It rests while the bio is out of sight.
  const mark = document.querySelector('.phone-head-mark');
  const nameEl = mark?.querySelector('.phone-head-name');
  const NAME = 'Zirui Zhao', NOISE = '#%&/<>?!*+=01';
  let glitchTimer = 0, scrambleTimer = 0, inView = true, busy = false;
  const showing = () => phoneQuery.matches && document.body.dataset.page === 'home' && !document.hidden && !dialog.open && inView;
  // The name arrives as noise that settles, a letter at a time, into the real thing.
  function scramble() {
    clearInterval(scrambleTimer);
    let frame = 0;
    scrambleTimer = setInterval(() => {
      frame += 1;
      nameEl.textContent = [...NAME].map((ch, i) => ch === ' ' || i < frame * 2 ? ch : NOISE[Math.floor(Math.random() * NOISE.length)]).join('');
      if (frame * 2 >= NAME.length) clearInterval(scrambleTimer);
    }, 40);
  }
  function glitch(next) {
    clearTimeout(glitchTimer);
    if (reducedQuery.matches || !showing()) { glitchTimer = setTimeout(() => glitch(next), 3000); return; }
    busy = true;
    mark.classList.remove('is-glitching');
    void mark.offsetWidth;
    mark.classList.add('is-glitching');
    // Halfway through the stutter the one becomes the other.
    glitchTimer = setTimeout(() => {
      mark.classList.toggle('is-name', next === 'name');
      if (next === 'name') scramble();
      glitchTimer = setTimeout(() => {
        mark.classList.remove('is-glitching');
        busy = false;
        glitchTimer = next === 'name'
          ? setTimeout(() => glitch('logo'), 1800)
          : setTimeout(() => glitch('name'), 6000 + Math.random() * 4000);
      }, 160);
    }, 160);
  }
  const poke = () => { if (!busy && !mark.classList.contains('is-name')) glitch('name'); };
  if (mark) {
    glitchTimer = setTimeout(() => glitch('name'), 3000);
    mark.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') poke(); }, options);
    // On Home the logo is already where it leads, so a tap plays the glitch instead.
    mark.addEventListener('click', e => { if (document.body.dataset.page === 'home') { e.preventDefault(); poke(); } }, options);
    const seen = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    seen.observe(mark);
    controller.signal.addEventListener('abort', () => seen.disconnect());
  }

  return { dispose: () => { close(true); controller.abort(); clearTimeout(glitchTimer); clearInterval(scrambleTimer); mark?.classList.remove('is-glitching', 'is-name'); } };
}
