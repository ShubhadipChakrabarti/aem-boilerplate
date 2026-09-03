/**
 * Hero Video block
 *
 * Authored table structure (single row, four cells):
 *   cell[0] – video asset: a link whose href is the .mp4 URL, OR a plain-text URL,
 *              OR a <picture>/<source> element whose src/srcset contains the video path.
 *              May also contain a <p> whose text starts with "Press" — treated as
 *              the playback helper text.
 *   cell[1] – heading text (e.g. "DISNEY IMAGINATION CAMPUS - STUDENT TRAVEL REIMAGINED")
 *   cell[2] – primary CTA link (visible label: "PLAY FULL VIDEO")
 *   cell[3] – secondary CTA link (visible label: "LEARN MORE")
 *
 * Section-metadata values read at runtime (populated by EDS pipeline before decorate runs):
 *   section.dataset.poster     – poster image URL
 *   section.dataset.subtitles  – VTT subtitle track URL
 *   section.dataset.transcript – transcript URL
 *
 * @param {HTMLElement} block the hero-video block element
 */
export default function decorate(block) {
  // ── 1. Read authored cells ────────────────────────────────────────────────
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const cells = Array.from(row.querySelectorAll(':scope > div'));
  const [videoCell, headingCell, primaryCtaCell, secondaryCtaCell] = cells;

  // ── 2. Sanitize URLs — allow only relative paths and http/https ───────────
  /**
   * Returns the trimmed URL string when it is a safe relative path or
   * an http/https absolute URL; returns null for all other schemes
   * (including javascript: and data:) to prevent injection.
   *
   * @param {string|null|undefined} raw
   * @returns {string|null}
   */
  function sanitizeSrc(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
    return null;
  }

  /**
   * Returns a safe href for CTA anchors.
   * Allows relative paths, http/https, and fragment-only (#…) hrefs.
   * Falls back to '#' for anything else.
   *
   * @param {string|null|undefined} href
   * @returns {string}
   */
  function sanitizeHref(href) {
    if (!href) return '#';
    const trimmed = href.trim();
    if (/^(https?:\/\/|\/|#|\.\.\/|\.\/)/i.test(trimmed)) return trimmed;
    return '#';
  }

  // ── 3. Extract video src (three fallback strategies) ─────────────────────
  let videoSrc = null;
  if (videoCell) {
    // Priority 1: <a href="…"> inside the cell
    const anchor = videoCell.querySelector('a');
    if (anchor) {
      videoSrc = sanitizeSrc(anchor.getAttribute('href'));
    }
    // Priority 2: <source srcset="…"> or <source src="…">
    if (!videoSrc) {
      const source = videoCell.querySelector('source');
      if (source) {
        videoSrc = sanitizeSrc(source.getAttribute('srcset') || source.getAttribute('src'));
      }
    }
    // Priority 3: plain text content of the cell
    if (!videoSrc) {
      videoSrc = sanitizeSrc(videoCell.textContent.trim());
    }
  }

  // ── 4. Extract playback helper text from authored DOM ────────────────────
  // Look for a <p> inside videoCell whose text starts with "Press".
  // Re-using the authored node preserves authorability and translatability.
  let helperNode = null;
  if (videoCell) {
    const paragraphs = videoCell.querySelectorAll('p');
    paragraphs.forEach((p) => {
      if (!helperNode && p.textContent.trim().startsWith('Press')) {
        helperNode = p;
      }
    });
  }

  // ── 5. Extract heading text ───────────────────────────────────────────────
  const headingText = headingCell ? headingCell.textContent.trim() : '';

  // ── 6. Extract CTA anchor elements ───────────────────────────────────────
  const primaryCtaEl = primaryCtaCell ? primaryCtaCell.querySelector('a') : null;
  const secondaryCtaEl = secondaryCtaCell ? secondaryCtaCell.querySelector('a') : null;

  // ── 7. Read section-metadata values from section dataset ─────────────────
  const section = block.closest('.section');
  const poster = sanitizeSrc((section && section.dataset.poster) || '');
  const subtitlesSrc = sanitizeSrc((section && section.dataset.subtitles) || '');

  // ── 8. Build <video> element via DOM APIs only ────────────────────────────
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('tabindex', '0');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('aria-label', headingText || 'Hero video');

  if (poster) {
    video.setAttribute('poster', poster);
  }

  if (videoSrc) {
    const sourceEl = document.createElement('source');
    sourceEl.setAttribute('src', videoSrc);
    sourceEl.setAttribute('type', videoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4');
    video.appendChild(sourceEl);
  }

  if (subtitlesSrc) {
    const track = document.createElement('track');
    track.setAttribute('kind', 'subtitles');
    track.setAttribute('src', subtitlesSrc);
    track.setAttribute('default', '');
    video.appendChild(track);
  }

  // ── 9. Keyboard play/pause handler (Enter or Space) ──────────────────────
  video.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  });

  // ── 10. Build helper text element ────────────────────────────────────────
  // Re-use the authored node when present; do not inject a hardcoded string.
  if (helperNode) {
    helperNode.setAttribute('role', 'status');
    helperNode.classList.add('hero-video-helper');
  }

  // ── 11. Build heading element ─────────────────────────────────────────────
  const heading = document.createElement('h1');
  heading.classList.add('hero-video-heading');
  if (headingCell) {
    // Move child nodes from the authored cell to preserve any inline markup.
    while (headingCell.firstChild) {
      heading.appendChild(headingCell.firstChild);
    }
  }

  // ── 12. Build CTA anchors ─────────────────────────────────────────────────
  const ctaWrapper = document.createElement('div');
  ctaWrapper.classList.add('hero-video-cta-wrapper');

  if (primaryCtaEl) {
    const href = sanitizeHref(primaryCtaEl.getAttribute('href'));
    const label = primaryCtaEl.textContent.trim();
    const primaryLink = document.createElement('a');
    primaryLink.setAttribute('href', href);
    primaryLink.setAttribute(
      'aria-label',
      headingText ? `${label} about ${headingText}` : label,
    );
    primaryLink.classList.add('hero-video-cta', 'hero-video-cta--primary');
    primaryLink.textContent = label;
    ctaWrapper.appendChild(primaryLink);
  }

  if (secondaryCtaEl) {
    const href = sanitizeHref(secondaryCtaEl.getAttribute('href'));
    const label = secondaryCtaEl.textContent.trim();
    const secondaryLink = document.createElement('a');
    secondaryLink.setAttribute('href', href);
    secondaryLink.setAttribute(
      'aria-label',
      headingText ? `${label} about ${headingText}` : label,
    );
    secondaryLink.classList.add('hero-video-cta', 'hero-video-cta--secondary');
    secondaryLink.textContent = label;
    ctaWrapper.appendChild(secondaryLink);
  }

  // ── 13. Build overlay panel (heading + CTAs) ──────────────────────────────
  const infoPanel = document.createElement('div');
  infoPanel.classList.add('hero-video-info');
  infoPanel.appendChild(heading);
  infoPanel.appendChild(ctaWrapper);

  // ── 14. Assemble block in required order: video, helper text, overlay ─────
  // Clear all authored rows from the block before appending new structure.
  block.replaceChildren();

  block.appendChild(video);
  if (helperNode) {
    block.appendChild(helperNode);
  }
  block.appendChild(infoPanel);
}
