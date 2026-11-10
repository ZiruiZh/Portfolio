import { projects, projectImage, projectVideo, projectRoute, visualWork } from './projects.js';
import { playgroundImage } from './playground-gallery.js';
import { parseRatio, featureColumns, distributeColumns } from './work-layout.js';

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

// Cover videos load when first needed; the poster is their first frame, so playback starts without a jump.
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

// The project's name, followed by what kind of work it was in a lighter grey.
function caption(title) {
  return h('span', 'work-caption', h('span', 'work-title', ...[title].flat()));
}

// One card builder for every case study on the work list.
// A card shows a still unless it names a video recorded from the project itself.
// Each one links to the case study's own route, or to the project's own site if it has no case study.
function projectCard(key, className, featured, bare) {
  const project = projects[key];
  const { card } = project;
  const link = h('a', className);
  link.href = project.link ?? projectRoute(key);
  if (project.link) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.dataset.project = key;
  const art = bare
    ? { ratio: bare, images: card.images.map(projectImage) }
    : card.video
    ? { ratio: card.ratio, video: projectVideo(card.video), poster: projectImage(card.poster) }
    : { ratio: card.ratio, mat: card.mat, images: card.images.map(projectImage) };
  // In the visual grid the art speaks for itself: no caption, just a name for screen readers.
  if (featured) link.append(media(art), caption([project.cardName ?? project.title, h('span', 'work-type', ` / ${project.category}${project.year ? ` ${project.year}` : ''}`)]));
  else { link.append(media(art)); link.setAttribute('aria-label', project.title); }
  return link;
}

// Places cards into columns by estimated height so every column ends close together.
function masonry(grid, cards, count, captionHeight) {
  const gap = innerWidth > 600 ? 16 : 12;
  const columnWidth = (innerWidth - gap * (count + 1)) / count;
  const heights = cards.map(card => columnWidth / card.ratio + captionHeight);
  grid.style.setProperty('--columns', count);
  grid.replaceChildren(...distributeColumns(heights, count).map(indices =>
    h('div', 'work-column', ...indices.map(index => cards[index].el))));
}

export function installWork({ reducedQuery }) {
  const featureGrid = document.getElementById('feature-grid');
  const controller = new AbortController();
  const options = { signal: controller.signal };

  // Case studies that only ever lived in the old visual grid (ArtsFest) stay off the list; their routes still work.
  const inVisual = new Set(visualWork.map(item => item.project).filter(Boolean));
  const features = Object.keys(projects).filter(key => !inVisual.has(key))
    .map(key => ({ el: projectCard(key, 'work-card', true), ratio: parseRatio(projects[key].card.ratio) }));
  // The playground has a card of its own after the case studies:
  // a glimpse of its canvas, a few pieces scattered over the dotted grid and running off the edges.
  const glimpse = h('span', 'work-media playground-glimpse');
  glimpse.style.setProperty('--ratio', '3 / 2');
  [['16', -6, 22, 42, -4], ['34', 31, 8, 24, 3], ['11', 57, 34, 30, -2], ['06', 85, -8, 24, 5]].forEach(([id, x, y, w, turn]) => {
    const piece = image(playgroundImage(id, 'grid') || playgroundImage(id));
    piece.style.cssText = `left:${x}%;top:${y}%;width:${w}%;rotate:${turn}deg`;
    glimpse.append(piece);
  });
  const playgroundLink = h('a', 'work-card', glimpse, caption(['Playground', h('span', 'work-type', ' / Portfolio 2026')]));
  playgroundLink.href = '#playground';
  const playgroundCard = { el: playgroundLink, ratio: 3 / 2 };
  let layout = '';
  const cards = [...features, playgroundCard];
  function layoutGrids() {
    const count = featureColumns(innerWidth);
    if (String(count) === layout) return;
    layout = String(count);
    masonry(featureGrid, cards, count, 64);
  }
  layoutGrids();
  matchMedia('(max-width:600px)').addEventListener('change', layoutGrids, options);

  // Only videos near the viewport play; everything pauses outside Work, behind the lightbox, or in a hidden tab.
  const reels = cards.flatMap(card => [...card.el.querySelectorAll('video[data-src]')]);
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
    setMode(mode) { enabled = mode === 'work' || mode === 'home'; syncReels(); },
    dispose() { controller.abort(); reelObserver.disconnect(); reels.forEach(video => video.pause()); },
  };
}
