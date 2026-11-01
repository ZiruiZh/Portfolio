import { projects, projectImage, projectVideo } from './projects.js';
import { slugify } from './work-layout.js';
import { arrowIcon } from './icons.js';

// A section can go by another name in the index, so two can share a label.
const railLabel = section => section.rail ?? section.label;
const sectionId = section => `case-${slugify(railLabel(section))}`;

function h(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(child => child != null));
  return node;
}

function figure(image, caption) {
  const link = h('a');
  link.href = projectImage(image.file);
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('aria-label', `View full image: ${image.caption}`);
  const img = h('img');
  img.src = link.href;
  img.alt = image.caption;
  img.width = image.width;
  img.height = image.height;
  img.loading = 'lazy';
  img.decoding = 'async';
  link.append(img);
  return h('figure', image.height >= image.width ? 'case-figure case-figure--tall' : 'case-figure', link,
    caption ? h('figcaption', 'case-text', caption) : null);
}

// A small square control that appears on hover.
function setControl(node, icon, label) {
  node.innerHTML = arrowIcon(icon);
  node.setAttribute('aria-label', label);
  node.title = label;
}

function control(icon, label) {
  const node = h('button', 'case-control');
  node.type = 'button';
  setControl(node, icon, label);
  return node;
}

// A video the reader has paused stays paused as it scrolls in and out of view.
function videoControls(video) {
  const toggle = control('play', 'Play');
  const replay = control('reset', 'Replay from the beginning');
  const showState = () => setControl(toggle, video.paused ? 'play' : 'pause', video.paused ? 'Play' : 'Pause');
  const start = () => {
    delete video.dataset.held;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.play().catch(() => {});
  };
  toggle.addEventListener('click', () => {
    if (!video.paused) {
      video.dataset.held = 'true';
      video.pause();
    } else start();
  });
  replay.addEventListener('click', () => {
    video.currentTime = 0;
    start();
  });
  video.addEventListener('play', showState);
  video.addEventListener('pause', showState);
  return h('div', 'case-controls', toggle, replay);
}

// A screen recording in one of the page's four frames. It loads only once it is near.
function clip(entry, autoplay) {
  const video = h('video');
  const src = projectVideo(entry.file);
  video.poster = projectImage(entry.file.replace('.mp4', '-poster.webp'));
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.preload = 'none';
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', entry.alt);
  if (autoplay) {
    video.muted = true;
    video.loop = true;
    video.setAttribute('muted', '');
    video.dataset.src = src;
  } else {
    video.controls = true;
    video.src = src;
  }
  return h('figure', `case-clip case-clip--${entry.shape}`, video, autoplay ? videoControls(video) : null);
}

// The recorded walkthrough leads when a project has one; otherwise its first image does.
// It runs itself as a silent loop, and only falls back to controls when motion is unwelcome.
function hero(project, autoplay) {
  if (project.walkthrough) {
    const video = h('video');
    const src = projectVideo(project.walkthrough);
    video.poster = projectImage(project.cover);
    video.playsInline = true;
    video.disablePictureInPicture = true;
    video.preload = 'none';
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', `${project.title} walkthrough`);
    if (autoplay) {
      video.muted = true;
      video.loop = !project.playOnce;
      video.setAttribute('muted', '');
      video.dataset.src = src;
    } else {
      video.controls = true;
      video.src = src;
    }
    return autoplay ? [video, videoControls(video)] : [video];
  }
  const first = project.images[0];
  const img = h('img');
  img.src = projectImage(first.file);
  img.alt = first.caption;
  img.width = first.width;
  img.height = first.height;
  img.decoding = 'async';
  return [img];
}

const artwork = (project, file) => project.images.find(image => image.file === file);

// A section's parts, each drawn in reading order.
const sectionParts = {
  heading: part => h('h2', part.major ? 'case-heading case-heading--major' : 'case-heading', part.text),
  subhead: part => h('h3', 'case-subhead', part.text),
  label: part => h('p', 'case-label case-label--inner', part.text),
  text: part => h('p', 'case-text', part.text),
  image: (part, project) => figure(artwork(project, part.file), part.caption),
  images: (part, project) => h('div', 'case-figures', ...part.files.map(file => figure(artwork(project, file)))),
  columns: part => {
    const node = h('div', 'case-columns', ...part.items.map(item =>
      h('div', null, h('h3', 'case-term', item.term), h('p', 'case-text', item.text))));
    node.dataset.count = part.count ?? part.items.length;
    node.style.setProperty('--count', node.dataset.count);
    return node;
  },
  cards: (part, project) => h('div', 'case-cards', ...part.items.map(card => {
    const art = artwork(project, card.image);
    const img = h('img');
    img.src = projectImage(art.file);
    img.alt = art.caption;
    img.width = art.width;
    img.height = art.height;
    img.loading = 'lazy';
    img.decoding = 'async';
    return h('figure', 'case-card', img,
      h('figcaption', null, h('h3', 'case-term', card.term), h('p', 'case-text', card.text)));
  })),
  clip: (part, _project, autoplay) => h('div', 'case-feature', clip(part, autoplay),
    part.term ? h('h3', 'case-subhead', part.term) : null,
    part.text ? h('p', 'case-text', part.text) : null),
  // A recording with its caption set beside it, resting on the bottom edge.
  side: (part, _project, autoplay) => h('div', 'case-side', clip(part, autoplay),
    h('div', null, h('h3', 'case-term', part.term), h('p', 'case-text', part.text))),
  grid: (part, _project, autoplay) => {
    const node = h('div', 'case-grid', ...part.items.map(item =>
      h('div', null, clip(item, autoplay), h('p', 'case-text', item.text))));
    node.style.setProperty('--count', part.columns);
    return node;
  },
  // A recording of the home screen stands in for the prototype, which is too heavy to run inside this page.
  // The whole frame is the way in, so it carries no video controls of its own.
  prototype: (part, _project, autoplay) => {
    const node = clip(part, autoplay);
    node.querySelector('.case-controls')?.remove();
    node.querySelector('video').controls = false;
    const link = h('a', 'case-prototype', node, h('span', 'case-prototype-cta', part.text));
    link.href = part.href;
    return link;
  },
  stats: part => h('div', 'case-stats', ...part.items.map(stat =>
    h('div', null, h('p', 'case-stat-value', stat.value), h('p', 'case-stat-text', stat.text)))),
  note: part => h('p', 'case-note', part.text),
};

// A simpler case study names its parts instead of listing them; they read in this order.
const partsOf = section => section.content ?? [
  section.heading && { type: 'heading', text: section.heading },
  ...[section.body ?? []].flat().map(text => ({ type: 'text', text })),
  section.images && { type: 'images', files: section.images },
  section.list && { type: 'columns', count: 2, items: section.list },
  section.stats && { type: 'stats', items: section.stats },
  section.note && { type: 'note', text: section.note },
].filter(Boolean);

function sectionBlock(project, section, autoplay) {
  const node = h('section', 'case-section');
  node.id = sectionId(section);
  node.append(h('p', 'case-label', section.label),
    ...partsOf(section).map(part => sectionParts[part.type](part, project, autoplay)));
  return node;
}

export function installCaseStudy({ reducedQuery }) {
  const page = document.getElementById('project');
  // Every case study closes on the same information as the work page.
  const info = document.getElementById('work-info').cloneNode(true);
  info.id = 'case-info';
  info.setAttribute('aria-labelledby', 'case-info-heading');
  info.querySelector('h2').id = 'case-info-heading';
  page.append(info);
  const rail = page.querySelector('.case-rail');
  const index = document.getElementById('case-index');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let frame = 0, current = -1, rendered = null;

  function setCurrent(position) {
    if (position === current) return;
    current = position;
    [...index.children].forEach((item, i) => {
      const link = item.firstElementChild;
      if (i === position) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function update() {
    frame = 0;
    if (page.hidden) return;
    const sections = [...page.querySelectorAll('.case-section')];
    // The rail scrolls off with the case, so measure from where it sticks.
    const line = parseFloat(getComputedStyle(rail).top) + 170;
    let position = 0; // The first section stays marked while the hero and title are in view.
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= line) position = i; });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) position = sections.length - 1;
    setCurrent(position);
  }
  const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', requestUpdate, { ...options, passive: true });
  window.addEventListener('resize', requestUpdate, options);

  // A loop runs only while it is on screen, on this page, and in a visible tab.
  const nearby = new Set();
  function syncVideos() {
    const live = !page.hidden && !document.hidden;
    page.querySelectorAll('video[data-src]').forEach(video => {
      if (live && nearby.has(video)) {
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        if (!video.ended && !video.dataset.held) video.play().catch(() => {}); // The poster stays if playback is refused.
      } else if (!video.paused) video.pause();
    });
  }
  const watcher = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? nearby.add(entry.target) : nearby.delete(entry.target));
    syncVideos();
  }, { rootMargin: '200px 0px' });

  function render(key) {
    rendered = key;
    const project = projects[key];
    // Set on the root because the cursor lives outside the page.
    document.documentElement.style.setProperty('--case-accent', project.accent);
    document.getElementById('project-title').textContent = project.pageTitle ?? project.title;
    const autoplay = !reducedQuery.matches && !navigator.connection?.saveData;
    document.getElementById('case-hero').replaceChildren(...hero(project, autoplay));

    // A fact can name several people, and they stand in a column of their own.
    document.getElementById('case-meta').replaceChildren(...Object.entries(project.metadata).map(([label, value]) =>
      h('div', null, h('dt', null, label === 'My Role' ? 'Role' : label),
        ...[value].flat().map(entry => h('dd', null, entry)))));

    document.getElementById('case-sections').replaceChildren(
      ...project.sections.map(section => sectionBlock(project, section, autoplay)));
    index.replaceChildren(...project.sections.map(section => {
      const link = h('a', null, railLabel(section));
      link.href = `#${sectionId(section)}`;
      link.addEventListener('click', event => {
        // The route owns the address bar, so a section jump scrolls instead of linking.
        event.preventDefault();
        document.getElementById(sectionId(section))
          .scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' });
      });
      return h('li', null, link);
    }));
    current = -1;
    setCurrent(0);
    watcher.disconnect();
    nearby.clear();
    page.querySelectorAll('video[data-src]').forEach(video => watcher.observe(video));
    return project.title;
  }

  const pause = () => page.querySelectorAll('video').forEach(video => video.pause());
  document.addEventListener('visibilitychange', () => { document.hidden ? pause() : syncVideos(); }, options);
  // Turning reduced motion on swaps the silent loop back for a video the reader starts.
  reducedQuery.addEventListener('change', () => { if (!page.hidden && rendered) render(rendered); }, options);

  return {
    render,
    // A walkthrough left playing is still audible from another page.
    setMode(mode) { if (mode === 'project') syncVideos(); else pause(); },
    dispose: () => { controller.abort(); cancelAnimationFrame(frame); watcher.disconnect(); },
  };
}
