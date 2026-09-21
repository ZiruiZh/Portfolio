// Pure layout rules for the work tab, kept free of DOM and Vite imports for tests.

// Rows alternate wide/narrow then narrow/wide across a 12-column grid.
export function featureSpan(index) {
  return [7, 5, 5, 7][index % 4];
}

export function parseRatio(ratio) {
  const [width, height = 1] = String(ratio).split('/').map(Number);
  return width / height;
}

export function visualColumns(viewportWidth) {
  return viewportWidth > 1024 ? 4 : viewportWidth > 600 ? 3 : 2;
}

// Each item joins the shortest column; near-ties go left so the first row reads in order.
export function distributeColumns(heights, count, tolerance = 1) {
  const columns = Array.from({ length: Math.max(1, count) }, () => ({ items: [], height: 0 }));
  heights.forEach((height, index) => {
    const target = columns.reduce((best, column) => column.height < best.height - tolerance ? column : best);
    target.items.push(index);
    target.height += height;
  });
  return columns.map(column => column.items);
}
