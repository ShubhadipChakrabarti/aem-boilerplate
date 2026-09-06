import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  if (block.classList.contains('overlay')) {
    const ul = document.createElement('ul');
    [...block.children].forEach((row) => {
      const cells = [...row.children];
      const li = document.createElement('li');
      const anchor = document.createElement('a');
      const linkCell = cells[2];
      const headingCell = cells[1];
      const pictureCell = cells[0];
      const href = (linkCell && linkCell.querySelector('a')) ? linkCell.querySelector('a').href : '#';
      anchor.href = href;
      if (headingCell) {
        anchor.setAttribute('aria-label', headingCell.textContent.trim());
      }
      if (pictureCell) {
        const pictureWrapper = document.createElement('div');
        pictureWrapper.className = 'cards-overlay-image';
        while (pictureCell.firstElementChild) pictureWrapper.append(pictureCell.firstElementChild);
        anchor.append(pictureWrapper);
      }
      if (headingCell) {
        const labelWrapper = document.createElement('div');
        labelWrapper.className = 'cards-overlay-label';
        while (headingCell.firstElementChild) labelWrapper.append(headingCell.firstElementChild);
        if (!headingCell.firstElementChild && headingCell.textContent.trim()) {
          const span = document.createElement('span');
          span.textContent = headingCell.textContent.trim();
          labelWrapper.append(span);
        }
        anchor.append(labelWrapper);
      }
      li.append(anchor);
      ul.append(li);
    });
    ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
    block.replaceChildren(ul);
    return;
  }

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
