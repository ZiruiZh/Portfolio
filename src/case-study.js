import { projects, projectImage, projectVideo } from './projects.js';
import { slugify } from './work-layout.js';

const pad = index => String(index + 1).padStart(2, '0');

function h(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(child => child != null));
  return node;
}

function figure(image) {
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
  return h('figure', 'case-figure', link);
}

// The recorded walkthrough leads when a project has one; otherwise its first image does.
function hero(project) {
  if (project.walkthrough) {
    const video = h('video');
    video.src = projectVideo(project.walkthrough);
    video.poster = projectImage(project.cover);
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', `${project.title} walkthrough`);
    return video;
  }
  const first = project.images[0];
  const img = h('img');
  img.src = projectImage(first.file);
  img.alt = first.caption;
  img.width = first.width;
  img.height = first.height;
  img.decoding = 'async';
  return img;
}

function sectionBlock(project, section) {
  const node = h('section', 'case-section');
  node.id = `case-${slugify(section.label)}`;
  node.append(h('p', 'case-label', section.label));
  if (section.heading) node.append(h('h2', 'case-heading', section.heading));
  if (section.body) node.append(h('p', 'case-text', section.body));
  if (section.list) {
    node.append(h('dl', 'case-list', ...section.list.flatMap((item, index) => [
      h('div', null, h('dt', null, item.term), h('dd', null, item.text), h('span', 'case-step', pad(index))),
    ])));
  }
  if (section.stats) {
    node.append(h('div', 'case-stats', ...section.stats.map(stat =>
      h('div', null, h('p', 'case-stat-value', stat.value), h('p', 'case-stat-text', stat.text)))));
  }
  const images = (section.images ?? []).map(file => project.images.find(image => image.file === file)).filter(Boolean);
  if (images.length) node.append(h('div', 'case-figures', ...images.map(figure)));
  if (section.note) node.append(h('p', 'case-note', section.note));
  return node;
}

export function installCaseStudy({ reducedQuery }) {
  const page = document.getElementById('project');
  const rail = page.querySelector('.case-rail');
  const index = document.getElementById('case-index');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let frame = 0, current = -1;

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
    const line = rail.getBoundingClientRect().top + 170;
    let position = 0; // The first section stays marked while the hero and title are in view.
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= line) position = i; });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) position = sections.length - 1;
    setCurrent(position);
  }
  const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', requestUpdate, { ...options, passive: true });
  window.addEventListener('resize', requestUpdate, options);

  function render(key) {
    const project = projects[key];
    document.getElementById('project-title').textContent = project.title;
    document.getElementById('case-hero').replaceChildren(hero(project));

    // A fact can name several people, and they stand in a column of their own.
    document.getElementById('case-meta').replaceChildren(...Object.entries(project.metadata).map(([label, value]) =>
      h('div', null, h('dt', null, label === 'My Role' ? 'Role' : label),
        ...[value].flat().map(entry => h('dd', null, entry)))));

    document.getElementById('case-sections').replaceChildren(...project.sections.map(section => sectionBlock(project, section)));
    index.replaceChildren(...project.sections.map(section => {
      const link = h('a', null, section.label);
      link.href = `#case-${slugify(section.label)}`;
      link.addEventListener('click', event => {
        // The route owns the address bar, so a section jump scrolls instead of linking.
        event.preventDefault();
        document.getElementById(`case-${slugify(section.label)}`)
          .scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' });
      });
      return h('li', null, link);
    }));
    current = -1;
    setCurrent(0);
    return project.title;
  }

  const pause = () => page.querySelectorAll('video').forEach(video => video.pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);

  return {
    render,
    // A walkthrough left playing is still audible from another page.
    setMode(mode) { if (mode !== 'project') pause(); },
    dispose: () => { controller.abort(); cancelAnimationFrame(frame); },
  };
}
