import { gsap } from 'gsap';

// On a phone the top bar keeps only the logo and a two-line menu icon. The icon opens the whole site as one page:
// it blurs in like a route change, its lines turn into a cross, and it blurs out again once a choice is made.
// A modal dialog keeps focus inside, closes on Escape and hands focus back to the icon.
export function installPhoneMenu({ reducedQuery, phoneQuery }) {
  const dialog = document.getElementById('phone-menu');
  const opener = document.querySelector('.topbar .menu-toggle');
  const closer = dialog.querySelector('.menu-toggle');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let tween;

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
    tween = gsap.fromTo(dialog, { opacity: 0, filter: 'blur(10px)' },
      { opacity: 1, filter: 'blur(0px)', duration: .3, ease: 'power2.out', clearProps: 'opacity,filter' });
  }

  // Put everything back the moment the dialog shuts, however it was shut.
  function settle() {
    tween?.kill();
    gsap.set(dialog, { clearProps: 'opacity,filter' });
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
    tween = gsap.to(dialog, { opacity: 0, filter: 'blur(10px)', duration: .2, ease: 'power2.in', onComplete: shut });
  }

  dialog.addEventListener('close', settle, options);
  // Escape fades it out like the cross does, rather than snapping shut.
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, options);
  opener.addEventListener('click', open, options);
  closer.addEventListener('click', () => close(), options);
  // A section or the logo takes the reader there; the page changes behind the menu as it fades away.
  dialog.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) close();
  }, options);
  window.addEventListener('hashchange', () => close(), options);
  // Grown past phone width, there is a full navigation bar again and no menu to keep open.
  phoneQuery.addEventListener('change', () => { if (!phoneQuery.matches) close(true); }, options);

  return { dispose: () => { close(true); controller.abort(); } };
}
