/**
 * Decorate the herovideo block.
 * Authored table: single row, four cells:
 *   cell[0] = video asset (anchor to .mp4 or picture element)
 *   cell[1] = heading text
 *   cell[2] = primary CTA link (PLAY FULL VIDEO)
 *   cell[3] = secondary CTA link (LEARN MORE)
 * Section-metadata provides poster, subtitles, transcript via section.dataset.
 * @param {Element} block the herovideo block element
 */
export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const firstRow = rows[0];
  if (!firstRow) return;

  const cells = [...firstRow.querySelectorAll(':scope > div')];

  const videoCell = cells[0];
  const headingCell = cells[1];
  const primaryCtaCell = cells[2];
  const secondaryCtaCell = cells[3];

  // Build video element from authored cell.
  // Cell may contain an <a> linking to an .mp4, or a <picture>/<img>.
  const video = document.createElement('video');
  video.setAttribute('aria-label', 'Video');
  video.setAttribute('tabindex', '0');
  video.setAttribute('playsinline', '');
  video.setAttribute('loop', '');
  video.setAttribute('muted', '');

  if (videoCell) {
    const anchor = videoCell.querySelector('a');
    const picture = videoCell.querySelector('picture');
    if (anchor && anchor.href) {
      const source = document.createElement('source');
      source.setAttribute('src', anchor.href);
      const mimeType = anchor.href.endsWith('.mp4') ? 'video/mp4'
        : anchor.href.endsWith('.webm') ? 'video/webm'
        : anchor.href.endsWith('.ogg') ? 'video/ogg'
        : 'video/mp4';
      source.setAttribute('type', mimeType);
      video.append(source);
    } else if (picture) {
      const img = picture.querySelector('img');
      if (img && img.src) {
        const source = document.createElement('source');
        source.setAttribute('src', img.src);
        source.setAttribute('type', 'video/mp4');
        video.append(source);
      }
    }
  }

  // Apply section-metadata poster, subtitles, transcript if available.
  const section = block.closest('.section');
  if (section) {
    const poster = section.dataset.poster;
    const subtitles = section.dataset.subtitles;
    const transcript = section.dataset.transcript;
    if (poster) {
      video.setAttribute('poster', poster);
    }
    if (subtitles) {
      const track = document.createElement('track');
      track.setAttribute('kind', 'subtitles');
      track.setAttribute('src', subtitles);
      track.setAttribute('default', '');
      video.append(track);
    }
    if (transcript) {
      video.setAttribute('data-transcript', transcript);
    }
  }

  // Video wrapper for keyboard interaction and positioning.
  const videoWrapper = document.createElement('div');
  videoWrapper.classList.add('herovideo-media');
  videoWrapper.append(video);

  // Keyboard play/pause on the video element.
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

  // Visually-hidden playback helper text (screen-reader and keyboard users).
  const helperText = document.createElement('p');
  helperText.classList.add('herovideo-helper');
  helperText.textContent = 'Press Enter or Space to play or pause the video.';

  // Heading from cell[1].
  const heading = document.createElement('h2');
  heading.classList.add('herovideo-heading');
  if (headingCell) {
    const existingHeading = headingCell.querySelector('h1, h2, h3, h4, h5, h6');
    if (existingHeading) {
      heading.textContent = existingHeading.textContent;
    } else {
      heading.textContent = headingCell.textContent.trim();
    }
  }

  // CTA container.
  const ctaContainer = document.createElement('div');
  ctaContainer.classList.add('herovideo-ctas');

  // Primary CTA: PLAY FULL VIDEO.
  const primaryCta = document.createElement('a');
  primaryCta.classList.add('herovideo-cta', 'herovideo-cta-primary');
  if (primaryCtaCell) {
    const existingAnchor = primaryCtaCell.querySelector('a');
    if (existingAnchor) {
      primaryCta.setAttribute('href', existingAnchor.href);
      primaryCta.textContent = existingAnchor.textContent.trim() || 'PLAY FULL VIDEO';
    } else {
      primaryCta.setAttribute('href', '#');
      primaryCta.textContent = primaryCtaCell.textContent.trim() || 'PLAY FULL VIDEO';
    }
  } else {
    primaryCta.setAttribute('href', '#');
    primaryCta.textContent = 'PLAY FULL VIDEO';
  }
  const headingText = heading.textContent.trim();
  if (headingText) {
    primaryCta.setAttribute('aria-label', primaryCta.textContent + ' about ' + headingText);
  }

  // Secondary CTA: LEARN MORE.
  const secondaryCta = document.createElement('a');
  secondaryCta.classList.add('herovideo-cta', 'herovideo-cta-secondary');
  if (secondaryCtaCell) {
    const existingAnchor = secondaryCtaCell.querySelector('a');
    if (existingAnchor) {
      secondaryCta.setAttribute('href', existingAnchor.href);
      secondaryCta.textContent = existingAnchor.textContent.trim() || 'LEARN MORE';
    } else {
      secondaryCta.setAttribute('href', '#');
      secondaryCta.textContent = secondaryCtaCell.textContent.trim() || 'LEARN MORE';
    }
  } else {
    secondaryCta.setAttribute('href', '#');
    secondaryCta.textContent = 'LEARN MORE';
  }
  if (headingText) {
    secondaryCta.setAttribute('aria-label', secondaryCta.textContent + ' about ' + headingText);
  }

  ctaContainer.append(primaryCta, secondaryCta);

  // Content overlay: helper text, heading, CTAs layered over video.
  const overlay = document.createElement('div');
  overlay.classList.add('herovideo-overlay');
  overlay.append(helperText, heading, ctaContainer);

  // Assemble block in captured content sequence:
  // video affordance → playback helper text → heading → calls to action.
  block.replaceChildren(videoWrapper, overlay);
}
