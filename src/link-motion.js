// Split only content links; navigation-bar labels deliberately stay static.
export function installLinkGlide() {
  document.querySelectorAll('.link-label').forEach(label => {
    if (label.dataset.glide) return;
    label.dataset.glide = 'true';
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = label.textContent.trim();
    const visual = document.createElement('span');
    visual.className = 'link-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.append(...label.childNodes);
    const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement.closest('svg')) nodes.push(walker.currentNode);
    }
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(token => {
        if (!token.trim()) { fragment.append(document.createTextNode(token)); return; }
        const word = document.createElement('span');
        word.className = 'link-word';
        for (const character of token) {
          const letter = document.createElement('span');
          letter.className = 'link-char'; letter.textContent = character;
          letter.style.setProperty('--glide-delay', `${Math.min(index++ * 20, 360)}ms`);
          word.append(letter);
        }
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    label.replaceChildren(accessible, visual);
  });
}
