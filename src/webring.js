import { gsap } from 'gsap';

// The webring arrows hide behind the crest. A first click on the crest springs them out, shoving the
// rest of the bar to the left; once they're out, the crest goes back to being a link to the ring.
export function installWebring(reducedQuery) {
  const crest = document.querySelector('.topbar .waterloo');
  const tray = document.getElementById('ring-arrows');
  if (!crest || !tray) return;
  const icons = tray.querySelectorAll('.arrow-icon');
  let open = false, tl;

  const setOpen = value => {
    open = value;
    crest.setAttribute('aria-expanded', String(value));
    tray.toggleAttribute('inert', !value);
  };

  const show = () => {
    setOpen(true);
    tl?.kill();
    const width = [...tray.children].reduce((sum, el) => sum + el.getBoundingClientRect().width, 0)
      || tray.scrollWidth;
    if (reducedQuery.matches) {
      gsap.set(tray, { width: 'auto' });
      gsap.set(icons, { clearProps: 'all' });
      return;
    }
    tl = gsap.timeline()
      .to(tray, { width, duration: .5, ease: 'back.out(2.2)' }, 0)
      .fromTo(icons, { scale: 0 }, { scale: 1, duration: .42, ease: 'back.out(3)', stagger: .07 }, .06)
      .set(tray, { width: 'auto' });
  };

  const hide = () => {
    setOpen(false);
    tl?.kill();
    if (reducedQuery.matches) { gsap.set(tray, { width: 0 }); return; }
    gsap.set(tray, { width: tray.getBoundingClientRect().width });
    tl = gsap.timeline()
      .to([...icons].reverse(), { scale: 0, duration: .18, ease: 'power2.in', stagger: .04 }, 0)
      .to(tray, { width: 0, duration: .32, ease: 'power3.inOut' }, .1);
  };

  crest.addEventListener('click', event => {
    // a modified click still opens the ring in a new tab, and once the arrows are out the crest is a link again
    if (open || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
    event.preventDefault();
    show();
  });
  document.addEventListener('click', event => {
    if (open && !crest.contains(event.target) && !tray.contains(event.target)) hide();
  });
  document.addEventListener('keydown', event => {
    if (open && event.key === 'Escape') { hide(); crest.focus(); }
  });
}
