import { arrowIcon } from './icons.js';
import { gsap } from 'gsap';
import images from './playground-images.json';

export { images as playgroundImages };
const assets = import.meta.glob('../assets/playground/*.webp', { query: '?url', import: 'default', eager: true });
export const playgroundImage = (id, size = 'thumb') => assets[`../assets/playground/${id}-${size}.webp`];

export function installPlaygroundGallery(stage, reducedQuery) {
  const dialog = document.createElement('dialog');
  dialog.className = 'playground-lightbox';
  dialog.setAttribute('aria-label', 'Playground image viewer');
  dialog.innerHTML = `<div class="lightbox-bar"><span class="lightbox-count" aria-live="polite"></span><div><button type="button" data-action="previous" aria-label="Previous image">${arrowIcon('left')}</button><button type="button" data-action="next" aria-label="Next image">${arrowIcon('right')}</button><button type="button" data-action="close"><span class="lightbox-close-label">Close ×</span></button></div></div><figure class="lightbox-figure"><div class="lightbox-art"></div><figcaption></figcaption></figure>`;
  document.body.appendChild(dialog);
  const art = dialog.querySelector('.lightbox-art');
  // The work tab opens a curated subset; the playground steps through everything.
  let sequence = images, index = 0, opener, tween, byKeyboard = false;
  // The viewer only shows where focus is to someone moving it with the keyboard; a tap or click lights nothing.
  let lastInput = 'pointer';
  const noteKeys = e => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) lastInput = 'keyboard'; };
  const notePointer = () => { lastInput = 'pointer'; };
  document.addEventListener('keydown', noteKeys, true);
  document.addEventListener('pointerdown', notePointer, true);
  dialog.tabIndex = -1;
  function render() {
    const data = sequence[index];
    const img = new Image();
    img.src = playgroundImage(data.id, 'full');
    img.alt = data.title; img.width = data.width; img.height = data.height;
    img.decoding = 'async';
    // The matching thumbnail remains behind the full image while it decodes.
    art.style.backgroundImage = `url("${playgroundImage(data.id)}")`;
    art.replaceChildren(img);
    dialog.querySelector('figcaption').textContent = data.title;
    dialog.querySelector('.lightbox-count').textContent = `${index + 1} / ${sequence.length}`;
    tween?.kill();
    if (!reducedQuery.matches) tween = gsap.fromTo(art, { scale: .96 }, { scale: 1, duration: .22, ease: 'power3.out', clearProps: 'transform' });
  }
  function step(delta) { index = (index + delta + sequence.length) % sequence.length; render(); }
  function open(id, from, ids) {
    sequence = ids ? ids.map(key => images.find(image => image.id === key)).filter(Boolean) : images;
    index = Math.max(0, sequence.findIndex(image => image.id === id));
    opener = from;
    byKeyboard = lastInput === 'keyboard';
    render(); dialog.showModal();
    // From the keyboard, focus lands on Close; from a pointer, on the viewer itself, so no button lights up.
    if (byKeyboard) dialog.querySelector('[data-action="close"]').focus();
    else dialog.focus({ preventScroll: true });
    document.dispatchEvent(new Event('portfolio:dialog-open'));
  }
  stage.onImageOpen = item => { stage.clearFocus(); open(item.image.id, item.el); };
  dialog.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'close' || e.target === dialog) dialog.close();
    if (action === 'previous') step(-1);
    if (action === 'next') step(1);
  });
  dialog.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); step(e.key === 'ArrowLeft' ? -1 : 1); }
  });
  dialog.addEventListener('close', () => {
    tween?.kill(); art.replaceChildren(); art.style.backgroundImage = '';
    // Focus goes back to where it came from only for keyboard users; after a tap it is simply let go,
    // so the artwork that opened the viewer is left with no ring around it.
    if (byKeyboard && opener?.isConnected) opener.focus({ preventScroll: true });
    else if (byKeyboard && stage.mode === 'playground') stage.element.focus({ preventScroll: true });
    // The browser hands focus back to the opener on its own once the dialog has closed, so let go of it just after.
    else setTimeout(() => { if (!dialog.open) document.activeElement?.blur(); });
  });
  const closeOnRoute = () => { if (dialog.open) dialog.close(); };
  window.addEventListener('hashchange', closeOnRoute);
  const dispose = () => {
    tween?.kill(); dialog.remove(); stage.onImageOpen = null; window.removeEventListener('hashchange', closeOnRoute);
    document.removeEventListener('keydown', noteKeys, true);
    document.removeEventListener('pointerdown', notePointer, true);
  };
  return { open, dispose };
}
