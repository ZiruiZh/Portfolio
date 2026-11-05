// The playground's "scroll or drag" hint only surfaces once the canvas has sat still for a few seconds.
// Stillness is read from the canvas itself, so a fling that is still gliding counts as movement.
const IDLE_MS = 3000;

export function installPlaygroundHint(looping) {
  const hint = document.querySelector('.playground-heading p');
  const page = document.getElementById('playground');
  if (!hint || !page || !looping) return;
  let timer, frame;
  const rest = () => {
    hint.classList.remove('is-shown');
    clearTimeout(timer);
    timer = setTimeout(() => hint.classList.add('is-shown'), IDLE_MS);
  };
  const moving = () => looping.gesture
    || Math.hypot(looping.target.x - looping.camera.x, looping.target.y - looping.camera.y) > .5;
  const watch = () => {
    if (moving()) rest();
    frame = requestAnimationFrame(watch);
  };
  const start = () => { cancelAnimationFrame(frame); rest(); frame = requestAnimationFrame(watch); };
  const stop = () => { cancelAnimationFrame(frame); clearTimeout(timer); hint.classList.remove('is-shown'); };
  // a key press or a tap that doesn't move the canvas still counts as the visitor being busy
  ['pointerdown', 'keydown'].forEach(type => page.addEventListener(type, () => { if (!page.hidden) rest(); }, { passive: true }));
  new MutationObserver(() => (page.hidden ? stop() : start())).observe(page, { attributes: true, attributeFilter: ['hidden'] });
  if (!page.hidden) start();
}
