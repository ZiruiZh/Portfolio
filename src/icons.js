// SVG paths avoid platform-dependent emoji substitution for arrow characters.
const paths = {
  'up-right': 'M5 19 19 5M5 5h14v14',
  left: 'M19 12H5m7-7-7 7 7 7',
  right: 'M5 12h14m-7-7 7 7-7 7',
  'chevron-left': 'm15 5-10 7 10 7',
  'chevron-right': 'm9 5 10 7-10 7',
  reset: 'M5 8a8 8 0 1 1-1 8M5 3v5h5',
};
export function arrowIcon(direction = 'up-right') {
  return `<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[direction]}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
}
