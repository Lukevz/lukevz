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

      let inHTMLBlock = false;
      let htmlBlockBuf = '';
      const HTML_BLOCK_TAGS = /^<(iframe|div|figure|video|audio|script|style)[\s>]/i;
      const HTML_CLOSE_TAGS = /<\/(iframe|div|figure|video|audio|script|style)>/i;

      for (const line of lines) {
        const t = line.trim();

        // Accumulate multi-line HTML blocks
        if (inHTMLBlock) {
          htmlBlockBuf += '\n' + line;
          if (HTML_CLOSE_TAGS.test(t)) {
            html += htmlBlockBuf;
            htmlBlockBuf = '';
            inHTMLBlock = false;
          }
          continue;
        }

        // Detect start of an HTML block
        if (HTML_BLOCK_TAGS.test(t)) {
          closeUL(); closeOL(); closeBQ();
          if (HTML_CLOSE_TAGS.test(t)) {
            html += line; // single-line block
          } else {
            htmlBlockBuf = line;
            inHTMLBlock = true;
          }
          continue;
        }

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
      if (inHTMLBlock && htmlBlockBuf) html += htmlBlockBuf;

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

    // ── Restructure app buttons: wrap icon + label into app-card-left ──
    document.querySelectorAll('.app').forEach(btn => {
      const icon  = btn.querySelector('.app-icon');
      const right = btn.querySelector('.app-card-right');
      const appName = btn.dataset.app;

      const left = document.createElement('div');
      left.className = 'app-card-left';

      const label = document.createElement('span');
      label.className = 'app-label';
      label.textContent = appName;
      label.setAttribute('aria-hidden', 'true');

      left.appendChild(icon);
      left.appendChild(label);

      btn.prepend(left);
    });

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

      panelTitle.textContent = btn.dataset.app || panelTitle.textContent;
      backdrop.style.pointerEvents = 'all';

      anime.remove([backdrop, panel]);
      anime({ targets: backdrop, opacity: [0, 1], duration: 550, easing: 'easeOutQuad' });
      anime({ targets: panel, scale: [0.04, 1], opacity: [0, 1], duration: 700, easing: 'cubicBezier(0.16,1,0.3,1)' });
    }

    // App buttons handled by hash router below

    // ── Case study cards — loaded from content/case-studies/ ──
    const panelContent = document.getElementById('panelContent');

    function parseFrontmatter(md) {
      const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
      if (!match) return { meta: {}, body: md };
      const meta = {};
      match[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      return { meta, body: match[2] };
    }

    function buildStudyCard(meta, body) {
      const btn = document.createElement('button');
      btn.className = 'study';
      btn.innerHTML = `
        <div class="study-card">
          ${meta.tag ? `<span class="study-tag">${meta.tag}</span>` : ''}
          <h3 class="study-title">${meta.title || 'Untitled'}</h3>
        </div>`;
      btn.addEventListener('click', () => {
        panelTitle.textContent = meta.title || '';
        const metaRows = ['company', 'role', 'timeline', 'tools']
          .filter(k => meta[k])
          .map(k => `<div class="cs-meta-item"><span class="cs-meta-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span><span class="cs-meta-value">${meta[k]}</span></div>`)
          .join('');
        panelContent.innerHTML = `
          ${metaRows ? `<div class="cs-meta">${metaRows}</div>` : ''}
          <div class="cs-body">${mdToHTML(body)}</div>`;
        openPanel(btn, btn.querySelector('.study-card'));
      });
      return btn;
    }

    let loadedStudies = [];

    fetch('/api/content/list?category=case-studies')
      .then(r => r.json())
      .then(({ items = [] }) => Promise.all(
        items.map(({ file }) =>
          fetch(`/content/case-studies/${encodeURIComponent(file)}`)
            .then(r => r.text())
            .then(md => { const { meta, body } = parseFrontmatter(md); return { meta, body }; })
            .catch(() => null)
        )
      ))
      .then(studies => {
        loadedStudies = studies.filter(Boolean).filter(s => s.meta.title);
        loadedStudies.forEach(({ meta, body }) => {
          portfolioGrid.appendChild(buildStudyCard(meta, body));
        });
      })
      .catch(() => {});

    // ── Previously button — opens panel with case study list ──
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (panelOpen) return;
        const list = document.createElement('div');
        list.className = 'prev-list';
        loadedStudies.forEach(({ meta, body }) => {
          const item = document.createElement('button');
          item.className = 'prev-list-item';
          item.innerHTML = `
            <span class="cs-company">${meta.company || ''}</span>
            <span class="prev-item-title">${meta.title}</span>
            ${meta.tag ? `<span class="kpi-label">${meta.tag}</span>` : ''}`;
          item.addEventListener('click', () => {
            panelTitle.textContent = meta.title;
            const metaRows = ['company', 'role', 'timeline', 'tools']
              .filter(k => meta[k])
              .map(k => `<div class="cs-meta-item"><span class="cs-meta-label">${k.charAt(0).toUpperCase() + k.slice(1)}</span><span class="cs-meta-value">${meta[k]}</span></div>`)
              .join('');
            panelContent.innerHTML = `
              ${metaRows ? `<div class="cs-meta">${metaRows}</div>` : ''}
              <div class="cs-body">${mdToHTML(body)}</div>`;
            panelContent.scrollTop = 0;
          });
          list.appendChild(item);
        });
        panelTitle.textContent = 'Previously';
        panelContent.innerHTML = '';
        panelContent.appendChild(list);
        openPanel(prevBtn, prevBtn);
      });
    }

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

    // ── Mode tab (Life / Work) ──
    const modeTab      = document.getElementById('modeTab');
    const tabPill      = modeTab.querySelector('.tab-pill');
    const tabOpts      = modeTab.querySelectorAll('.tab-opt');
    const avatarImg    = document.getElementById('avatarImg');
    const launchpad    = document.querySelector('.launchpad');
    const portfolioGrid = document.getElementById('portfolioGrid');
    const heading      = document.querySelector('h1');
    // Captured before splitText mutates innerHTML
    const defaultHeadline = "Hi, I'm Luke";
    const workHeadline    = 'Designing <a href="https://instinct.vet/" target="_blank" rel="noopener" class="vet-link">software for veterinarians.<svg class="vet-underline" viewBox="0 0 240 8" preserveAspectRatio="none" aria-hidden="true"><path class="vet-path" d="M1,5 C22,2 45,7 75,4 C105,1 128,7 155,4 C180,1 205,6 239,4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>';
    const descEl          = document.querySelector('.description');
    const defaultDesc     = descEl.innerHTML;
    const workDesc        = `I think in systems, design in details, and am always chasing the pattern that makes something complicated feel completely obvious.`;
    let portfolioMode  = false;

    function positionTabPill(btn) {
      tabPill.style.width  = btn.offsetWidth + 'px';
      tabPill.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
    }

    // Init pill on the active tab
    requestAnimationFrame(() => positionTabPill(modeTab.querySelector('.tab-opt.active')));

    function setMode(isWork) {
      if (isWork === portfolioMode) return;
      portfolioMode = isWork;

      tabOpts.forEach(btn => {
        const active = btn.dataset.mode === (isWork ? 'work' : 'life');
        btn.classList.toggle('active', active);
        if (active) positionTabPill(btn);
      });

      history.pushState(null, '', isWork ? '?work' : location.pathname);
      document.body.classList.toggle('work-mode', isWork);
      if (!isWork) document.getElementById('layout').scrollTo({ top: 0 });

      // Swap headshot
      if (avatarImg) {
        avatarImg.src = isWork ? '/src/img/headshot-work.jpg' : '/src/img/headshot-personal.jpg';
      }

      // Swap headline + description
      animateHeadingOut(heading, () => {
        heading.innerHTML = isWork ? workHeadline : defaultHeadline;
        animateHeadingIn(heading);
      });
      anime({
        targets: descEl,
        opacity: 0,
        duration: 180,
        easing: 'easeInQuad',
        complete: () => {
          descEl.innerHTML = isWork ? workDesc : defaultDesc;
          anime({ targets: descEl, opacity: 1, duration: 350, easing: 'easeOutQuad' });
          if (isWork) {
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
      if (nowStripEl) nowStripEl.style.display = isWork ? 'none' : '';

      if (isWork) {
        anime({
          targets: launchpad,
          opacity: 0, scale: 0.95,
          duration: 280, easing: 'easeInQuad',
          complete: () => {
            launchpad.style.display = 'none';
            portfolioGrid.style.opacity = '';
            portfolioGrid.style.transform = '';
            portfolioGrid.style.display = 'grid';
            anime({ targets: '.study, .kpi', opacity: [0, 1], translateY: [14, 0], duration: 600,
              easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(40) });
          }
        });
      } else {
        anime({
          targets: portfolioGrid,
          opacity: 0, scale: 0.95,
          duration: 280, easing: 'easeInQuad',
          complete: () => {
            portfolioGrid.style.display = 'none';
            launchpad.style.opacity = '';
            launchpad.style.transform = '';
            launchpad.style.display = 'flex';
            anime({ targets: '.app', opacity: [0, 1], translateY: [14, 0], duration: 600,
              easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(55) });
          }
        });
      }
    }

    tabOpts.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode === 'work'));
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
      'Studio':      '#FF6B6B',
      'Field Notes': '#48D1CC',
      'Garden':      '#FFD93D',
      'Northstar':   '#1A3C40'
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

    // Capture strip rect for expansion animation
    let _nowStripRect = null;
    if (nowStrip) {
      nowStrip.addEventListener('click', () => {
        _nowStripRect = nowStrip.getBoundingClientRect();
      }, { capture: true });
    }

    const SECTION_SLUGS = {
      'Studio':      'studio',
      'Field Notes': 'field-notes',
      'Garden':      'garden',
      'Northstar':   'northstar'
    };

    // Fetch post counts and populate .app-count spans
    Object.entries(SECTION_SLUGS).forEach(([appName, slug]) => {
      fetch(`/api/content/list?category=${slug}`)
        .then(r => r.json())
        .then(data => {
          const n = (data.items || data.files || []).length;
          const btn = document.querySelector(`.app[data-app="${appName}"]`);
          if (btn) {
            const el = btn.querySelector('.app-count');
            if (el) el.textContent = `${n} post${n !== 1 ? 's' : ''}`;
          }
        })
        .catch(() => {});
    });

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

    function parseHash() {
      const h = location.hash.slice(1);
      if (!h) return null;
      const [section, item] = h.split('/');
      return { section, item: item || null };
    }

    let indexScrollPos = 0;
    let modalIsOpen = false;
    const videoCache = {};

    // YouTube handle per section
    const SECTION_YT_HANDLES = {
      'field-notes': 'lukevanzylofficial',
      'studio': 'uxwithluke'
    };

    function fetchChannelVideos(handle) {
      if (videoCache[handle]) return Promise.resolve(videoCache[handle]);
      return fetch(`/api/youtube/channel-videos?handle=${handle}`)
        .then(r => r.json())
        .then(({ videos }) => { videoCache[handle] = videos || []; return videoCache[handle]; })
        .catch(() => []);
    }

    function attachRowClicks() {
      setTimeout(() => {
        sModalBody.scrollTop = indexScrollPos;
        sModalBody.querySelectorAll('.sm-row').forEach(btn => {
          btn.addEventListener('click', () => {
            indexScrollPos = sModalBody.scrollTop;
            location.hash = `#${btn.dataset.section}/${btn.dataset.slug}`;
          });
        });
      }, 140);
    }

    function renderMixedIndex(section) {
      const ytHandle = SECTION_YT_HANDLES[section];
      fadeSwap(`<div class="sm-list sm-fade sm-loading"><span style="color:var(--text-muted);font-size:0.85rem">Loading…</span></div>`);

      const videosFetch = ytHandle ? fetchChannelVideos(ytHandle) : Promise.resolve([]);
      const mdFetch = fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ items, files }) => items || (files || []).map(f => ({ file: f, date: '1970-01-01' })))
        .catch(() => []);

      Promise.all([videosFetch, mdFetch]).then(([videos, mdItems]) => {
        const allItems = [];

        videos.forEach(v => allItems.push({
          type: 'video', slug: v.videoId, title: v.title, thumbnail: v.thumbnail, date: v.publishedAt
        }));

        mdItems.forEach(({ file, date }) => {
          const name = file.replace(/\.md$/, '');
          allItems.push({ type: 'md', slug: filenameToSlug(name), title: name, date: date || '1970-01-01' });
        });

        allItems.sort((a, b) => b.date.localeCompare(a.date));

        if (!allItems.length) {
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic;margin-top:8px">Nothing here yet.</p></div>`);
          return;
        }

        const rows = allItems.map(item => {
          if (item.type === 'video') {
            const safeTitle = item.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<button class="sm-row sm-row--video" data-section="${section}" data-slug="${item.slug}">
              <div class="sm-row-thumb-wrap"><img class="sm-row-thumb" src="${item.thumbnail}" alt="" loading="lazy"></div>
              <span class="sm-row-info">
                <span class="sm-row-title">${safeTitle}</span>
                <span class="sm-row-sub">${item.date}</span>
              </span>
            </button>`;
          } else {
            const safeTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<button class="sm-row sm-row--article" data-section="${section}" data-slug="${item.slug}">
              <span class="sm-row-title">${safeTitle}</span>
              <span class="sm-row-sub">${item.date}</span>
            </button>`;
          }
        }).join('');

        fadeSwap(`<div class="sm-mixed-grid sm-fade">${rows}</div>`);
        attachRowClicks();
      });
    }

    function renderVideoItem(section, videoId) {
      const handle = SECTION_YT_HANDLES[section];
      fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-size:0.85rem">Loading…</p></div>`);
      fetchChannelVideos(handle).then(videos => {
        const video = videos.find(v => v.videoId === videoId);
        if (!video) {
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Video not found.</p></div>`);
          return;
        }
        const safeTitle = video.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const desc = video.description
          ? `<p style="color:var(--text-muted);font-size:0.85rem;line-height:1.6;white-space:pre-wrap">${video.description.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 600)}${video.description.length > 600 ? '…' : ''}</p>`
          : '';
        const iframe = `<div class="fn-video-wrap"><iframe src="https://www.youtube.com/embed/${videoId}" title="${video.title.replace(/"/g, '&quot;')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
        fadeSwap(`<div class="sm-fade cs-body"><h1>${safeTitle}</h1>${iframe}${desc}</div>`);
        setTimeout(() => { sModalBody.scrollTop = 0; }, 140);
      }).catch(() => {
        fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Couldn't load video.</p></div>`);
      });
    }

    function openSModal() {
      if (modalIsOpen) return;
      modalIsOpen = true;
      sModal.style.pointerEvents = 'all';
      sModal.classList.add('sm-open');
    }

    function closeSModal() {
      if (!modalIsOpen) return;
      modalIsOpen = false;
      sModal.classList.remove('sm-open', 'sm-now');
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

      if (section === 'field-notes' || section === 'studio') {
        renderMixedIndex(section);
        return;
      }

      // Dynamic markdown-based sections
      fadeSwap(`<div class="sm-list sm-fade sm-loading"><span style="color:var(--text-muted);font-size:0.85rem">Loading…</span></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ items, files }) => {
          const mdItems = items || (files || []).map(f => ({ file: f, date: '1970-01-01' }));
          mdItems.sort((a, b) => b.date.localeCompare(a.date));
          if (!mdItems.length) {
            fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic;margin-top:8px">Nothing here yet.</p></div>`);
            return;
          }
          const rows = mdItems.map(({ file, date }) => {
            const name = file.replace(/\.md$/, '');
            const slug = filenameToSlug(name);
            return `<button class="sm-row" data-section="${section}" data-slug="${slug}">
              <span class="sm-row-title">${name}</span>
              <span class="sm-row-sub">${date}</span>
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

      if (section === 'field-notes' || section === 'studio') {
        // YouTube video IDs are 11 chars of base64url
        if (/^[A-Za-z0-9_-]{11}$/.test(slug)) {
          renderVideoItem(section, slug);
          return;
        }
        // Markdown article in content/[section]/
        fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-size:0.85rem">Loading…</p></div>`);
        fetch(`/api/content/list?category=${section}`)
          .then(r => r.json())
          .then(({ items, files }) => {
            const fileList = items ? items.map(i => i.file) : (files || []);
            const filename = slugToFilename(slug, fileList);
            if (!filename) { fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Not found.</p></div>`); return null; }
            return fetch(`/content/${section}/${encodeURIComponent(filename)}`).then(r => r.text());
          })
          .then(md => { if (md) { fadeSwap(`<div class="sm-fade cs-body">${mdToHTML(md)}</div>`); setTimeout(() => { sModalBody.scrollTop = 0; }, 140); } })
          .catch(() => { fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-style:italic">Couldn't load content.</p></div>`); });
        return;
      }

      // Markdown-based sections: fetch file list to resolve slug → filename, then fetch markdown
      fadeSwap(`<div class="sm-fade"><p style="color:var(--text-muted);font-size:0.85rem">Loading…</p></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ items, files }) => {
          const fileList = items ? items.map(i => i.file) : (files || []);
          const filename = slugToFilename(slug, fileList);
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
      sModal.classList.add('sm-now');
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
        '</div>' +
        '<div class="now-board-rows" id="nbRows"></div>' +
        '<div class="now-board-foot">' +
          '<span class="now-board-foot-label">UPDATED</span>' +
          '<div class="now-board-foot-cells" id="nbFootCells"></div>' +
        '</div>';

      sModalBody.innerHTML = '';
      sModalBody.appendChild(board);

      // Expansion animation from now strip
      if (_nowStripRect) {
        const stripRect = _nowStripRect;
        _nowStripRect = null;
        const frameW = window.innerWidth * 0.68;
        const frameH = window.innerHeight * 0.85;
        const tx = (stripRect.left + stripRect.width / 2) - window.innerWidth / 2;
        const ty = (stripRect.top + stripRect.height / 2) - window.innerHeight / 2;
        const sx = stripRect.width / frameW;
        const sy = stripRect.height / frameH;
        sModalFrame.animate([
          { transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`, borderRadius: '12px', opacity: '0.7' },
          { transform: 'translate(0, 0) scale(1)', borderRadius: '20px', opacity: '1' }
        ], { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'none' });
      }

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
            ftEl.style.transition = 'transform 120ms ease-in';
            ftEl.style.transform = 'rotateX(-90deg)';
            setTimeout(() => {
              fbEl.style.transition = 'transform 120ms ease-out';
              fbEl.style.transform = 'rotateX(0deg)';
            }, 60);
            setTimeout(() => {
              cb.textContent = nc;
              fbEl.style.transition = 'none'; fbEl.style.transform = 'rotateX(90deg)';
              ftEl.style.transition = 'none'; ftEl.style.transform = 'rotateX(0deg)';
              ft.textContent = nc;
              resolve();
            }, 192);
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
              const d = baseDelay + i * 75;
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
      const ROW_STAGGER = 162;
      const rowsEl = board.querySelector('#nbRows');
      const footCellsEl = board.querySelector('#nbFootCells');

      const rows = LABELS.map(lbl => makeNbRow(rowsEl, lbl));
      rows.forEach(r => r.setValue('–'.repeat(MAX), false));

      function renderFooterDate(dateStr) {
        footCellsEl.textContent = dateStr;
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

    // Restore work mode from ?work query param
    if (location.search === '?work') setMode(true);

    // Deep link on load
    handleHash();
