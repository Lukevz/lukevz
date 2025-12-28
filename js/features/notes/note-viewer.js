/**
 * Note Viewer Module
 * Handles rendering and displaying individual notes
 */

import { formatDate } from '../../utils/dom.js';
import { hiddenTags } from '../../config/constants.js';
import { parseMarkdown } from '../../utils/markdown.js';
import { updateNoteUrl } from './url-router.js';

/**
 * Render a note in the viewer pane
 * @param {Object} post - Post to render
 * @param {Object} elements - DOM elements
 * @param {Object} state - App state
 * @param {boolean} updateUrl - Whether to update the URL
 */
export function renderNote(post, elements, state, updateUrl = true) {
  if (!post) {
    elements.noteEmpty.classList.remove('hidden');
    elements.noteContent.classList.add('hidden');
    if (updateUrl) {
      updateNoteUrl(null);
    }
    return;
  }

  elements.noteEmpty.classList.add('hidden');
  elements.noteContent.classList.remove('hidden');

  elements.noteTitle.textContent = post.title;
  elements.noteDate.textContent = formatDate(post.date);
  elements.noteDate.setAttribute('datetime', post.date);

  // Filter out hidden tags from display
  const visibleTags = post.tags.filter(tag => {
    const rootTag = tag.split('/')[0];
    return !hiddenTags.includes(rootTag);
  });

  elements.noteTags.innerHTML = visibleTags
    .map(tag => `<span class="note-tag">#${tag}</span>`)
    .join('');

  const parsedContent = parseMarkdown(post.body);
  elements.noteBody.innerHTML = parsedContent;

  // Add back button for mobile
  if (!document.querySelector('.note-back')) {
    const backBtn = document.createElement('button');
    backBtn.className = 'note-back';
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span>Back</span>
    `;

    // Track if touch was used to prevent double-firing
    let touchUsed = false;

    // Handle touch events for better mobile responsiveness
    backBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchUsed = true;
      closeNote(elements, state);
      // Reset flag after a short delay
      setTimeout(() => { touchUsed = false; }, 300);
    });

    // Handle click for desktop and as fallback
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Skip if touch already handled this
      if (touchUsed) return;
      closeNote(elements, state);
    });

    elements.noteView.insertBefore(backBtn, elements.noteView.firstChild);
  }

  // Show note view on mobile
  elements.noteView.classList.add('active');

  // Update post list active state
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.toggle('active', item.dataset.filename === post.filename);
  });

  // Update Garden Readme button active state
  const gardenReadmeBtn = document.querySelector('.garden-readme-item');
  if (gardenReadmeBtn) {
    const isGardenReadme = post.filename === 'Garden Readme.md';
    gardenReadmeBtn.classList.toggle('active', isGardenReadme);
    gardenReadmeBtn.setAttribute('aria-current', isGardenReadme ? 'true' : 'false');

    // Also update tag buttons to remove active state when Garden Readme is open
    if (isGardenReadme) {
      document.querySelectorAll('.tag-item:not(.garden-readme-item)').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      });
    }
  }

  // Scroll to top of note
  elements.noteView.scrollTop = 0;

  // Update URL to reflect current note
  if (updateUrl) {
    updateNoteUrl(post);
  }
}

/**
 * Close the note viewer
 * @param {Object} elements - DOM elements
 * @param {Object} state - App state
 */
export function closeNote(elements, state) {
  if (elements.noteView) {
    elements.noteView.classList.remove('active');
  }
  state.currentPost = null;
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.remove('active');
  });
  // Update URL to clear note hash
  updateNoteUrl(null);
}
