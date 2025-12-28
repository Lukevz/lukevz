/**
 * Note List Module
 * Renders and manages the list of posts
 */

import { formatDate } from '../../utils/dom.js';
import { hiddenTags } from '../../config/constants.js';

/**
 * Render filtered list of posts
 * @param {Object} state - App state
 * @param {HTMLElement} postsListElement - DOM element to render posts into
 * @param {string} tag - Current filter tag
 */
export function renderPosts(state, postsListElement, tag = 'all') {
  // Include all posts (including Garden Readme)
  const filtered = tag === 'all'
    ? state.posts
    : state.posts.filter(post =>
        post.tags.some(t => t === tag || t.startsWith(tag + '/'))
      );

  // Update count in sidebar for "All Notes"
  if (tag === 'all') {
    const allNotesCount = document.getElementById('allNotesCount');
    if (allNotesCount) {
      allNotesCount.textContent = filtered.length;
    }
  }

  // Update tag buttons
  document.querySelectorAll('.tag-item').forEach(btn => {
    const isActive = btn.dataset.tag === tag;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  // Clear Garden Readme active state when a tag is selected
  const gardenReadmeBtn = document.querySelector('.garden-readme-item');
  if (gardenReadmeBtn) {
    gardenReadmeBtn.classList.remove('active');
    gardenReadmeBtn.removeAttribute('aria-current');
  }

  if (filtered.length === 0) {
    postsListElement.innerHTML = `
      <li class="empty-state">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No notes found</p>
      </li>
    `;
    return;
  }

  // Sort by date (newest first)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  postsListElement.innerHTML = sorted.map(post => `
    <li class="post-item${state.currentPost?.filename === post.filename ? ' active' : ''}"
        data-filename="${post.filename}"
        tabindex="0"
        role="button"
        aria-label="Open ${post.title}">
      <h3 class="post-item-title">${post.title}</h3>
      <time class="post-item-date" datetime="${post.date}">${formatDate(post.date)}</time>
    </li>
  `).join('');
}
