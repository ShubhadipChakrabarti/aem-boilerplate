import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// Media query for desktop breakpoint
const MQ = window.matchMedia('(width >= 900px)');

/**
 * Collapses all open nav sections.
 * @param {Element} sections the nav-sections element
 */
function collapseAllNavSections(sections) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Toggles the nav open/closed on mobile.
 * @param {Element} nav the nav element
 * @param {boolean|undefined} forceOpen force open state
 */
function toggleMenu(nav, forceOpen) {
  const expanded = nav.getAttribute('aria-expanded') === 'true';
  const open = forceOpen !== undefined ? forceOpen : !expanded;
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const sections = nav.querySelector('.nav-sections');
  if (sections && !open) collapseAllNavSections(sections);
}

/**
 * Allowlist of safe inline element tag names permitted in the contact bar.
 * Only these tags may be adopted from the fragment; all others are unwrapped
 * to their text content.
 */
const SAFE_INLINE_TAGS = new Set(['A', 'SPAN', 'STRONG', 'EM', 'BR']);

/**
 * Allowlist of permitted anchor href schemes.
 * Any href whose scheme is not in this set is replaced with '#'.
 */
const SAFE_HREF_SCHEMES = new Set(['https:', 'http:', 'tel:', 'mailto:']);

/**
 * Returns true if the given href string is safe to use as an anchor href.
 * Relative paths starting with '/' are also permitted.
 * @param {string} href
 * @returns {boolean}
 */
function isSafeHref(href) {
  if (!href) return false;
  if (href.startsWith('/')) return true;
  try {
    const url = new URL(href);
    return SAFE_HREF_SCHEMES.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Strips all on* event-handler attributes from an element.
 * Operates in-place on the provided element.
 * @param {Element} el
 */
function stripEventHandlers(el) {
  const toRemove = [];
  for (let i = 0; i < el.attributes.length; i += 1) {
    const { name } = el.attributes[i];
    if (name.toLowerCase().startsWith('on')) toRemove.push(name);
  }
  toRemove.forEach((attr) => el.removeAttribute(attr));
}

/**
 * Recursively sanitises a DOM node adopted from an external fragment document
 * before it is inserted into the live document.
 *
 * Rules applied:
 *   - Text nodes are returned as-is (safe by definition).
 *   - Element nodes not in SAFE_INLINE_TAGS are replaced by a sanitised
 *     DocumentFragment containing their sanitised children (unwrapped).
 *   - All on* event-handler attributes are removed from every element.
 *   - Anchor href values are validated against SAFE_HREF_SCHEMES and relative
 *     paths; unsafe values are replaced with '#'.
 *   - All other attributes on non-anchor elements are removed to prevent
 *     data-* or style injection.
 *
 * @param {Node} node - node from the external fragment document
 * @param {Document} targetDoc - the live document (used to create new nodes)
 * @returns {Node|DocumentFragment} sanitised node safe for live DOM insertion
 */
function sanitiseNode(node, targetDoc) {
  // Text nodes are inherently safe.
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDoc.createTextNode(node.textContent);
  }

  // Non-element, non-text nodes (comments, processing instructions, etc.)
  // are discarded by returning an empty fragment.
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return targetDoc.createDocumentFragment();
  }

  const tag = node.tagName.toUpperCase();

  // Sanitise children recursively first.
  const sanitisedChildren = targetDoc.createDocumentFragment();
  node.childNodes.forEach((child) => {
    sanitisedChildren.appendChild(sanitiseNode(child, targetDoc));
  });

  // Elements not in the allowlist are unwrapped — their sanitised children
  // are returned in a fragment without the wrapper element.
  if (!SAFE_INLINE_TAGS.has(tag)) {
    return sanitisedChildren;
  }

  // Create a new element in the target document (never adopt the original).
  const safe = targetDoc.createElement(tag);

  if (tag === 'A') {
    // Validate href scheme; fall back to '#' for unsafe values.
    const rawHref = node.getAttribute('href') || '';
    safe.setAttribute('href', isSafeHref(rawHref) ? rawHref : '#');

    // Preserve target and rel for authored external links.
    const target = node.getAttribute('target');
    if (target === '_blank') {
      safe.setAttribute('target', '_blank');
      // Enforce safe opener behaviour.
      safe.setAttribute('rel', 'noopener noreferrer');
    }
  }
  // No other attributes are copied; on* handlers are never present on
  // newly created elements.

  safe.appendChild(sanitisedChildren);
  return safe;
}

/**
 * Builds the contact bar from the first section of the /nav fragment.
 *
 * Expected authored content (p elements inside the section):
 *   - A paragraph containing the "Questions? Call (321) 939 7560" text,
 *     optionally with a tel: anchor wrapping the phone number.
 *   - A paragraph containing a "Contact Us" anchor.
 *
 * All nodes adopted from the external fragment are passed through
 * sanitiseNode() before insertion into the live document, preventing
 * DOM-based XSS via inline event handlers or javascript: hrefs.
 *
 * @param {Element} section - the raw section element from the fragment
 * @returns {Element} the decorated nav-contact element
 */
function buildContactBar(section) {
  const contact = document.createElement('div');
  contact.className = 'nav-contact';

  const paragraphs = section.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const item = document.createElement('span');
    item.className = 'nav-contact-item';

    // Sanitise every child node from the external fragment before adoption.
    p.childNodes.forEach((child) => {
      item.appendChild(sanitiseNode(child, document));
    });

    contact.appendChild(item);
  });

  return contact;
}

/**
 * Decorates the header block by loading the /nav fragment and
 * constructing the four-area header: contact bar, brand, nav sections, tools.
 * @param {Element} block the header block element
 */
export default async function decorate(block) {
  // Resolve the nav fragment path from page metadata or use the default.
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  const fragment = await loadFragment(navPath);

  // Clear the block and build the nav element.
  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';

  // The /nav fragment is expected to have up to four sections:
  //   [0] contact bar  (Questions?, phone, Contact Us)
  //   [1] brand        (logo / home link)
  //   [2] nav sections (primary navigation UL)
  //   [3] tools        (search, etc.)
  // If the fragment only has three sections (legacy), sections shift:
  //   [0] brand, [1] nav sections, [2] tools — contact bar is omitted gracefully.
  const sections = fragment ? [...fragment.querySelectorAll(':scope > div')] : [];

  // Determine whether a contact bar section is present.
  // Heuristic: four or more sections means the first is the contact bar;
  // three sections falls back to the legacy brand/sections/tools layout.
  const hasContactBar = sections.length >= 4;
  const contactSection = hasContactBar ? sections[0] : null;
  const brandSection = sections[hasContactBar ? 1 : 0] || null;
  const sectionsSection = sections[hasContactBar ? 2 : 1] || null;
  const toolsSection = sections[hasContactBar ? 3 : 2] || null;

  // --- Contact bar ---
  if (contactSection) {
    const contactBar = buildContactBar(contactSection);
    nav.appendChild(contactBar);
  }

  // --- Hamburger (mobile toggle) ---
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.type = 'button';
  hamburgerBtn.setAttribute('aria-controls', 'nav');
  hamburgerBtn.setAttribute('aria-label', 'Open navigation');
  const hamburgerIcon = document.createElement('span');
  hamburgerIcon.className = 'nav-hamburger-icon';
  hamburgerBtn.appendChild(hamburgerIcon);
  hamburger.appendChild(hamburgerBtn);
  nav.appendChild(hamburger);

  // --- Brand ---
  if (brandSection) {
    brandSection.className = 'nav-brand';
    nav.appendChild(brandSection);
  }

  // --- Nav sections ---
  if (sectionsSection) {
    sectionsSection.className = 'nav-sections';
    // Decorate top-level nav items for keyboard and ARIA support.
    sectionsSection.querySelectorAll(':scope > ul > li').forEach((li) => {
      const subMenu = li.querySelector('ul');
      if (subMenu) {
        li.setAttribute('aria-expanded', 'false');
        li.setAttribute('aria-haspopup', 'true');
        // Toggle sub-menu on click (desktop only).
        li.addEventListener('click', () => {
          if (!MQ.matches) return;
          const expanded = li.getAttribute('aria-expanded') === 'true';
          collapseAllNavSections(sectionsSection);
          li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        });
      }
    });
    nav.appendChild(sectionsSection);
  }

  // --- Tools ---
  if (toolsSection) {
    toolsSection.className = 'nav-tools';
    nav.appendChild(toolsSection);
  }

  // --- Hamburger interaction ---
  hamburgerBtn.addEventListener('click', () => toggleMenu(nav));

  // Close nav when switching to desktop.
  MQ.addEventListener('change', () => {
    if (MQ.matches) toggleMenu(nav, false);
  });

  // Keyboard: close nav on Escape.
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(nav, false);
  });

  nav.setAttribute('aria-expanded', 'false');

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.appendChild(nav);
  block.appendChild(navWrapper);
}
