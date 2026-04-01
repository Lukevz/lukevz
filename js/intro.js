/**
 * Intro preloader — interactive d-pad sequence before the main site reveals.
 *
 * WCAG / Accessibility model:
 *  - role="dialog" aria-modal="true" traps the user in the overlay
 *  - D-pad uses the ARIA toolbar composite widget pattern:
 *      · Only ONE button has tabindex="0" at a time (roving tabindex)
 *      · Arrow keys reveal the matching phrase AND advance focus to the next
 *        available button — so keyboard users get the same sequential flow
 *        as pointer/touch users, without needing to Tab through every button
 *      · Tab exits the d-pad group to Skip or Enter?
 *  - aria-pressed="true/false" communicates toggle state to screen readers
 *  - aria-keyshortcuts documents the arrow-key shortcuts on each button
 *  - Live region (role=status, aria-live=polite) announces every reveal
 *  - Focus is managed at every state transition:
 *      · HUD appears   → focus moves to first available d-pad button
 *      · Button used   → focus moves to next available button
 *      · All revealed  → focus moves to Enter? button
 *      · Exit          → focus restored to first topBar button
 *  - Escape = skip at any point
 *  - Arrow keys only fire after the HUD is visible (guards against
 *    premature activation before the narrative moment)
 */
(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────────── */

  const PHRASES = {
    up:    'systems thinker',
    right: 'tinkerer who ships',
    down:  'relentless documentarian',
    left:  'passionate learner'
  };

  /* Canonical order used for roving tabindex "next available" logic */
  const DIRS = ['up', 'right', 'down', 'left'];

  const DIR_KEY = {
    ArrowUp:    'up',
    ArrowDown:  'down',
    ArrowLeft:  'left',
    ArrowRight: 'right'
  };

  /* ── State ──────────────────────────────────────────────── */

  const state = {
    revealed:   [],     // ordered list of revealed direction strings
    hudVisible: false,  // true once HUD has been shown
    completed:  false
  };

  /* ── DOM refs (populated in init) ──────────────────────── */

  let overlay, skipBtn, line1, line2, ellipsis, phraseContainer,
      hud, enterBtn, announcer;

  /* ── Helpers ────────────────────────────────────────────── */

  function announce(text) {
    if (!announcer) return;
    /* Clear first so repeated identical strings still fire the live region */
    announcer.textContent = '';
    requestAnimationFrame(() => { announcer.textContent = text; });
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('intro-hidden', hidden);
  }

  function dpadBtn(dir) {
    return overlay.querySelector(`.dpad-btn[data-dir="${dir}"]`);
  }

  function availableDirs() {
    return DIRS.filter(d => !state.revealed.includes(d));
  }

  /* ── Roving tabindex ────────────────────────────────────── */

  /**
   * Sets tabindex="0" on `activeDir`'s button, tabindex="-1" on all others.
   * Called whenever focus should shift within the d-pad group.
   */
  function setRoving(activeDir) {
    DIRS.forEach(d => {
      const btn = dpadBtn(d);
      if (!btn) return;
      btn.setAttribute('tabindex', d === activeDir ? '0' : '-1');
    });
  }

  /**
   * Focuses the next undiscovered d-pad button.
   * Falls through to the Enter? button once all phrases are revealed.
   */
  function focusNext() {
    const avail = availableDirs();
    if (avail.length > 0) {
      setRoving(avail[0]);
      const btn = dpadBtn(avail[0]);
      if (btn) btn.focus();
    } else if (enterBtn && !enterBtn.classList.contains('intro-hidden')) {
      enterBtn.focus();
    }
  }

  /* ── Focus trap ─────────────────────────────────────────── */

  /**
   * Returns Tab-order elements within the overlay.
   * D-pad buttons with tabindex="-1" are excluded from Tab navigation
   * (they're navigated with arrow keys via roving tabindex instead).
   */
  function getFocusable() {
    return Array.from(
      overlay.querySelectorAll(
        'button:not(:disabled):not([tabindex="-1"])'
      )
    ).filter(el => !el.classList.contains('intro-hidden'));
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ── Phrase reveal ──────────────────────────────────────── */

  function revealPhrase(dir) {
    if (state.revealed.includes(dir) || state.completed) return;

    state.revealed.push(dir);

    /* Mark button as used: dim, set aria-pressed, disable, remove from tab order */
    const btn = dpadBtn(dir);
    if (btn) {
      btn.classList.add('dpad-used');
      btn.setAttribute('aria-pressed', 'true');
      btn.disabled = true;
      btn.setAttribute('tabindex', '-1');
    }

    /* Collapse the waiting ellipsis on first reveal */
    if (state.revealed.length === 1 && ellipsis) {
      ellipsis.classList.add('intro-ellipsis-gone');
    }

    /* Append the new phrase span with a CSS fade-in */
    if (phraseContainer) {
      const span = document.createElement('span');
      span.className = 'intro-phrase';
      const isFirst = state.revealed.length === 1;
      span.textContent = (isFirst ? '\u00a0a\u00a0' : ',\u00a0') + PHRASES[dir];
      phraseContainer.appendChild(span);
      requestAnimationFrame(() => span.classList.add('intro-phrase-in'));
    }

    /* Announce to screen readers */
    const remaining = 4 - state.revealed.length;
    if (remaining > 0) {
      announce(`${PHRASES[dir]} — ${remaining} more to discover.`);
    } else {
      announce('All traits discovered!');
    }

    /* Manage focus after reveal */
    if (state.revealed.length === 4) {
      setTimeout(showEnterPrompt, 650);
    } else if (state.hudVisible) {
      /* Move focus to the next available d-pad button */
      requestAnimationFrame(focusNext);
    }
  }

  /* ── Enter prompt ───────────────────────────────────────── */

  function showEnterPrompt() {
    if (!enterBtn) return;
    setHidden(enterBtn, false);
    requestAnimationFrame(() => enterBtn.classList.add('intro-enter-in'));
    /* focusNext() routes here automatically once all dirs are used */
    setTimeout(focusNext, 500);
    announce('All traits revealed. Press Enter or tap the button to continue.');
  }

  /* ── Complete ───────────────────────────────────────────── */

  function complete() {
    if (state.completed) return;
    state.completed = true;

    document.removeEventListener('keydown', handleKey);
    overlay.removeEventListener('keydown', trapFocus);

    const stage = overlay.querySelector('.intro-stage');

    /* Fade out text + HUD simultaneously */
    if (stage) {
      stage.style.transition = 'opacity 0.4s ease';
      stage.style.opacity = '0';
    }
    if (hud) {
      hud.style.transition = 'opacity 0.3s ease';
      hud.style.opacity = '0';
    }

    /* Swap in final headline */
    setTimeout(() => {
      if (stage) {
        stage.innerHTML = '';
        const h = document.createElement('p');
        h.className = 'intro-final-headline';
        h.id = 'introFinalHeadline';
        h.textContent = 'welcome to the mind of a digital architect';
        stage.appendChild(h);
        stage.style.opacity = '';
        stage.style.transition = '';
        requestAnimationFrame(() => h.classList.add('intro-final-in'));
        /* Focus the headline so screen readers hear it immediately */
        h.setAttribute('tabindex', '-1');
        h.focus();
      }
      announce('welcome to the mind of a digital architect');
    }, 420);

    setTimeout(exitIntro, 2800);
  }

  /* ── Skip ───────────────────────────────────────────────── */

  function skip() {
    if (state.completed) return;
    state.completed = true;
    document.removeEventListener('keydown', handleKey);
    overlay.removeEventListener('keydown', trapFocus);
    exitIntro();
  }

  /* ── Exit ───────────────────────────────────────────────── */

  function exitIntro() {
    document.body.classList.add('intro-done');
    overlay.classList.add('intro-slide-out');

    setTimeout(() => {
      overlay.remove();
      const firstFocusable = document.querySelector(
        '#topBar button:not([disabled]), #topBar a'
      );
      if (firstFocusable) firstFocusable.focus();
    }, 800);
  }

  /* ── Keyboard handler ───────────────────────────────────── */

  function handleKey(e) {
    if (state.completed) return;

    /* Arrow keys: reveal phrase + advance focus within d-pad.
       Guard: only active after the HUD is visible so the interaction
       matches the visual moment in the narrative sequence. */
    if (DIR_KEY[e.key]) {
      if (!state.hudVisible) return;
      e.preventDefault();
      revealPhrase(DIR_KEY[e.key]);
      return;
    }

    switch (e.key) {
      case 'Enter':
        /* Only fire if all 4 phrases have been revealed */
        if (state.revealed.length === 4) {
          e.preventDefault();
          complete();
        }
        break;
      case 'Escape':
        skip();
        break;
    }
  }

  /* ── Timed sequence ─────────────────────────────────────── */

  function runSequence() {
    /* Line 1 */
    setTimeout(() => {
      if (line1) line1.classList.add('intro-line-in');
    }, 500);

    /* Line 2 */
    setTimeout(() => {
      if (!line2) return;
      setHidden(line2, false);
      requestAnimationFrame(() => line2.classList.add('intro-line-in'));
      line2.removeAttribute('aria-hidden');
    }, 2100);

    /* D-pad HUD */
    setTimeout(() => {
      if (!hud) return;
      setHidden(hud, false);
      requestAnimationFrame(() => hud.classList.add('intro-hud-in'));

      /* Initialise roving tabindex — all buttons get -1 except the first */
      const firstDir = availableDirs()[0];
      if (firstDir) setRoving(firstDir);

      state.hudVisible = true;

      /* Announce and focus after the CSS transition settles (~500 ms) */
      setTimeout(() => {
        announce(
          'Directional pad ready. Use the arrow keys — or Tab to a button ' +
          'and press Space or Enter — to reveal who I am.'
        );
        focusNext();
      }, 520);
    }, 3200);
  }

  /* ── Init ───────────────────────────────────────────────── */

  function init() {
    overlay         = document.getElementById('introOverlay');
    if (!overlay) return;

    skipBtn         = document.getElementById('introSkip');
    line1           = document.getElementById('introLine1');
    line2           = document.getElementById('introLine2');
    ellipsis        = document.getElementById('introEllipsis');
    phraseContainer = document.getElementById('introPhraseContainer');
    hud             = document.getElementById('introHud');
    enterBtn        = document.getElementById('introEnterBtn');
    announcer       = document.getElementById('introAnnouncer');

    /* Initialise all d-pad buttons with tabindex="-1" so they're out of
       the Tab order until the HUD appears and roving tabindex is set */
    overlay.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('click', () => revealPhrase(btn.dataset.dir));
    });

    if (skipBtn)  skipBtn.addEventListener('click', skip);
    if (enterBtn) enterBtn.addEventListener('click', complete);

    document.addEventListener('keydown', handleKey);
    overlay.addEventListener('keydown', trapFocus);

    /* Initial focus on the skip button */
    setTimeout(() => { if (skipBtn) skipBtn.focus(); }, 650);

    runSequence();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
