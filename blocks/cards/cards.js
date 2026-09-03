/**
 * Allowed protocols for authored hrefs.
 * Fixes CWE-601: protocol-relative URLs (//evil.com) are rejected.
 * @param {string} href
 * @returns {string} sanitised href or '#'
 */
function sanitiseHref(href) {
  if (typeof href !== 'string') return '#';
  const trimmed = href.trim();
  // Reject protocol-relative URLs before the startsWith('/') check.
  if (trimmed.startsWith('//')) return '#';
  // Allow hash-only, root-relative paths, and http/https absolute URLs.
  if (
    trimmed === '#'
    || trimmed.startsWith('/')
    || /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return '#';
}

/**
 * Build the overlay variant: a 4-column grid of category link tiles.
 * Each authored row is expected to have three cells:
 *   [0] image cell  (skipped for overlay)
 *   [1] label cell  (visible text + accessible name)
 *   [2] link cell   (anchor whose href becomes the tile destination)
 *
 * @param {Element} block
 */
function decorateOverlay(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-overlay-list';

  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    // Cell indices: 0 = image (skipped), 1 = label, 2 = link
    const labelCell = cells[1];
    const linkCell = cells[2];

    // Derive visible label text via textContent — never innerHTML.
    const labelText = labelCell ? labelCell.textContent.trim() : '';

    // Derive href from the anchor in the link cell; fall back to '#'.
    const anchor = linkCell ? linkCell.querySelector('a') : null;
    const rawHref = anchor ? anchor.getAttribute('href') : '#';
    const href = sanitiseHref(rawHref || '#');

    const li = document.createElement('li');
    li.className = 'cards-overlay-item';

    const a = document.createElement('a');
    a.href = href;
    // textContent is safe — no innerHTML used.
    a.textContent = labelText;
    // Explicit aria-label ensures screen readers announce the decoded
    // label including literal & characters (e.g. ARTS & HUMANITIES).
    a.setAttribute('aria-label', labelText);

    li.append(a);
    ul.append(li);
  });

  // Replace all authored rows with the constructed list.
  block.replaceChildren(ul);
}

/**
 * Decorate the cards block.
 * Supports the default card layout and the 'overlay' variant.
 *
 * @param {Element} block
 */
export default function decorate(block) {
  if (block.classList.contains('overlay')) {
    decorateOverlay(block);
    return;
  }

  // Default cards decoration.
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) {
      li.append(row.firstElementChild);
    }
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.firstElementChild.tagName === 'PICTURE') {
        div.className = 'cards-card-image';
      } else {
        div.className = 'cards-card-body';
      }
    });
    ul.append(li);
  });
  block.replaceChildren(ul);
}
