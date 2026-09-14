import { gsap } from 'gsap';

export function installCursor(reducedQuery) {
  const fine = matchMedia('(pointer:fine)');
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor'; cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-core"></span>';
  const core = cursor.firstElementChild;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let clickTween;
  // A manual popover occupies the browser top layer, above modal dialogs.
  cursor.setAttribute('popover', 'manual');
  document.body.appendChild(cursor);
  const raiseCursor = () => { if (cursor.matches(':popover-open')) cursor.hidePopover(); cursor.showPopover(); };
  raiseCursor();
  document.addEventListener('portfolio:dialog-open', raiseCursor, options);
  const position = { x: -100, y: -100 }, target = { x: -100, y: -100 };
  let seen = false;
  const update = () => {
    if (!fine.matches || !seen || document.hidden) return;
    if (Math.abs(target.x - position.x) + Math.abs(target.y - position.y) < .05) return;
    const ease = reducedQuery.matches ? 1 : .4;
    position.x += (target.x - position.x) * ease; position.y += (target.y - position.y) * ease;
    cursor.style.transform = `translate3d(${position.x}px,${position.y}px,0)`;
  };
  gsap.ticker.add(update);
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || !fine.matches) return;
    target.x = e.clientX; target.y = e.clientY;
    if (!seen) { position.x = target.x; position.y = target.y; seen = true; }
    document.body.classList.add('circle-cursor');
    cursor.classList.toggle('over-link', !!e.target.closest('a,button,[role=button],[data-destination]'));
    cursor.classList.add('is-visible');
  }, { ...options, passive: true });
  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || !fine.matches) return;
    clickTween?.kill();
    if (reducedQuery.matches) { gsap.set(core, { clearProps: 'transform' }); return; }
    clickTween = gsap.timeline({ onComplete: () => { gsap.set(core, { clearProps: 'transform' }); clickTween = null; } })
      .to(core, { scale: .76, duration: .07, ease: 'power2.out' })
      .to(core, { scale: 1, duration: .16, ease: 'power3.out' });
  }, options);
  document.addEventListener('pointerleave', () => { cursor.classList.remove('is-visible'); seen = false; }, options);
  window.addEventListener('blur', () => cursor.classList.remove('is-visible'), options);
  fine.addEventListener('change', () => { if (!fine.matches) document.body.classList.remove('circle-cursor'); }, options);
  return () => { clickTween?.kill(); controller.abort(); gsap.ticker.remove(update); cursor.remove(); document.body.classList.remove('circle-cursor'); };
}
