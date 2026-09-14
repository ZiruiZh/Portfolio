import { gsap } from 'gsap';
import images from './playground-images.json';

export { images as playgroundImages };
const assets = import.meta.glob('../assets/playground/*.webp', { query: '?url', import: 'default', eager: true });
export const playgroundImage = (id, size = 'thumb') => assets[`../assets/playground/${id}-${size}.webp`];

export function installPlaygroundGallery(stage, reducedQuery) {
  const dialog = document.createElement('dialog');
  dialog.className = 'playground-lightbox';
  dialog.setAttribute('aria-label', 'Playground image viewer');
  dialog.innerHTML = `<div class="lightbox-bar"><span class="lightbox-count" aria-live="polite"></span><div><button type="button" data-action="previous" aria-label="Previous image">←</button><button type="button" data-action="next" aria-label="Next image">→</button><button type="button" data-action="close" autofocus>Close ×</button></div></div><figure class="lightbox-figure"><div class="lightbox-art"></div><figcaption></figcaption></figure>`;
  document.body.appendChild(dialog);
  const art = dialog.querySelector('.lightbox-art');
  let index = 0, opener, tween;
  function render() {
    const data = images[index];
    const img = new Image();
    img.src = playgroundImage(data.id, 'full');
    img.alt = data.title; img.width = data.width; img.height = data.height;
    img.decoding = 'async';
    // The matching thumbnail remains behind the full image while it decodes.
    art.style.backgroundImage = `url("${playgroundImage(data.id)}")`;
    art.replaceChildren(img);
    dialog.querySelector('figcaption').textContent = data.title;
    dialog.querySelector('.lightbox-count').textContent = `${index + 1} / ${images.length}`;
    tween?.kill();
    if (!reducedQuery.matches) tween = gsap.fromTo(art, { scale: .96 }, { scale: 1, duration: .22, ease: 'power3.out', clearProps: 'transform' });
  }
  function step(delta) { index = (index + delta + images.length) % images.length; render(); }
  stage.onImageOpen = item => {
    opener = item.el;
    index = images.findIndex(image => image.id === item.image.id);
    stage.clearFocus(); render(); dialog.showModal();
    document.dispatchEvent(new Event('portfolio:dialog-open'));
  };
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
  return () => { tween?.kill(); dialog.remove(); stage.onImageOpen = null; window.removeEventListener('hashchange', closeOnRoute); };
}
