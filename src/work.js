import { projects, projectImage, projectVideo, visualWork } from './projects.js';
import { playgroundImages, playgroundImage } from './playground-gallery.js';
import { arrowIcon } from './icons.js';
import { featureSpan, parseRatio, visualColumns, distributeColumns } from './work-layout.js';

// Small caption marks, one per piece; each turns into an arrow on hover.
const GLYPHS = {
  dot: '<circle cx="6" cy="6" r="3.4"/>',
  diamond: '<path d="M6 1.2 10.8 6 6 10.8 1.2 6Z"/>',
  sparkle: '<path d="M6 .6C6.5 4 8 5.5 11.4 6 8 6.5 6.5 8 6 11.4 5.5 8 4 6.5.6 6 4 5.5 5.5 4 6 .6Z"/>',
  square: '<rect x="2.4" y="2.4" width="7.2" height="7.2" rx="1.2"/>',
  triangle: '<path d="M6 1.6 10.9 10.2H1.1Z"/>',
  ring: '<circle cx="6" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  heart: '<path d="M6 10.4C3.4 8.4 1.2 6.7 1.2 4.6A2.4 2.4 0 0 1 6 3.5a2.4 2.4 0 0 1 4.8 1.1c0 2.1-2.2 3.8-4.8 5.8Z"/>',
};
const VISUAL_GLYPHS = ['triangle', 'ring', 'diamond', 'sparkle', 'square', 'dot'];
const VISUAL_COLORS = ['#ff5a36', '#2f47ff', '#00a37a', '#e3a600', '#9b6bff', '#ff3d9a'];

function h(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(child => child != null));
  return node;
}

function image(src) {
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = src;
  return img;
}

// Cover reels load when first needed; the poster is their first frame, so playback starts without a jump.
function reel(src, poster) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = poster;
  video.dataset.src = src;
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  return video;
}

function media({ images, video, poster, ratio, mat }) {
  const frame = h('span', mat ? 'work-media is-mat' : 'work-media');
  frame.style.setProperty('--ratio', ratio);
  if (video) frame.append(reel(video, poster));
  else if (mat) frame.append(h('span', 'work-mat', ...images.map(image)));
  else frame.append(image(images[0]));
  return frame;
}

function glyph(kind, color) {
  const mark = h('span', 'work-glyph');
  mark.setAttribute('aria-hidden', 'true');
  mark.style.setProperty('--glyph', color);
  mark.innerHTML = `<svg class="glyph-shape" viewBox="0 0 12 12" fill="currentColor" focusable="false">${GLYPHS[kind] ?? GLYPHS.dot}</svg>${arrowIcon()}`;
  return mark;
}

// The typeface change separates a title from its summary; a plain space keeps them readable together.
function caption(title, summary, tags, mark) {
  const line = h('span', 'work-line', h('span', 'work-title', title));
  if (summary) line.append(' ', h('span', 'work-summary', summary));
  return h('span', 'work-caption', line, tags ? h('span', 'work-tags', tags) : null, mark);
}

// Case studies share one card builder between the feature grid and the visual grid.
// A card shows a still unless it names a video recorded from the project itself.
function projectCard(key, className, tags) {
  const project = projects[key];
  const { card } = project;
  const button = h('button', className);
  button.type = 'button';
  button.dataset.project = key;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'project-dialog');
  const art = card.video
    ? { ratio: card.ratio, video: projectVideo(card.video), poster: projectImage(card.poster) }
    : { ratio: card.ratio, mat: card.mat, images: card.images.map(projectImage) };
  button.append(media(art), caption(project.title, project.summary, tags && project.tags, glyph(card.glyph, project.hoverColor)));
  return button;
}

export function installWork({ reducedQuery, openProject, openImage }) {
  const visualGrid = document.getElementById('visual-grid');
  const controller = new AbortController();
  const options = { signal: controller.signal };

  // Case studies listed in the visual grid are left out of the feature grid.
  const inVisual = new Set(visualWork.map(item => item.project).filter(Boolean));
  const featured = Object.keys(projects).filter(key => !inVisual.has(key));
  document.getElementById('feature-grid').replaceChildren(...featured.map((key, index) => {
    const card = projectCard(key, 'work-card', true);
    card.style.setProperty('--span', featureSpan(index));
    card.addEventListener('click', () => openProject(key));
    return card;
  }));

  const imageIds = visualWork.filter(item => item.playground).map(item => item.playground);
  const visuals = visualWork.map((item, index) => {
    if (item.project) {
      const button = projectCard(item.project, 'visual-item', false);
      button.addEventListener('click', () => openProject(item.project));
      return { el: button, ratio: parseRatio(projects[item.project].card.ratio) };
    }
    const data = playgroundImages.find(entry => entry.id === item.playground);
    const ratio = item.ratio || `${data.width} / ${data.height}`;
    const button = h('button', 'visual-item');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.append(media({ images: [playgroundImage(data.id, 'grid') || playgroundImage(data.id)], ratio, mat: item.mat }),
      caption(item.title, item.note, null, glyph(VISUAL_GLYPHS[index % VISUAL_GLYPHS.length], VISUAL_COLORS[index % VISUAL_COLORS.length])));
    button.addEventListener('click', () => openImage(data.id, button, imageIds));
    return { el: button, ratio: parseRatio(ratio) };
  });

  let columnCount = 0;
  function layoutVisuals() {
    const count = visualColumns(innerWidth);
    if (count === columnCount) return;
    columnCount = count;
    const gutter = count === 2 ? 12 : 16;
    const columnWidth = (innerWidth - gutter * (count + 1)) / count;
    // Captions add roughly two lines below each image.
    const heights = visuals.map(item => columnWidth / item.ratio + 70);
    visualGrid.style.setProperty('--columns', count);
    visualGrid.replaceChildren(...distributeColumns(heights, count).map(indices =>
      h('div', 'visual-column', ...indices.map(index => visuals[index].el))));
  }
  layoutVisuals();
  ['(max-width:1024px)', '(max-width:600px)'].forEach(query => matchMedia(query).addEventListener('change', layoutVisuals, options));

  // Only reels near the viewport play; everything pauses outside Work, behind a dialog, or in a hidden tab.
  const reels = [...document.querySelectorAll('#work video[data-src]')];
  const nearby = new Set();
  let enabled = false;
  function syncReels() {
    const allowed = enabled && !document.hidden && !reducedQuery.matches && !navigator.connection?.saveData && !document.querySelector('dialog[open]');
    reels.forEach(video => {
      if (allowed && nearby.has(video)) {
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        video.play().catch(() => {}); // The poster stays if autoplay is unavailable.
      } else if (!video.paused) video.pause();
    });
  }
  const reelObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) nearby.add(entry.target); else nearby.delete(entry.target); });
    syncReels();
  }, { rootMargin: '200px 0px' });
  reels.forEach(video => reelObserver.observe(video));
  document.addEventListener('visibilitychange', syncReels, options);
  document.addEventListener('portfolio:dialog-open', syncReels, options);
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', syncReels, options));
  reducedQuery.addEventListener('change', syncReels, options);

  return {
    setMode(mode) { enabled = mode === 'work'; syncReels(); },
    dispose() { controller.abort(); reelObserver.disconnect(); reels.forEach(video => video.pause()); },
  };
}
