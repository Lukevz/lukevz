// ── Markdown → HTML (for case study bodies from Bear) ──
    function mdToHTML(md) {
      if (!md) return '';
      const lines = md.split('\n');
      let html = '';
      let inUL = false;
      let inOL = false;
      let inBQ = false;

      function closeUL() { if (inUL) { html += '</ul>'; inUL = false; } }
      function closeOL() { if (inOL) { html += '</ol>'; inOL = false; } }
      function closeBQ() { if (inBQ) { html += '</blockquote>'; inBQ = false; } }

      function inline(t) {
        return t
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      }

      for (const line of lines) {
        const t = line.trim();

        if (!t) { closeUL(); closeOL(); closeBQ(); continue; }

        if (/^#{1} /.test(t))       { closeUL(); closeOL(); closeBQ(); html += `<h1>${inline(t.slice(2))}</h1>`; }
        else if (/^## /.test(t))    { closeUL(); closeOL(); closeBQ(); html += `<h2>${inline(t.slice(3))}</h2>`; }
        else if (/^### /.test(t))   { closeUL(); closeOL(); closeBQ(); html += `<h3>${inline(t.slice(4))}</h3>`; }
        else if (/^#### /.test(t))  { closeUL(); closeOL(); closeBQ(); html += `<h4>${inline(t.slice(5))}</h4>`; }
        else if (/^---+$/.test(t))  { closeUL(); closeOL(); closeBQ(); html += '<hr>'; }
        else if (/^> /.test(line))  {
          closeUL(); closeOL();
          if (!inBQ) { html += '<blockquote>'; inBQ = true; }
          const bqContent = t.slice(2);
          html += bqContent ? `<p>${inline(bqContent)}</p>` : '';
        }
        else if (/^[-*] /.test(t))  {
          closeOL(); closeBQ();
          if (!inUL) { html += '<ul>'; inUL = true; }
          html += `<li>${inline(t.slice(2))}</li>`;
        }
        else if (/^\d+\. /.test(t)) {
          closeUL(); closeBQ();
          if (!inOL) { html += '<ol>'; inOL = true; }
          html += `<li>${inline(t.replace(/^\d+\. /, ''))}</li>`;
        }
        else { closeUL(); closeOL(); closeBQ(); html += `<p>${inline(t)}</p>`; }
      }

      closeUL(); closeOL(); closeBQ();
      return html;
    }

    // ── Heading char animation helpers ──
    function splitChars(el) {
      // Split on ANY HTML tag, preserving tags intact; only wrap text nodes
      const parts = el.innerHTML.split(/(<[^>]+>)/gi);
      el.innerHTML = parts.map(part => {
        if (/^</.test(part)) return part; // keep tags as-is
        return part.split(/( +)/).map(seg => {
          if (!seg) return seg;
          if (/^ +$/.test(seg)) return seg.replace(/ /g, '<span class="char">\u00a0</span>');
          return `<span class="word">${[...seg].map(ch => `<span class="char">${ch}</span>`).join('')}</span>`;
        }).join('');
      }).join('');
      return Array.from(el.querySelectorAll('.char'));
    }

    function animateHeadingIn(el, startDelay = 0) {
      const chars = splitChars(el);
      chars.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(22px)'; });
      anime({
        targets: chars,
        opacity:    1,
        translateY: 0,
        duration: 700,
        easing: 'cubicBezier(0.16,1,0.3,1)',
        delay: anime.stagger(22, { start: startDelay }),
        complete: () => {
          const vetPath = el.querySelector('.vet-path');
          if (vetPath) {
            const len = vetPath.getTotalLength();
            vetPath.style.strokeDasharray  = len;
            vetPath.style.strokeDashoffset = len;
            anime({ targets: vetPath, strokeDashoffset: 0, duration: 900, easing: 'cubicBezier(0.16,1,0.3,1)' });
          }
        }
      });
    }

    function animateHeadingOut(el, cb) {
      const chars = Array.from(el.querySelectorAll('.char'));
      if (!chars.length) { cb(); return; }
      anime({
        targets: chars,
        opacity:    0,
        translateY: -12,
        duration: 180,
        easing: 'easeInQuad',
        delay: anime.stagger(8, { from: 'last' }),
        complete: cb
      });
    }

    // ── Entrance ──
    animateHeadingIn(document.querySelector('h1'), 80);

    anime({
      targets: '.app',
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 900,
      easing: 'cubicBezier(0.16,1,0.3,1)',
      delay: anime.stagger(70, { start: 420 })
    });

    // ── Panel ──
    const backdrop   = document.getElementById('panelBackdrop');
    const panel      = document.getElementById('panel');
    const panelTitle = document.getElementById('panelTitle');
    const panelBack  = document.getElementById('panelBack');
    let panelOpen = false;

    function openPanel(btn, originEl) {
      if (panelOpen) return;
      panelOpen = true;

      const r  = originEl.getBoundingClientRect();
      const ox = (r.left + r.width  / 2) - window.innerWidth  / 2;
      const oy = (r.top  + r.height / 2) - window.innerHeight / 2;
      panel.style.transformOrigin = `calc(50% + ${ox}px) calc(50% + ${oy}px)`;

      panelTitle.textContent = btn.dataset.app;
      backdrop.style.pointerEvents = 'all';

      anime.remove([backdrop, panel]);
      anime({ targets: backdrop, opacity: [0, 1], duration: 550, easing: 'easeOutQuad' });
      anime({ targets: panel, scale: [0.04, 1], opacity: [0, 1], duration: 700, easing: 'cubicBezier(0.16,1,0.3,1)' });
    }

    // App buttons handled by hash router below

    // ── Case study data (from JSON) ──
    let caseStudies = {};
    fetch('/content/studio/index.json')
      .then(r => r.json())
      .then(data => { caseStudies = data; })
      .catch(() => {});

    const panelContent = document.getElementById('panelContent');

    document.querySelectorAll('.study').forEach(btn => {
      btn.addEventListener('click', () => {
        const cs = caseStudies[btn.dataset.case];
        if (!cs) return;
        panelTitle.textContent = cs.title;
        panelContent.innerHTML = `
          <div class="cs-meta">
            <div class="cs-meta-item"><span class="cs-meta-label">Company</span><span class="cs-meta-value">${cs.company}</span></div>
            <div class="cs-meta-item"><span class="cs-meta-label">Role</span><span class="cs-meta-value">${cs.role}</span></div>
            <div class="cs-meta-item"><span class="cs-meta-label">Timeline</span><span class="cs-meta-value">${cs.timeline}</span></div>
            <div class="cs-meta-item"><span class="cs-meta-label">Tools</span><span class="cs-meta-value">${cs.tools}</span></div>
          </div>
          <div class="cs-body">${mdToHTML(cs.body)}</div>
        `;
        openPanel(btn, btn.querySelector('.study-card'));
      });
    });

    function closePanel() {
      if (!panelOpen) return;
      panelOpen = false;
      backdrop.style.pointerEvents = 'none';

      anime.remove([backdrop, panel]);
      anime({
        targets: backdrop,
        opacity: 0,
        duration: 450,
        easing: 'easeInQuad'
      });
      anime({
        targets: panel,
        scale:   0.04,
        opacity: 0,
        duration: 500,
        easing: 'cubicBezier(0.7,0,0.84,0)'
      });
    }

    panelBack.addEventListener('click', closePanel);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePanel(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

    // ── Hire Me toggle ──
    const hireBtn      = document.getElementById('hireBtn');
    const avatarImg    = document.getElementById('avatarImg');
    const launchpad    = document.querySelector('.launchpad');
    const portfolioGrid = document.getElementById('portfolioGrid');
    const heading      = document.querySelector('h1');
    // Captured before splitText mutates innerHTML
    const defaultHeadline = "Hi, I'm Luke";
    const hireHeadline    = 'Senior Product Designer designing <a href="https://instinct.vet/" target="_blank" rel="noopener" class="vet-link">software for veterinarians<svg class="vet-underline" viewBox="0 0 240 8" preserveAspectRatio="none" aria-hidden="true"><path class="vet-path" d="M1,5 C22,2 45,7 75,4 C105,1 128,7 155,4 C180,1 205,6 239,4" fill="none" stroke="#3a3d45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>.';
    const descEl          = document.querySelector('.description');
    const defaultDesc     = descEl.innerHTML;
    const hireDesc        = `I think in systems, design in details, and am always chasing the pattern that makes something complicated feel completely obvious.`;
    let portfolioMode  = false;

    hireBtn.addEventListener('click', () => {
      portfolioMode = !portfolioMode;
      hireBtn.classList.toggle('active', portfolioMode);
      hireBtn.setAttribute('aria-checked', portfolioMode);
      history.pushState(null, '', portfolioMode ? '?hire' : location.pathname);

      // Swap headshot
      if (avatarImg) {
        avatarImg.src = portfolioMode ? '/src/img/headshot-work.jpg' : '/src/img/headshot-personal.jpg';
      }

      // Swap headline + description
      animateHeadingOut(heading, () => {
        heading.innerHTML = portfolioMode ? hireHeadline : defaultHeadline;
        // Pre-hide vet-path so it doesn't flash before the char animation finishes
        if (portfolioMode) {
          const vp = heading.querySelector('.vet-path');
          if (vp) { const l = vp.getTotalLength(); vp.style.strokeDasharray = l; vp.style.strokeDashoffset = l; }
        }
        animateHeadingIn(heading);
      });
      anime({
        targets: descEl,
        opacity: 0,
        duration: 180,
        easing: 'easeInQuad',
        complete: () => {
          descEl.innerHTML = portfolioMode ? hireDesc : defaultDesc;
          anime({ targets: descEl, opacity: 1, duration: 350, easing: 'easeOutQuad' });
          if (portfolioMode) {
            const vetPath = descEl.querySelector('.vet-path');
            if (vetPath) {
              const len = vetPath.getTotalLength();
              vetPath.style.strokeDasharray  = len;
              vetPath.style.strokeDashoffset = len;
              anime({ targets: vetPath, strokeDashoffset: 0, duration: 900, delay: 250, easing: 'cubicBezier(0.16,1,0.3,1)' });
            }
          }
        }
      });

      // Show/hide now strip
      const nowStripEl = document.getElementById('nowStrip');
      if (nowStripEl) nowStripEl.style.display = portfolioMode ? 'none' : '';

      if (portfolioMode) {
        anime({
          targets: launchpad,
          opacity: 0, scale: 0.95,
          duration: 280, easing: 'easeInQuad',
          complete: () => {
            launchpad.style.display = 'none';
            // Clear any stale inline styles before showing portfolio
            portfolioGrid.style.opacity = '';
            portfolioGrid.style.transform = '';
            portfolioGrid.style.display = 'grid';
            anime({ targets: '.study', opacity: [0, 1], translateY: [14, 0], duration: 600,
              easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(55) });
          }
        });
      } else {
        anime({
          targets: portfolioGrid,
          opacity: 0, scale: 0.95,
          duration: 280, easing: 'easeInQuad',
          complete: () => {
            portfolioGrid.style.display = 'none';
            // Clear stale inline styles before showing launchpad
            launchpad.style.opacity = '';
            launchpad.style.transform = '';
            launchpad.style.display = 'flex';
            anime({ targets: '.app', opacity: [0, 1], translateY: [14, 0], duration: 600,
              easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(55) });
          }
        });
      }
    });

    // ── Power → fade to black → version ──
    const powerBtn      = document.getElementById('powerBtn');
    const powerFade     = document.getElementById('powerFade');
    const versionScreen = document.getElementById('versionScreen');

    // Generate star field
    const tmBg = document.querySelector('.tm-bg');
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div');
      const size = Math.random() < 0.15 ? 2 : 1;
      s.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:#fff;
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        opacity:${(Math.random()*0.5+0.1).toFixed(2)};
      `;
      tmBg.appendChild(s);
    }

    powerBtn.addEventListener('click', () => {
      powerFade.style.pointerEvents = 'all';
      anime({
        targets: powerFade,
        opacity: [0, 1],
        duration: 900,
        easing: 'easeInQuad',
        complete: () => {
          versionScreen.classList.add('visible');
          // Fade in the version screen content over the black
          anime({
            targets: '.tm-stack',
            opacity: [0, 1],
            translateY: [16, 0],
            duration: 700,
            easing: 'cubicBezier(0.16,1,0.3,1)',
            delay: 100
          });
          anime({
            targets: powerFade,
            opacity: 0,
            duration: 600,
            delay: 200,
            easing: 'easeOutQuad',
            complete: () => { powerFade.style.pointerEvents = 'none'; }
          });
        }
      });
    });

    // ── Icon stroke-draw on hover ──
    const appColors = {
      'Studio':      '#2B6AFF',
      'Field Notes': '#FF6420',
      'Garden':      '#1ED17A',
      'Northstar':   '#FF3D8B'
    };

    document.querySelectorAll('.app').forEach(btn => {
      const color   = appColors[btn.dataset.app] || '#888';
      const svg     = btn.querySelector('.app-icon svg');
      const srcPath = svg.querySelector('[data-glass="blur"]');
      if (!srcPath) return;

      const outline = srcPath.cloneNode(false);
      ['filter', 'fill', 'data-glass', 'clip-path', 'mask'].forEach(a => outline.removeAttribute(a));
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', color);
      outline.setAttribute('stroke-width', '1');
      outline.setAttribute('stroke-linecap', 'round');
      outline.setAttribute('stroke-linejoin', 'round');
      outline.classList.add('outline-path');
      svg.querySelector('g').appendChild(outline);

      let pathLen = 0;
      requestAnimationFrame(() => {
        pathLen = outline.getTotalLength();
        outline.style.strokeDasharray  = pathLen;
        outline.style.strokeDashoffset = pathLen;
      });

      btn.addEventListener('mouseenter', () => {
        anime.remove(outline);
        anime({ targets: outline, strokeDashoffset: 0, duration: 700, easing: 'cubicBezier(0.16,1,0.3,1)' });
      });
      btn.addEventListener('mouseleave', () => {
        anime.remove(outline);
        anime({ targets: outline, strokeDashoffset: pathLen, duration: 450, easing: 'easeInQuad' });
      });
    });

    // ── Section Modal & Hash Routing ──
    const sModal      = document.getElementById('sModal');
    const sModalFrame = document.getElementById('sModalFrame');
    const sModalTitle = document.getElementById('sModalTitle');
    const sModalBack  = document.getElementById('sModalBack');
    const sModalClose = document.getElementById('sModalClose');
    const sModalBody  = document.getElementById('sModalBody');
    const nowStrip    = document.getElementById('nowStrip');

    const SECTION_SLUGS = {
      'Studio':      'studio',
      'Field Notes': 'field-notes',
      'Garden':      'garden',
      'Northstar':   'northstar'
    };

    const SECTIONS = {
      'studio':      { label: 'Studio' },
      'field-notes': { label: 'Field Notes' },
      'garden':      { label: 'Garden' },
      'northstar':   { label: 'Northstar' }
    };

    // Map filename (without .md) to URL-safe slug
    function filenameToSlug(name) {
      return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    // Reverse: find the matching filename from slug in a list of files
    function slugToFilename(slug, files) {
      return files.find(f => filenameToSlug(f.replace(/\.md$/, '')) === slug) || null;
    }

    // Extract title from markdown: first H1, fallback to filename
    function extractTitle(md, fallback) {
      const m = md.match(/^#\s+(.+)$/m);
      return m ? m[1].trim() : fallback;
    }

    // Extract date/subtitle hint from markdown frontmatter or first non-H1 line
    function extractSub(md) {
      // Try frontmatter date
      const fm = md.match(/^---[\s\S]*?date:\s*(.+?)[\s\n][\s\S]*?---/m);
      if (fm) return fm[1].trim();
      return '';
    }

    function getStudioContent(slug) {
      const cs = caseStudies[slug];
      if (cs) return `
        <div class="cs-meta">
          <div class="cs-meta-item"><span class="cs-meta-label">Company</span><span class="cs-meta-value">${cs.company}</span></div>
          <div class="cs-meta-item"><span class="cs-meta-label">Role</span><span class="cs-meta-value">${cs.role}</span></div>
          <div class="cs-meta-item"><span class="cs-meta-label">Timeline</span><span class="cs-meta-value">${cs.timeline}</span></div>
          <div class="cs-meta-item"><span class="cs-meta-label">Tools</span><span class="cs-meta-value">${cs.tools}</span></div>
        </div>
        <div class="cs-body">${mdToHTML(cs.body)}</div>`;
      return `<p class="cs-p" style="color:var(--text-muted);font-style:italic;margin-top:8px">Coming soon.</p>`;
    }

    function parseHash() {
      const h = location.hash.slice(1);
      if (!h) return null;
      const [section, item] = h.split('/');
      return { section, item: item || null };
    }

    let indexScrollPos = 0;
    let modalIsOpen = false;

    function openSModal() {
      if (modalIsOpen) return;
      modalIsOpen = true;
      sModal.style.pointerEvents = 'all';
      sModal.classList.add('sm-open');
    }

    function closeSModal() {
      if (!modalIsOpen) return;
      modalIsOpen = false;
      sModal.classList.remove('sm-open');
      sModal.style.pointerEvents = 'none';
      history.pushState(null, '', location.pathname + location.search);
    }

    function fadeSwap(newHTML) {
      const current = sModalBody.firstElementChild;
      if (current && modalIsOpen) {
        current.style.transition = 'opacity 0.12s ease';
        current.style.opacity = '0';
        setTimeout(() => { sModalBody.innerHTML = newHTML; }, 130);
      } else {
        sModalBody.innerHTML = newHTML;
      }
    }

    function renderIndex(section) {
      const data = SECTIONS[section];
      if (!data) return;
      sModalTitle.textContent = data.label;
      sModalBack.style.display = 'none';

      if (section === 'studio') {
        const studioItems = [
          { slug: 'figma-migration',    title: 'Upskilling 120+ Designers: High-Impact Migration to Figma',    sub: 'Design Ops · PwC Digital' },
          { slug: 'pattern-library',    title: 'Streamlining UX for 50+ Teams: Comprehensive Pattern Library', sub: 'Design Systems · PwC Digital' },
          { slug: 'modular-generators', title: 'Cutting Design Time by 80% with Modular Generators',           sub: 'Tooling · Blue Corona' },
          { slug: 'ai-automation',      title: 'Automating UX Workflows for 30% Time Savings',                 sub: 'AI · Automation' }
        ];
        const rows = studioItems.map(it =>
          `<button class="sm-row" data-section="${section}" data-slug="${it.slug}">
            <span class="sm-row-title">${it.title}</span>
            <span class="sm-row-sub">${it.sub}</span>
          </button>`
        ).join('');
        fadeSwap(`<div class="sm-list sm-fade">${rows}</div>`);
        setTimeout(() => {
          sModalBody.scrollTop = indexScrollPos;
          sModalBody.querySelectorAll('.sm-row').forEach(btn => {
            btn.addEventListener('click', () => {
              indexScrollPos = sModalBody.scrollTop;
              location.hash = `#${btn.dataset.section}/${btn.dataset.slug}`;
            });
          });
        }, 140);
        return;
      }

      // Dynamic markdown-based sections
      fadeSwap(`<div class="sm-list sm-fade sm-loading"><span style="color:var(--text-muted);font-size:0.85rem">Loading…</span></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ files }) => {
          if (!files || !files.length) {
            fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic;margin-top:8px">Nothing here yet.</p></div>`);
            return;
          }
          const rows = files.map(filename => {
            const name = filename.replace(/\.md$/, '');
            const slug = filenameToSlug(name);
            return `<button class="sm-row" data-section="${section}" data-slug="${slug}" data-filename="${encodeURIComponent(filename)}">
              <span class="sm-row-title">${name}</span>
            </button>`;
          }).join('');
          fadeSwap(`<div class="sm-list sm-fade">${rows}</div>`);
          setTimeout(() => {
            sModalBody.scrollTop = indexScrollPos;
            sModalBody.querySelectorAll('.sm-row').forEach(btn => {
              btn.addEventListener('click', () => {
                indexScrollPos = sModalBody.scrollTop;
                location.hash = `#${btn.dataset.section}/${btn.dataset.slug}`;
              });
            });
          }, 140);
        })
        .catch(() => {
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic;margin-top:8px">Couldn't load content.</p></div>`);
        });
    }

    function renderItem(section, slug) {
      const data = SECTIONS[section];
      if (!data) return;
      sModalTitle.textContent = data.label;
      sModalBack.style.display = 'inline-flex';

      if (section === 'studio') {
        const content = getStudioContent(slug);
        fadeSwap(`<div class="sm-fade">${content}</div>`);
        setTimeout(() => { sModalBody.scrollTop = 0; }, 140);
        return;
      }

      // Markdown-based sections: fetch file list to resolve slug → filename, then fetch markdown
      fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-size:0.85rem">Loading…</p></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ files }) => {
          const filename = slugToFilename(slug, files || []);
          if (!filename) {
            fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Not found.</p></div>`);
            return;
          }
          return fetch(`/content/${section}/${encodeURIComponent(filename)}`).then(r => r.text());
        })
        .then(md => {
          if (!md) return;
          fadeSwap(`<div class="sm-fade cs-body">${mdToHTML(md)}</div>`);
          setTimeout(() => { sModalBody.scrollTop = 0; }, 140);
        })
        .catch(() => {
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Couldn't load content.</p></div>`);
        });
    }

    function renderNowBoard() {
      sModalTitle.textContent = 'Now';
      sModalBack.style.display = 'none';

      const board = document.createElement('div');
      board.className = 'now-modal-board';
      board.innerHTML =
        '<div class="now-board-head">' +
          '<div class="now-board-head-left">' +
            '<span class="now-board-wordmark">NOW</span>' +
            '<span class="now-board-subtitle">DEPARTURES</span>' +
          '</div>' +
          '<span class="now-board-airline">LUKE VAN ZYL</span>' +
        '</div>' +
        '<div class="now-board-rows" id="nbRows"></div>' +
        '<div class="now-board-foot">' +
          '<span class="now-board-foot-label">UPDATED</span>' +
          '<div class="now-board-foot-cells" id="nbFootCells"></div>' +
        '</div>';

      sModalBody.innerHTML = '';
      sModalBody.appendChild(board);

      function makeNbCell(parent) {
        const el = document.createElement('div');
        el.className = 'nb-cell';
        el.innerHTML =
          '<div class="ct"><div class="cw"> </div></div>' +
          '<div class="cb"><div class="cw"> </div></div>' +
          '<div class="ft"><div class="cw"> </div></div>' +
          '<div class="fb"><div class="cw"> </div></div>';
        const ct = el.querySelector('.ct .cw');
        const cb = el.querySelector('.cb .cw');
        const ftEl = el.querySelector('.ft');
        const fbEl = el.querySelector('.fb');
        const ft = ftEl.querySelector('.cw');
        const fb = fbEl.querySelector('.cw');
        ftEl.style.transform = 'rotateX(0deg)';
        fbEl.style.transform = 'rotateX(90deg)';
        let cur = ' ';
        function setChar(nc, animate) {
          nc = nc || ' ';
          if (!animate || nc === cur) {
            cur = nc;
            ct.textContent = nc; cb.textContent = nc;
            ft.textContent = nc; fb.textContent = nc;
            ftEl.style.transition = ''; ftEl.style.transform = 'rotateX(0deg)';
            fbEl.style.transition = ''; fbEl.style.transform = 'rotateX(90deg)';
            return Promise.resolve();
          }
          const old = cur;
          cur = nc;
          return new Promise(resolve => {
            ct.textContent = nc;
            ft.textContent = old;
            fb.textContent = nc;
            fbEl.style.transition = 'none';
            fbEl.style.transform = 'rotateX(90deg)';
            void fbEl.offsetWidth;
            ftEl.style.transition = 'transform 140ms ease-in';
            ftEl.style.transform = 'rotateX(-90deg)';
            setTimeout(() => {
              fbEl.style.transition = 'transform 140ms ease-out';
              fbEl.style.transform = 'rotateX(0deg)';
            }, 70);
            setTimeout(() => {
              cb.textContent = nc;
              fbEl.style.transition = 'none'; fbEl.style.transform = 'rotateX(90deg)';
              ftEl.style.transition = 'none'; ftEl.style.transform = 'rotateX(0deg)';
              ft.textContent = nc;
              resolve();
            }, 225);
          });
        }
        parent.appendChild(el);
        return { el, setChar };
      }

      const MAX = 24;
      function makeNbRow(parent, label) {
        const row = document.createElement('div');
        row.className = 'now-board-row';
        const lbl = document.createElement('div');
        lbl.className = 'now-board-label';
        lbl.textContent = label;
        const cellsWrap = document.createElement('div');
        cellsWrap.className = 'now-board-cells';
        const cells = [];
        for (let i = 0; i < MAX; i++) cells.push(makeNbCell(cellsWrap));
        row.appendChild(lbl);
        row.appendChild(cellsWrap);
        parent.appendChild(row);
        function setValue(val, animate, baseDelay) {
          baseDelay = baseDelay || 0;
          const padded = (val || '').toUpperCase().padEnd(MAX, ' ').slice(0, MAX);
          const promises = [];
          for (let i = 0; i < MAX; i++) {
            const ch = padded[i];
            if (animate) {
              const d = baseDelay + i * 88;
              promises.push(new Promise(r => setTimeout(() => cells[i].setChar(ch, true).then(r), d)));
            } else {
              cells[i].setChar(ch, false);
            }
          }
          return Promise.all(promises);
        }
        return { row, setValue };
      }

      const LABELS = ['READING','LISTENING','BUILDING','WRITING','WATCHING','THINKING','LOCATION'];
      const ROW_STAGGER = 190;
      const rowsEl = board.querySelector('#nbRows');
      const footCellsEl = board.querySelector('#nbFootCells');

      const rows = LABELS.map(lbl => makeNbRow(rowsEl, lbl));
      rows.forEach(r => r.setValue('–'.repeat(MAX), false));

      function renderFooterDate(dateStr) {
        footCellsEl.innerHTML = '';
        const chars = dateStr.replace(/-/g, '·');
        for (const ch of chars) {
          const cell = document.createElement('div');
          cell.className = 'nb-foot-cell';
          const span = document.createElement('span');
          span.className = 'nb-foot-char';
          span.textContent = ch;
          cell.appendChild(span);
          footCellsEl.appendChild(cell);
        }
      }

      fetch('/src/data/now.json')
        .then(res => res.json())
        .then(data => {
          data.items.forEach((item, i) => {
            if (item.note && rows[i]) {
              rows[i].row.classList.add('has-note');
              const noteEl = document.createElement('div');
              noteEl.className = 'now-board-row-note';
              noteEl.textContent = item.note;
              rows[i].row.appendChild(noteEl);
            }
          });
          renderFooterDate(data.updatedAt || '');
          data.items.forEach((item, i) => {
            if (rows[i]) rows[i].setValue(item.value, true, i * ROW_STAGGER);
          });
        })
        .catch(() => {
          const defaults = [
            { value: 'Piranesi' },
            { value: 'Hand Habits' },
            { value: 'Axon Labs' },
            { value: 'WFH systems' },
            { value: 'Severance S2' },
            { value: 'Slow attention' },
            { value: 'Atlanta, GA' }
          ];
          renderFooterDate('2026-03-14');
          defaults.forEach((item, i) => {
            if (rows[i]) rows[i].setValue(item.value, true, i * ROW_STAGGER);
          });
        });
    }

    function handleHash() {
      const parsed = parseHash();
      if (!parsed) { closeSModal(); return; }

      if (parsed.section === 'now') {
        openSModal();
        renderNowBoard();
        return;
      }

      if (!SECTIONS[parsed.section]) {
        closeSModal();
        return;
      }
      openSModal();
      if (parsed.item) {
        renderItem(parsed.section, parsed.item);
      } else {
        indexScrollPos = 0;
        renderIndex(parsed.section);
      }
    }

    // App icon clicks → hash
    document.querySelectorAll('.app').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = SECTION_SLUGS[btn.dataset.app];
        if (slug) { indexScrollPos = 0; location.hash = `#${slug}`; }
      });
    });

    // Back → section index
    sModalBack.addEventListener('click', () => {
      const parsed = parseHash();
      if (parsed) { location.hash = `#${parsed.section}`; }
    });

    // Close
    function doClose() { closeSModal(); }
    sModalClose.addEventListener('click', doClose);
    sModal.addEventListener('click', e => { if (e.target === sModal) doClose(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalIsOpen) doClose(); });

    window.addEventListener('hashchange', handleHash);

    // Deep link on load
    handleHash();
