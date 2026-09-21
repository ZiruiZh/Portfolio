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
  dialog.innerHTML = `<div class="lightbox-bar"><span class="lightbox-count" aria-live="polite"></span><div><button type="button" data-action="previous" aria-label="Previous image">${arrowIcon('left')}</button><button type="button" data-action="next" aria-label="Next image">${arrowIcon('right')}</button><button type="button" data-action="close" autofocus>Close ×</button></div></div><figure class="lightbox-figure"><div class="lightbox-art"></div><figcaption></figcaption></figure>`;
  document.body.appendChild(dialog);
  const art = dialog.querySelector('.lightbox-art');
  // The work tab opens a curated subset; the playground steps through everything.
  let sequence = images, index = 0, opener, tween;
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
    render(); dialog.showModal();
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
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else if (stage.mode === 'playground') stage.element.focus({ preventScroll: true });
  });
  const closeOnRoute = () => { if (dialog.open) dialog.close(); };
  window.addEventListener('hashchange', closeOnRoute);
  const dispose = () => { tween?.kill(); dialog.remove(); stage.onImageOpen = null; window.removeEventListener('hashchange', closeOnRoute); };
  return { open, dispose };
}
