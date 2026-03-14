/**
 * Vestaboard-style flight board
 * 36 columns × 10 rows of split-flap tiles
 */

import flights from './flights.js';

const COLS = 36;
const ROWS = 10;

// Column widths — must sum to COLS - 2 separators = 34
const TITLE_W = 22;
const TYPE_W  = 4;
const DATE_W  = 8;

let currentStatus = 'IN FLIGHT';
let isAnimating = false;
let tileElements = [];
let headerElement = null;

// ---- Board init ----

function initBoard() {
  const grid = document.getElementById('boardGrid');
  if (!grid) return;

  // Header: solid bar with column-aligned labels (matches tile grid columns)
  const header = document.createElement('div');
  header.className = 'vb-board-header';
  const dateLabel = document.createElement('span');
  dateLabel.className = 'vb-board-header-col';
  dateLabel.textContent = 'DATE';
  const titleLabel = document.createElement('span');
  titleLabel.className = 'vb-board-header-col vb-board-header-col-title';
  titleLabel.textContent = 'FLIGHT';
  const typeLabel = document.createElement('span');
  typeLabel.className = 'vb-board-header-col vb-board-header-col-type';
  typeLabel.textContent = 'TYPE';
  header.appendChild(dateLabel);
  header.appendChild(titleLabel);
  header.appendChild(typeLabel);
  grid.appendChild(header);
  headerElement = header;

  // Rows 1–9: flip tiles
  for (let r = 1; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement('div');
      tile.className = 'vb-tile';

      const span = document.createElement('span');
      span.className = 'vb-tile-char';
      span.textContent = ' ';

      tile.appendChild(span);
      grid.appendChild(tile);
      tileElements.push(tile);
    }
  }
}

// ---- Content formatting ----

function padCenter(text, width, fill = '-') {
  const total = width - text.length;
  if (total <= 0) return text.substring(0, width);
  const left = Math.floor(total / 2);
  const right = total - left;
  return fill.repeat(left) + text + fill.repeat(right);
}

/**
 * Build a 10 × 36 character grid for the given status.
 * Returns an array of 10 strings, each exactly 36 chars.
 *
 * Layout:
 *   Row 0 : column labels  "DATE     TITLE                  TYPE "
 *   Rows 1–7 : up to 7 entries  "DATE (8ch) TITLE (22ch) TYPE (4ch)"
 *   Rows 8–9 : blank
 */
function formatBoard(status) {
  const filtered = flights.filter(f => f.status === status);
  const rows = Array.from({ length: ROWS }, () => ' '.repeat(COLS));

  // Row 0: column headers (displayed in solid header bar, not tiles)
  rows[0] = 'DATE'.padEnd(DATE_W) + ' ' + 'TITLE'.padEnd(TITLE_W) + ' ' + 'TYPE'.padEnd(TYPE_W);

  if (filtered.length === 0) {
    rows[5] = padCenter('NO ENTRIES', COLS, ' ');
    return rows;
  }

  // Rows 1–7: entries (up to 7)
  const maxShow = Math.min(filtered.length, ROWS - 2);
  for (let i = 0; i < maxShow; i++) {
    const f = filtered[i];
    const date  = (f.date || '').substring(0, DATE_W).padEnd(DATE_W);
    const title = f.title.toUpperCase().substring(0, TITLE_W).padEnd(TITLE_W);
    const type  = (f.gate || '').toUpperCase().substring(0, TYPE_W).padEnd(TYPE_W);
    rows[1 + i] = date + ' ' + title + ' ' + type;
  }

  return rows;
}

// ---- Tile animation ----

const FLIP_MS = 220;
const COL_DELAY = 18;  // cascade left-to-right (ms per column)
const ROW_DELAY = 4;   // slight stagger per row

const flipSound = new Audio('sounds/flip_burst_short.mp3');

function playFlipSound() {
  flipSound.currentTime = 0;
  flipSound.play().catch(() => {});
}

async function updateBoard(newRows) {
  if (isAnimating) return;
  isAnimating = true;
  playFlipSound();

  // Header labels don't change on tab switch — no update needed

  // Flatten tile rows (1–9) into char-per-tile array
  const newChars = [];
  for (let r = 1; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = newRows[r]?.[c] ?? ' ';
      newChars.push(ch);
    }
  }

  const promises = tileElements.map((tile, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS) + 1;  // tile rows start at 1
    const delay = col * COL_DELAY + row * ROW_DELAY;

    return new Promise(resolve => {
      setTimeout(() => {
        const span = tile.querySelector('.vb-tile-char');
        const next = newChars[i];

        if (span.textContent === next) {
          resolve();
          return;
        }

        tile.classList.add('flipping');

        // Swap character at the midpoint of the flip
        setTimeout(() => { span.textContent = next; }, FLIP_MS / 2);

        // Remove animation class after it completes
        setTimeout(() => {
          tile.classList.remove('flipping');
          resolve();
        }, FLIP_MS);
      }, delay);
    });
  });

  await Promise.all(promises);
  isAnimating = false;
}

// ---- Tab controls ----

function setupTabs() {
  document.querySelectorAll('.vb-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (isAnimating || tab.dataset.status === currentStatus) return;

      document.querySelectorAll('.vb-status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.dataset.status;

      updateBoard(formatBoard(currentStatus));
    });
  });
}

// ---- Work archive (work.html) ----

function renderWorkArchive() {
  const container = document.getElementById('workList');
  if (!container) return;

  const statuses = ['IN FLIGHT', 'ARRIVED', 'CANCELLED'];

  container.innerHTML = statuses.map(status => {
    const filtered = flights.filter(f => f.status === status);
    if (filtered.length === 0) return '';

    return `
      <div class="work-status">
        <div class="work-status-title">${status}</div>
        ${filtered.map(flight => {
          const isExternal = flight.url && (flight.url.startsWith('http') || flight.url.startsWith('//'));
          const tag = flight.url ? 'a' : 'div';
          const attrs = flight.url
            ? `href="${flight.url}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}`
            : '';

          return `
            <${tag} class="work-item" ${attrs}>
              <div class="work-item-header">
                <div class="work-item-title">${escapeHtml(flight.title)}</div>
                <div class="work-item-gate">${escapeHtml(flight.gate)}</div>
              </div>
              ${flight.description ? `<div class="work-item-description">${escapeHtml(flight.description)}</div>` : ''}
            </${tag}>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Hamburger menu ----

function setupMenu() {
  const hamburger = document.getElementById('vbHamburger');
  const menu = document.getElementById('vbMenu');
  const overlay = document.getElementById('vbMenuOverlay');
  const closeBtn = document.getElementById('vbMenuClose');
  if (!hamburger || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    overlay.classList.add('open');
  }

  function closeMenu() {
    menu.classList.remove('open');
    overlay.classList.remove('open');
  }

  hamburger.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
}

// ---- Version selector dropdown ----

function setupVersionSelector() {
  const selector = document.getElementById('vbVersionSelector');
  const btn = document.getElementById('vbVersionBtn');
  if (!selector || !btn) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    selector.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!selector.contains(e.target)) {
      selector.classList.remove('open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') selector.classList.remove('open');
  });
}

// ---- Boot ----

function init() {
  if (document.getElementById('boardGrid')) {
    initBoard();
    setupTabs();
    updateBoard(formatBoard(currentStatus));
  }

  if (document.getElementById('workList')) {
    renderWorkArchive();
  }

  setupMenu();
  setupVersionSelector();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
