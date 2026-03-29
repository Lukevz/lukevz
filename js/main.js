// ── Markdown → HTML (for case study bodies from Bear) ──
    function stripYamlFrontmatter(text) {
      const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
      return m ? text.slice(m[0].length).replace(/^\uFEFF?/, '') : text;
    }

    function mdToHTML(md) {
      if (!md) return '';
      md = stripYamlFrontmatter(md.trim());
      const lines = md.split('\n');
      let html = '';
      let inUL = false;
      let ulIsTask = false;
      let inOL = false;
      let inBQ = false;

      function closeUL() {
        if (inUL) {
          html += '</ul>';
          inUL = false;
          ulIsTask = false;
        }
      }
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
          const rest = t.slice(2);
          const taskM = rest.match(/^\[([ xX])\]\s*(.*)$/);
          const isTask = !!taskM;
          if (inUL && ulIsTask !== isTask) closeUL();
          if (!inUL) {
            inUL = true;
            ulIsTask = isTask;
            html += isTask ? '<ul class="task-list">' : '<ul>';
          }
          if (taskM) {
            const checked = taskM[1].toLowerCase() === 'x';
            html += `<li class="task-list-item"><input type="checkbox" disabled${checked ? ' checked' : ''} aria-readonly="true"> <span>${inline(taskM[2])}</span></li>`;
          } else {
            html += `<li>${inline(rest)}</li>`;
          }
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
      const reducedMotion =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const chars = splitChars(el);
      const logo = el.querySelector('.instinct-inline-logo');
      if (logo && !reducedMotion) {
        logo.style.opacity = '0';
      }
      chars.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(22px)'; });
      function fadeInInstinctLogo() {
        if (!logo || !el.contains(logo) || reducedMotion) return;
        anime({
          targets: logo,
          opacity: 1,
          duration: 420,
          easing: 'cubicBezier(0.16,1,0.3,1)'
        });
      }
      if (!chars.length) {
        fadeInInstinctLogo();
        return;
      }
      anime({
        targets: chars,
        opacity:    1,
        translateY: 0,
        duration: 700,
        easing: 'cubicBezier(0.16,1,0.3,1)',
        delay: anime.stagger(22, { start: startDelay }),
        complete: fadeInInstinctLogo
      });
    }

    function animateHeadingOut(el, cb) {
      const logo = el.querySelector('.instinct-inline-logo');
      if (logo) logo.style.opacity = '0';
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
      })
      .catch(() => {});

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
    const overflowBtn  = document.getElementById('overflowBtn');
    const overflowPanel = document.getElementById('overflowPanel');
    const overflowItems = overflowPanel.querySelectorAll('.overflow-item');
    const avatarImg    = document.getElementById('avatarImg');
    const launchpad    = document.querySelector('.launchpad');
    const portfolioGrid = document.getElementById('portfolioGrid');
    const heading      = document.querySelector('h1');
    // Captured before splitText mutates innerHTML
    const defaultHeadline = "Hi, I'm Luke";
    const workHeadline    = 'Designing <span class="vet-preview-wrap">software for veterinarians at <a href="https://instinct.vet/" target="_blank" rel="noopener" class="vet-link vet-link--logo"><span class="instinct-inline-logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 38" fill="none" class="instinct-inline-logo__img instinct-inline-logo__img--light" aria-hidden="true" focusable="false"><path d="M55.3876 27.1048H60.434V9.61596H55.3876V27.1048ZM73.664 18.5356H73.6141L66.4435 9.61632H61.9464V27.1051H66.9672V17.9107H67.0178L74.3887 27.1051H78.6606V9.61632H73.664V18.5356ZM43.4656 11.969C43.4392 11.9558 43.1802 11.8875 43.1436 11.515C42.9631 9.7003 41.3135 6.5088 38.4323 4.89219C36.8531 4.00621 35.103 3.49709 33.2927 3.50005C32.2042 3.50076 31.2272 3.61152 30.5113 3.85865C30.2751 3.94013 30.1607 3.80296 30.1409 3.78755C28.4707 2.51719 25.4487 0.804408 21.2575 0.810318C19.1809 0.812556 17.0472 1.25255 14.9156 2.11659C9.69167 4.23498 7.35915 7.93479 6.32127 10.6678C5.90904 11.7636 5.62444 12.9006 5.47039 14.0587C5.42199 14.4226 5.2122 14.735 4.89094 14.9125C2.97138 15.9709 1.13177 17.4307 0.371857 20.1878C0.354262 20.2517 0.335191 20.3147 0.318313 20.3793C0.298525 20.4497 0.282363 20.5223 0.263292 20.5942C0.0967953 21.2411 -0.000756656 21.9152 4.42053e-06 22.6142C4.42053e-06 22.6604 0.00658551 22.7052 0.00730177 22.7507C0.00586917 22.8057 0.000720683 22.8578 0.000720683 22.9135C0.00954018 29.9272 6.7819 31.4815 9.25817 31.4778C9.38142 31.4778 9.84863 31.4683 10.5968 31.4683C11.0758 31.4683 11.166 31.5467 11.3274 31.6905C12.1328 32.4079 14.7477 35.2076 16.4325 36.6725C17.2423 37.3773 18.4401 37.3685 19.2484 36.663L24.2458 31.7052C24.4203 31.5527 24.644 31.4631 24.8766 31.4654C27.4819 31.4874 30.7431 31.469 33.3565 31.4874C36.9785 31.5138 40.2727 30.7275 43.3416 28.7587C46.7216 26.5912 48.5362 23.7438 48.647 20.4827C48.6572 20.1761 48.658 19.8666 48.6382 19.5526C48.4145 16.07 46.4656 13.5101 43.4656 11.969ZM92.0863 17.4737C91.3117 16.9984 90.2504 16.6031 88.9015 16.2869C87.8848 16.0199 87.1396 15.8087 86.6643 15.6488C86.1912 15.4911 85.8824 15.3459 85.7416 15.2124C85.5985 15.0789 85.5281 14.93 85.5281 14.7627C85.5281 14.4122 85.7027 14.1598 86.0533 13.9999C86.4025 13.8422 86.9526 13.7623 87.7022 13.7623C88.4526 13.7623 89.0973 13.7806 89.6386 13.8128C90.1792 13.8474 90.6421 13.8884 91.0257 13.9383L93.1741 14.1634L93.898 10.3647L92.599 10.0155C91.8003 9.81527 90.9912 9.6627 90.1755 9.55346C89.3592 9.44566 88.5677 9.39131 87.8027 9.39131C86.4024 9.39131 85.1416 9.57907 84.0171 9.95244C82.8934 10.3273 82.0095 10.9155 81.3692 11.7144C80.7266 12.5145 80.4068 13.5547 80.4068 14.8376C80.4068 15.8703 80.5726 16.716 80.9064 17.3739C81.2393 18.0312 81.8093 18.5857 82.6183 19.0354C83.4259 19.485 84.5203 19.9177 85.9029 20.3337C86.8352 20.6175 87.5107 20.8464 87.9274 21.021C88.3433 21.1962 88.6051 21.3546 88.7144 21.4963C88.8223 21.637 88.8758 21.8 88.8758 21.9841C88.8758 22.2665 88.7306 22.4872 88.4393 22.6448C88.1482 22.804 87.6597 22.8825 86.9783 22.8825C86.178 22.8825 85.391 22.8495 84.6164 22.7827C83.8425 22.716 83.1721 22.6413 82.6051 22.5576L80.5572 22.2833L79.757 26.1305L81.2812 26.5552C82.2142 26.8061 83.1296 26.9975 84.0296 27.1295C84.9289 27.2631 85.82 27.3297 86.7032 27.3297C88.102 27.3297 89.368 27.1178 90.5005 26.6931C91.633 26.2676 92.5323 25.6177 93.1983 24.7435C93.8651 23.8691 94.1973 22.7579 94.1973 21.4081C94.1973 20.5427 94.0396 19.7894 93.7235 19.1469C93.4066 18.5065 92.8624 17.9476 92.0863 17.4737ZM152.338 9.59832V14.0205H157.76V27.0871H162.78V14.0205H168.152V9.59832H152.338ZM94.8578 14.0385H100.279V27.1051H105.3V14.0385H110.672V9.61632H94.8578V14.0385ZM149.648 22.3573C148.915 22.4579 148.236 22.5415 147.612 22.6082C146.986 22.6749 146.416 22.708 145.9 22.708C144.951 22.708 144.164 22.5671 143.54 22.2833C142.914 22.0009 142.445 21.538 142.127 20.8962C141.812 20.2552 141.653 19.3934 141.653 18.3099C141.653 17.261 141.824 16.4212 142.166 15.7867C142.506 15.1544 143.006 14.6923 143.664 14.4011C144.322 14.1092 145.117 13.9632 146.05 13.9632C146.65 13.9632 147.245 13.9926 147.837 14.0505C148.427 14.1092 149.056 14.1876 149.723 14.2882L150.347 14.3622L151.197 10.4402L150.972 10.3647C150.172 10.0654 149.331 9.82405 148.449 9.64067C147.566 9.45801 146.675 9.36561 145.775 9.36561C144.476 9.36561 143.265 9.55857 142.14 9.94071C141.016 10.3236 140.029 10.8935 139.18 11.6512C138.33 12.4104 137.667 13.3463 137.193 14.4627C136.718 15.5783 136.481 16.8701 136.481 18.3356C136.481 20.3505 136.869 22.0251 137.643 23.3578C138.417 24.6899 139.487 25.6845 140.853 26.3431C142.218 27.0011 143.793 27.3297 145.575 27.3297C146.475 27.3297 147.404 27.2388 148.362 27.0546C149.318 26.8728 150.223 26.6146 151.073 26.2808L151.497 26.1062L150.722 22.2084L149.648 22.3573ZM130.198 18.5356H130.147L122.977 9.61632H118.479V27.1051H123.5V17.9107H123.551L130.922 27.1051H135.194V9.61632H130.198V18.5356ZM112.029 27.1048H117.075V9.61596H112.029V27.1048Z" fill="currentColor"></path><path d="M32.6438 22.7121C32.4296 22.3769 32.1201 22.1099 31.7497 21.9551L33.7529 14.0392C33.8174 14.0451 33.8798 14.0583 33.9458 14.0583C34.2715 14.0583 34.5737 13.9717 34.8436 13.8309L38.2492 18.5231C37.8869 18.8781 37.6609 19.3718 37.6609 19.9189C37.6609 20.1016 37.694 20.2739 37.7402 20.4412L32.6438 22.7121ZM17.7714 28.4488L11.1986 23.1302C11.3908 22.9307 11.5382 22.6938 11.6321 22.4304L19.1049 23.2783C19.1247 23.8901 19.4247 24.4277 19.8817 24.7732L17.7714 28.4488ZM17.7824 9.96464L22.9558 14.5453C22.7556 14.8519 22.6367 15.2172 22.6367 15.6111C22.6367 15.7688 22.6602 15.9199 22.6954 16.0666L11.3753 20.6356C11.2015 20.3957 10.98 20.1969 10.7203 20.0576L17.7824 9.96464ZM32.0358 12.5128L26.2976 14.6649C25.9631 14.0641 25.3294 13.6534 24.5937 13.6534C24.1155 13.6534 23.6827 13.8324 23.3423 14.1177L18.6626 9.97346L31.9932 12.0867C31.9932 12.0925 31.9918 12.0984 31.9918 12.1042C31.9918 12.2444 32.0079 12.3808 32.0358 12.5128ZM30.9964 21.804C30.6436 21.804 30.3172 21.9045 30.0311 22.0681L26.013 16.9519C26.3446 16.6013 26.5514 16.1312 26.5514 15.6111C26.5514 15.4703 26.5345 15.3338 26.5067 15.2018L32.2455 13.0497C32.4583 13.4304 32.7869 13.7378 33.1925 13.9072L31.1893 21.8231C31.1248 21.8172 31.0624 21.804 30.9964 21.804ZM22.1629 21.6038L24.0531 17.483C24.2255 17.5329 24.4052 17.5681 24.5937 17.5681C24.9465 17.5681 25.2729 17.4676 25.559 17.304L29.5764 22.4201C29.3314 22.6798 29.1524 23.004 29.0783 23.3671L22.9947 23.0326C22.9389 22.4407 22.6279 21.9236 22.1629 21.6038ZM11.7472 21.8649C11.7524 21.7497 11.7516 21.6338 11.7362 21.5157C11.7186 21.3874 11.6878 21.2649 11.6482 21.1468L22.914 16.5998C23.0673 16.8602 23.2741 17.0832 23.5265 17.2483L21.6414 21.358C21.4558 21.2994 21.2614 21.259 21.0561 21.259C20.1516 21.259 19.3991 21.8752 19.1739 22.7077L11.7472 21.8649ZM39.6179 17.962C39.2915 17.962 38.9886 18.0492 38.7179 18.1908L35.3123 13.4986C35.6739 13.1437 35.9005 12.6507 35.9005 12.1042C35.9005 11.0253 35.0255 10.1502 33.9458 10.1502C33.0722 10.1502 32.3409 10.7275 32.0908 11.5189L17.7766 9.2495L17.7318 9.53409L17.4957 9.36903L10.1541 19.861C9.95456 19.8243 9.74771 19.8082 9.53501 19.8368C8.46409 19.9813 7.71226 20.9671 7.85675 22.038C8.00126 23.1096 8.98634 23.8608 10.0572 23.7162C10.3015 23.6832 10.526 23.6025 10.7299 23.4911L17.9335 29.3202L20.3863 25.0483C20.5961 25.1246 20.8191 25.173 21.0561 25.173C22.0022 25.173 22.7922 24.5011 22.9734 23.6084L29.0578 23.9429C29.1502 24.9375 29.9776 25.718 30.9964 25.718C32.0768 25.718 32.9534 24.8422 32.9534 23.761C32.9534 23.5791 32.9204 23.406 32.8742 23.2395L37.9705 20.9678C38.3182 21.5128 38.924 21.8766 39.6179 21.8766C40.6991 21.8766 41.5749 21.0001 41.5749 19.9189C41.5749 18.8385 40.6991 17.962 39.6179 17.962Z" fill="white"></path><path d="M19.7273 7.29592C18.7458 6.51104 17.4356 7.18592 17.3336 8.41683C16.5465 7.81973 15.7741 8.10579 15.3941 8.50705C14.524 9.42478 15.2261 10.6784 16.2391 11.0673C17.0857 11.3922 17.9924 11.6658 18.891 11.8676C19.2189 11.2499 19.4786 10.7393 19.6957 10.3579C20.7022 8.58921 20.1095 7.6011 19.7273 7.29592Z" fill="#FABB00"></path></svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 38" fill="none" class="instinct-inline-logo__img instinct-inline-logo__img--dark" aria-hidden="true" focusable="false"><path d="M55.3876 27.1048H60.434V9.61596H55.3876V27.1048ZM73.664 18.5356H73.6141L66.4435 9.61632H61.9464V27.1051H66.9672V17.9107H67.0178L74.3887 27.1051H78.6606V9.61632H73.664V18.5356ZM43.4656 11.969C43.4392 11.9558 43.1802 11.8875 43.1436 11.515C42.9631 9.7003 41.3135 6.5088 38.4323 4.89219C36.8531 4.00621 35.103 3.49709 33.2927 3.50005C32.2042 3.50076 31.2272 3.61152 30.5113 3.85865C30.2751 3.94013 30.1607 3.80296 30.1409 3.78755C28.4707 2.51719 25.4487 0.804408 21.2575 0.810318C19.1809 0.812556 17.0472 1.25255 14.9156 2.11659C9.69167 4.23498 7.35915 7.93479 6.32127 10.6678C5.90904 11.7636 5.62444 12.9006 5.47039 14.0587C5.42199 14.4226 5.2122 14.735 4.89094 14.9125C2.97138 15.9709 1.13177 17.4307 0.371857 20.1878C0.354262 20.2517 0.335191 20.3147 0.318313 20.3793C0.298525 20.4497 0.282363 20.5223 0.263292 20.5942C0.0967953 21.2411 -0.000756656 21.9152 4.42053e-06 22.6142C4.42053e-06 22.6604 0.00658551 22.7052 0.00730177 22.7507C0.00586917 22.8057 0.000720683 22.8578 0.000720683 22.9135C0.00954018 29.9272 6.7819 31.4815 9.25817 31.4778C9.38142 31.4778 9.84863 31.4683 10.5968 31.4683C11.0758 31.4683 11.166 31.5467 11.3274 31.6905C12.1328 32.4079 14.7477 35.2076 16.4325 36.6725C17.2423 37.3773 18.4401 37.3685 19.2484 36.663L24.2458 31.7052C24.4203 31.5527 24.644 31.4631 24.8766 31.4654C27.4819 31.4874 30.7431 31.469 33.3565 31.4874C36.9785 31.5138 40.2727 30.7275 43.3416 28.7587C46.7216 26.5912 48.5362 23.7438 48.647 20.4827C48.6572 20.1761 48.658 19.8666 48.6382 19.5526C48.4145 16.07 46.4656 13.5101 43.4656 11.969ZM92.0863 17.4737C91.3117 16.9984 90.2504 16.6031 88.9015 16.2869C87.8848 16.0199 87.1396 15.8087 86.6643 15.6488C86.1912 15.4911 85.8824 15.3459 85.7416 15.2124C85.5985 15.0789 85.5281 14.93 85.5281 14.7627C85.5281 14.4122 85.7027 14.1598 86.0533 13.9999C86.4025 13.8422 86.9526 13.7623 87.7022 13.7623C88.4526 13.7623 89.0973 13.7806 89.6386 13.8128C90.1792 13.8474 90.6421 13.8884 91.0257 13.9383L93.1741 14.1634L93.898 10.3647L92.599 10.0155C91.8003 9.81527 90.9912 9.6627 90.1755 9.55346C89.3592 9.44566 88.5677 9.39131 87.8027 9.39131C86.4024 9.39131 85.1416 9.57907 84.0171 9.95244C82.8934 10.3273 82.0095 10.9155 81.3692 11.7144C80.7266 12.5145 80.4068 13.5547 80.4068 14.8376C80.4068 15.8703 80.5726 16.716 80.9064 17.3739C81.2393 18.0312 81.8093 18.5857 82.6183 19.0354C83.4259 19.485 84.5203 19.9177 85.9029 20.3337C86.8352 20.6175 87.5107 20.8464 87.9274 21.021C88.3433 21.1962 88.6051 21.3546 88.7144 21.4963C88.8223 21.637 88.8758 21.8 88.8758 21.9841C88.8758 22.2665 88.7306 22.4872 88.4393 22.6448C88.1482 22.804 87.6597 22.8825 86.9783 22.8825C86.178 22.8825 85.391 22.8495 84.6164 22.7827C83.8425 22.716 83.1721 22.6413 82.6051 22.5576L80.5572 22.2833L79.757 26.1305L81.2812 26.5552C82.2142 26.8061 83.1296 26.9975 84.0296 27.1295C84.9289 27.2631 85.82 27.3297 86.7032 27.3297C88.102 27.3297 89.368 27.1178 90.5005 26.6931C91.633 26.2676 92.5323 25.6177 93.1983 24.7435C93.8651 23.8691 94.1973 22.7579 94.1973 21.4081C94.1973 20.5427 94.0396 19.7894 93.7235 19.1469C93.4066 18.5065 92.8624 17.9476 92.0863 17.4737ZM152.338 9.59832V14.0205H157.76V27.0871H162.78V14.0205H168.152V9.59832H152.338ZM94.8578 14.0385H100.279V27.1051H105.3V14.0385H110.672V9.61632H94.8578V14.0385ZM149.648 22.3573C148.915 22.4579 148.236 22.5415 147.612 22.6082C146.986 22.6749 146.416 22.708 145.9 22.708C144.951 22.708 144.164 22.5671 143.54 22.2833C142.914 22.0009 142.445 21.538 142.127 20.8962C141.812 20.2552 141.653 19.3934 141.653 18.3099C141.653 17.261 141.824 16.4212 142.166 15.7867C142.506 15.1544 143.006 14.6923 143.664 14.4011C144.322 14.1092 145.117 13.9632 146.05 13.9632C146.65 13.9632 147.245 13.9926 147.837 14.0505C148.427 14.1092 149.056 14.1876 149.723 14.2882L150.347 14.3622L151.197 10.4402L150.972 10.3647C150.172 10.0654 149.331 9.82405 148.449 9.64067C147.566 9.45801 146.675 9.36561 145.775 9.36561C144.476 9.36561 143.265 9.55857 142.14 9.94071C141.016 10.3236 140.029 10.8935 139.18 11.6512C138.33 12.4104 137.667 13.3463 137.193 14.4627C136.718 15.5783 136.481 16.8701 136.481 18.3356C136.481 20.3505 136.869 22.0251 137.643 23.3578C138.417 24.6899 139.487 25.6845 140.853 26.3431C142.218 27.0011 143.793 27.3297 145.575 27.3297C146.475 27.3297 147.404 27.2388 148.362 27.0546C149.318 26.8728 150.223 26.6146 151.073 26.2808L151.497 26.1062L150.722 22.2084L149.648 22.3573ZM130.198 18.5356H130.147L122.977 9.61632H118.479V27.1051H123.5V17.9107H123.551L130.922 27.1051H135.194V9.61632H130.198V18.5356ZM112.029 27.1048H117.075V9.61596H112.029V27.1048Z" fill="currentColor"></path><path d="M32.6438 22.7121C32.4296 22.3769 32.1201 22.1099 31.7497 21.9551L33.7529 14.0392C33.8174 14.0451 33.8798 14.0583 33.9458 14.0583C34.2715 14.0583 34.5737 13.9717 34.8436 13.8309L38.2492 18.5231C37.8869 18.8781 37.6609 19.3718 37.6609 19.9189C37.6609 20.1016 37.694 20.2739 37.7402 20.4412L32.6438 22.7121ZM17.7714 28.4488L11.1986 23.1302C11.3908 22.9307 11.5382 22.6938 11.6321 22.4304L19.1049 23.2783C19.1247 23.8901 19.4247 24.4277 19.8817 24.7732L17.7714 28.4488ZM17.7824 9.96464L22.9558 14.5453C22.7556 14.8519 22.6367 15.2172 22.6367 15.6111C22.6367 15.7688 22.6602 15.9199 22.6954 16.0666L11.3753 20.6356C11.2015 20.3957 10.98 20.1969 10.7203 20.0576L17.7824 9.96464ZM32.0358 12.5128L26.2976 14.6649C25.9631 14.0641 25.3294 13.6534 24.5937 13.6534C24.1155 13.6534 23.6827 13.8324 23.3423 14.1177L18.6626 9.97346L31.9932 12.0867C31.9932 12.0925 31.9918 12.0984 31.9918 12.1042C31.9918 12.2444 32.0079 12.3808 32.0358 12.5128ZM30.9964 21.804C30.6436 21.804 30.3172 21.9045 30.0311 22.0681L26.013 16.9519C26.3446 16.6013 26.5514 16.1312 26.5514 15.6111C26.5514 15.4703 26.5345 15.3338 26.5067 15.2018L32.2455 13.0497C32.4583 13.4304 32.7869 13.7378 33.1925 13.9072L31.1893 21.8231C31.1248 21.8172 31.0624 21.804 30.9964 21.804ZM22.1629 21.6038L24.0531 17.483C24.2255 17.5329 24.4052 17.5681 24.5937 17.5681C24.9465 17.5681 25.2729 17.4676 25.559 17.304L29.5764 22.4201C29.3314 22.6798 29.1524 23.004 29.0783 23.3671L22.9947 23.0326C22.9389 22.4407 22.6279 21.9236 22.1629 21.6038ZM11.7472 21.8649C11.7524 21.7497 11.7516 21.6338 11.7362 21.5157C11.7186 21.3874 11.6878 21.2649 11.6482 21.1468L22.914 16.5998C23.0673 16.8602 23.2741 17.0832 23.5265 17.2483L21.6414 21.358C21.4558 21.2994 21.2614 21.259 21.0561 21.259C20.1516 21.259 19.3991 21.8752 19.1739 22.7077L11.7472 21.8649ZM39.6179 17.962C39.2915 17.962 38.9886 18.0492 38.7179 18.1908L35.3123 13.4986C35.6739 13.1437 35.9005 12.6507 35.9005 12.1042C35.9005 11.0253 35.0255 10.1502 33.9458 10.1502C33.0722 10.1502 32.3409 10.7275 32.0908 11.5189L17.7766 9.2495L17.7318 9.53409L17.4957 9.36903L10.1541 19.861C9.95456 19.8243 9.74771 19.8082 9.53501 19.8368C8.46409 19.9813 7.71226 20.9671 7.85675 22.038C8.00126 23.1096 8.98634 23.8608 10.0572 23.7162C10.3015 23.6832 10.526 23.6025 10.7299 23.4911L17.9335 29.3202L20.3863 25.0483C20.5961 25.1246 20.8191 25.173 21.0561 25.173C22.0022 25.173 22.7922 24.5011 22.9734 23.6084L29.0578 23.9429C29.1502 24.9375 29.9776 25.718 30.9964 25.718C32.0768 25.718 32.9534 24.8422 32.9534 23.761C32.9534 23.5791 32.9204 23.406 32.8742 23.2395L37.9705 20.9678C38.3182 21.5128 38.924 21.8766 39.6179 21.8766C40.6991 21.8766 41.5749 21.0001 41.5749 19.9189C41.5749 18.8385 40.6991 17.962 39.6179 17.962Z" fill="currentColor"></path><path d="M19.7273 7.29592C18.7458 6.51104 17.4356 7.18592 17.3336 8.41683C16.5465 7.81973 15.7741 8.10579 15.3941 8.50705C14.524 9.42478 15.2261 10.6784 16.2391 11.0673C17.0857 11.3922 17.9924 11.6658 18.891 11.8676C19.2189 11.2499 19.4786 10.7393 19.6957 10.3579C20.7022 8.58921 20.1095 7.6011 19.7273 7.29592Z" fill="#FABB00"></path></svg></span></a><span class="vet-preview" aria-hidden="true"><img src="/src/img/instinct-site-preview.png" alt="" decoding="async" loading="eager" width="800" height="520" /></span></span>';
    const descEl          = document.querySelector('.description');
    const defaultDesc     = descEl.innerHTML;
    const workDesc        = `I think in systems, design in details, and am always chasing the pattern that makes something complicated feel completely obvious.`;
    let currentMode    = 'life';

    const modeTabInset = 6; /* keep in sync with #modeTab padding in styles.css */

    function positionTabPill(btn) {
      tabPill.style.width  = btn.offsetWidth + 'px';
      tabPill.style.transform = `translateX(${btn.offsetLeft - modeTabInset}px)`;
    }

    // Init pill on the active tab
    requestAnimationFrame(() => positionTabPill(modeTab.querySelector('.tab-opt.active')));

    // ── Bookshelf ──
    const bookshelfView = document.getElementById('bookshelfView');
    const introEl = document.querySelector('.intro');

    const BOOKS = [
      { title: 'Atomic Habits', author: 'James Clear', desc: 'An easy and proven way to build good habits and break bad ones — tiny changes that compound into remarkable results.', rating: 5, bg: '#1a1a1c', fg: '#ffd60a' },
      { title: 'Build', author: 'Tony Fadell', desc: 'The inside story of how Apple and Nest were built — honest lessons on product development, leadership, and the nature of creative work.', rating: 5, bg: '#0d2137', fg: '#4db8ff' },
      { title: 'Building A Second Brain', author: 'Tiago Forte', desc: 'A method for capturing and organizing ideas so your past thinking becomes your greatest asset for future creativity.', rating: 4, bg: '#1e0d30', fg: '#b388ff' },
      { title: 'Creativity, Inc.', author: 'Ed Catmull', desc: 'A handbook for anyone who strives for originality and the first book to describe Pixar\'s creative process.', rating: 5, bg: '#2b1c3a', fg: '#e8b4f8' },
      { title: 'Designing for Emotion', author: 'Aarron Walter', desc: 'How to use personality, surprise, and joy to design products that users genuinely love rather than merely tolerate.', rating: 4, bg: '#2d1206', fg: '#ff8a50' },
      { title: 'Emotional Design', author: 'Don Norman', desc: 'Why attractive things work better — how aesthetics and feeling shape our emotional and behavioral responses to objects.', rating: 4, bg: '#0a1f3c', fg: '#90caf9' },
      { title: 'Feel-Good Productivity', author: 'Ali Abdaal', desc: 'How energizing your work through play, power, and people unlocks a more sustainable and joyful path to getting things done.', rating: 4, bg: '#0d2a1a', fg: '#69f0ae' },
      { title: 'Money for Couples', author: 'Ramit Sethi', desc: 'A practical guide for partners to align on money, break financial taboos, and build a rich life together without resentment.', rating: 4, bg: '#1a2a1a', fg: '#a5d6a7' },
      { title: 'Show Your Work', author: 'Austin Kleon', desc: 'Ten ways to share your creativity without selling out — how to get discovered doing the work you love.', rating: 5, bg: '#111111', fg: '#f5f5f5' },
      { title: 'Steal Like An Artist', author: 'Austin Kleon', desc: 'Creative work builds on what came before — why the best artists are skilled remixers with original voices.', rating: 5, bg: '#1c1c1c', fg: '#e0e0e0' },
      { title: 'The Design of Everyday Things', author: 'Don Norman', desc: 'A powerful primer on human-centered design that explains why some products delight while others only frustrate.', rating: 5, bg: '#bf3b28', fg: '#fdf0e0' },
      { title: 'The Product Minded Engineer', author: 'Gergely Orosz', desc: 'How the best engineers think beyond code — deeply understanding products and working cross-functionally to drive real outcomes.', rating: 4, bg: '#0f1b2d', fg: '#64b5f6' },
      { title: 'The Ride of a Lifetime', author: 'Robert Iger', desc: 'Leadership lessons from twenty years running Disney — how optimism, courage, and decisiveness can reshape an iconic company.', rating: 5, bg: '#1a1a2e', fg: '#c0c0d8' },
      { title: 'The Speed of Trust', author: 'Stephen M.R. Covey', desc: 'How trust — far more than ethics — is a practical, learnable business skill that changes everything when it increases.', rating: 4, bg: '#1a2744', fg: '#82b1ff' },
    ];

    function buildCoverHTML(book, large) {
      const size = large ? 'large' : '';
      return `
        <div class="book-cover-author">${book.author}</div>
        <div class="book-cover-deco">
          <div class="book-cover-deco-line"></div>
          <div class="book-cover-deco-line" style="width:60%;opacity:0.2"></div>
        </div>
        <div class="book-cover-title">${book.title}</div>
      `;
    }

    function starsHTML(rating) {
      return Array.from({ length: 5 }, (_, i) => {
        const filled = i < rating;
        return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:${filled ? '#f59e0b' : 'var(--text-muted)'}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }).join('');
    }

    let bookshelfRendered = false;
    function renderBookshelf() {
      if (bookshelfRendered) return;
      bookshelfRendered = true;
      const grid = document.createElement('div');
      grid.className = 'bookshelf-grid';
      BOOKS.forEach((book, i) => {
        const btn = document.createElement('button');
        btn.className = 'book-card';
        btn.dataset.bookIdx = i;
        const cover = document.createElement('div');
        cover.className = 'book-cover';
        cover.style.setProperty('--bc', book.bg);
        cover.style.setProperty('--ba', book.fg);
        cover.innerHTML = buildCoverHTML(book);
        btn.appendChild(cover);
        btn.addEventListener('click', () => openBookModal(i));
        grid.appendChild(btn);
      });
      bookshelfView.appendChild(grid);
    }

    // Book modal
    const bookModal = document.getElementById('bookModal');
    const bookModalClose = document.getElementById('bookModalClose');
    const bookModalCover = document.getElementById('bookModalCover');
    const bookModalStars = document.getElementById('bookModalStars');
    const bookModalTitle = document.getElementById('bookModalTitle');
    const bookModalDesc  = document.getElementById('bookModalDesc');
    let bookModalOpen = false;

    function openBookModal(idx) {
      if (bookModalOpen) return;
      bookModalOpen = true;
      const book = BOOKS[idx];
      bookModalCover.style.setProperty('--bc', book.bg);
      bookModalCover.style.setProperty('--ba', book.fg);
      bookModalCover.innerHTML = buildCoverHTML(book, true);
      bookModalStars.innerHTML = starsHTML(book.rating);
      bookModalTitle.textContent = book.title;
      bookModalDesc.textContent  = book.desc;
      bookModal.style.pointerEvents = 'all';
      bookModal.classList.add('bm-open');
    }

    function closeBookModal() {
      if (!bookModalOpen) return;
      bookModalOpen = false;
      bookModal.classList.remove('bm-open');
      bookModal.style.pointerEvents = 'none';
    }

    bookModalClose.addEventListener('click', closeBookModal);
    bookModal.addEventListener('click', e => { if (e.target === bookModal) closeBookModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && bookModalOpen) closeBookModal(); });

    function setMode(mode) {
      if (mode === currentMode) return;
      const prevMode = currentMode;
      currentMode = mode;

      const isBookshelfMode = mode === 'bookshelf';
      tabPill.style.opacity = isBookshelfMode ? '0' : '1';
      overflowBtn.classList.toggle('active', isBookshelfMode);
      overflowItems.forEach(item => item.classList.toggle('active', item.dataset.mode === mode));
      closeOverflowPanel();

      tabOpts.forEach(btn => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle('active', active);
        if (active) positionTabPill(btn);
      });

      const isWork = mode === 'work';
      const isBookshelf = mode === 'bookshelf';
      const urlSuffix = mode === 'work' ? '?work' : mode === 'bookshelf' ? '?bookshelf' : location.pathname;
      history.pushState(null, '', urlSuffix);
      document.body.classList.toggle('work-mode', isWork);
      if (!isWork && !isBookshelf) window.scrollTo({ top: 0 });

      // Headshot + headline only swap between life ↔ work
      if (!isBookshelf && prevMode !== 'bookshelf') {
        if (avatarImg) {
          avatarImg.src = isWork ? '/src/img/headshot-work.jpg' : '/src/img/headshot-personal.jpg';
        }
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
          }
        });
      }

      // Show/hide now strip
      const nowStripEl = document.getElementById('nowStrip');
      if (nowStripEl) nowStripEl.style.display = (isWork || isBookshelf) ? 'none' : '';

      if (isBookshelf) {
        const fadeOut = prevMode === 'work' ? portfolioGrid : launchpad;
        anime({
          targets: [fadeOut, introEl].filter(Boolean),
          opacity: 0, scale: 0.97,
          duration: 220, easing: 'easeInQuad',
          complete: () => {
            launchpad.style.display = 'none';
            portfolioGrid.style.display = 'none';
            if (introEl) introEl.style.display = 'none';
            renderBookshelf();
            bookshelfView.style.opacity = '0';
            bookshelfView.style.display = 'flex';
            anime({ targets: '.book-card', opacity: [0, 1], translateY: [14, 0], duration: 500,
              easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(30) });
            anime({ targets: bookshelfView, opacity: [0, 1], duration: 300, easing: 'easeOutQuad' });
          }
        });
      } else if (isWork) {
        if (prevMode === 'bookshelf') {
          // restore headshot/heading to work state
          if (avatarImg) avatarImg.src = '/src/img/headshot-work.jpg';
          heading.innerHTML = workHeadline;
          descEl.innerHTML  = workDesc;
          anime({
            targets: bookshelfView,
            opacity: 0, scale: 0.97,
            duration: 220, easing: 'easeInQuad',
            complete: () => {
              bookshelfView.style.display = 'none';
              if (introEl) { introEl.style.removeProperty('display'); introEl.style.opacity = ''; introEl.style.transform = ''; }
              portfolioGrid.style.opacity = '';
              portfolioGrid.style.transform = '';
              portfolioGrid.style.display = 'grid';
              anime({ targets: '.study, .kpi', opacity: [0, 1], translateY: [14, 0], duration: 600,
                easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(40) });
            }
          });
        } else {
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
        }
      } else {
        // life mode
        if (prevMode === 'bookshelf') {
          // restore headshot/heading to life state
          if (avatarImg) avatarImg.src = '/src/img/headshot-personal.jpg';
          heading.innerHTML = defaultHeadline;
          descEl.innerHTML  = defaultDesc;
          anime({
            targets: bookshelfView,
            opacity: 0, scale: 0.97,
            duration: 220, easing: 'easeInQuad',
            complete: () => {
              bookshelfView.style.display = 'none';
              if (introEl) { introEl.style.removeProperty('display'); introEl.style.opacity = ''; introEl.style.transform = ''; }
              launchpad.style.opacity = '';
              launchpad.style.transform = '';
              launchpad.style.display = 'flex';
              anime({ targets: '.app', opacity: [0, 1], translateY: [14, 0], duration: 600,
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
              launchpad.style.opacity = '';
              launchpad.style.transform = '';
              launchpad.style.display = 'flex';
              anime({ targets: '.app', opacity: [0, 1], translateY: [14, 0], duration: 600,
                easing: 'cubicBezier(0.16,1,0.3,1)', delay: anime.stagger(55) });
            }
          });
        }
      }
    }

    tabOpts.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // ── Overflow panel ──
    let overflowOpen = false;

    function closeOverflowPanel() {
      if (!overflowOpen) return;
      overflowOpen = false;
      overflowPanel.classList.remove('open');
      overflowBtn.setAttribute('aria-expanded', 'false');
      overflowPanel.setAttribute('aria-hidden', 'true');
    }

    overflowBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (overflowOpen) {
        closeOverflowPanel();
      } else {
        overflowOpen = true;
        overflowPanel.classList.add('open');
        overflowBtn.setAttribute('aria-expanded', 'true');
        overflowPanel.setAttribute('aria-hidden', 'false');
      }
    });

    overflowItems.forEach(item => {
      item.addEventListener('click', () => setMode(item.dataset.mode));
    });

    document.addEventListener('click', e => {
      if (overflowOpen && !overflowPanel.contains(e.target)) closeOverflowPanel();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overflowOpen) closeOverflowPanel();
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

    // ── Social links panel ──
    const socialBtn   = document.getElementById('socialBtn');
    const socialPanel = document.getElementById('socialPanel');
    let socialOpen = false;

    function closeSocialPanel() {
      if (!socialOpen) return;
      socialOpen = false;
      socialBtn.classList.remove('open');
      socialPanel.classList.remove('open');
      socialBtn.setAttribute('aria-expanded', 'false');
      socialPanel.setAttribute('aria-hidden', 'true');
    }

    socialBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (socialOpen) {
        closeSocialPanel();
      } else {
        socialOpen = true;
        socialBtn.classList.add('open');
        socialPanel.classList.add('open');
        socialBtn.setAttribute('aria-expanded', 'true');
        socialPanel.setAttribute('aria-hidden', 'false');
      }
    });

    document.addEventListener('click', e => {
      if (socialOpen && !socialPanel.contains(e.target)) closeSocialPanel();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && socialOpen) closeSocialPanel();
    });

    // ── Theme toggle (light / warm charcoal dark) ──
    // Explicit choice is stored as lukevz-theme = light | dark. Absent key = follow system (not "cached" by reload).
    const THEME_KEY = 'lukevz-theme';
    const themeToggle = document.getElementById('themeToggle');
    const themeMoon = themeToggle?.querySelector('.theme-icon-moon');
    const themeSun  = themeToggle?.querySelector('.theme-icon-sun');

    function themeIsExplicitOverride() {
      try {
        const s = localStorage.getItem(THEME_KEY);
        return s === 'dark' || s === 'light';
      } catch {
        return false;
      }
    }

    function isDarkTheme() {
      const t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function updateThemeToggleUi(dark) {
      if (!themeToggle) return;
      themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      const hint = ' Shift-click: use system appearance.';
      themeToggle.setAttribute('title', (dark ? 'Light mode' : 'Dark mode') + hint);
      themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeMoon?.toggleAttribute('hidden', dark);
      themeSun?.toggleAttribute('hidden', !dark);
    }

    function applyThemeSystem(persist) {
      document.documentElement.removeAttribute('data-theme');
      if (persist) {
        try { localStorage.removeItem(THEME_KEY); } catch (err) { /* ignore */ }
      }
      updateThemeToggleUi(isDarkTheme());
    }

    function applyThemeDom(dark, persist) {
      const root = document.documentElement;
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      if (persist) {
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
      }
      updateThemeToggleUi(dark);
    }

    const themeTransitionEl = document.getElementById('themeTransition');
    const themeArc = themeTransitionEl?.querySelector('.theme-transition__arc');
    let themeWipeBusy = false;
    const THEME_WIPE_MS = 1200;

    function themePrefersReducedMotion() {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function runThemeWipe(targetDark, persist) {
      if (!themeTransitionEl || !themeArc || themeWipeBusy) return;
      if (isDarkTheme() === targetDark) return;
      themeWipeBusy = true;
      anime.remove(themeArc);
      themeTransitionEl.classList.remove('theme-transition--to-dark', 'theme-transition--to-light');
      themeTransitionEl.classList.add(targetDark ? 'theme-transition--to-dark' : 'theme-transition--to-light');
      /* Bottom-center pivot: sweep along 180° horizon BL → BR (to dark), reverse to light */
      const rotFrom = targetDark ? '-90deg' : '90deg';
      const rotTo   = targetDark ? '90deg' : '-90deg';
      themeArc.style.transform = `rotate(${rotFrom})`;
      themeTransitionEl.classList.add('is-active');
      themeTransitionEl.setAttribute('aria-hidden', 'false');

      anime({
        targets: themeArc,
        rotate: [rotFrom, rotTo],
        duration: THEME_WIPE_MS,
        easing: 'cubicBezier(0.38, 0.02, 0.22, 1)',
        update(anim) {
          const t = anim.progress / 100;
          const blend = targetDark ? t : (1 - t);
          document.documentElement.style.setProperty('--theme-blend', String(blend));
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend } }));
        },
        complete() {
          applyThemeDom(targetDark, persist);
          document.documentElement.style.removeProperty('--theme-blend');
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: targetDark ? 1 : 0 } }));
          themeArc.style.transform = '';
          themeTransitionEl.classList.remove('is-active', 'theme-transition--to-dark', 'theme-transition--to-light');
          themeTransitionEl.setAttribute('aria-hidden', 'true');
          themeWipeBusy = false;
        }
      });
    }

    function runThemeWipeToSystem(targetDark) {
      if (!themeTransitionEl || !themeArc || themeWipeBusy) return;
      if (isDarkTheme() === targetDark) {
        applyThemeSystem(true);
        document.documentElement.style.removeProperty('--theme-blend');
        document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: targetDark ? 1 : 0 } }));
        return;
      }
      themeWipeBusy = true;
      anime.remove(themeArc);
      themeTransitionEl.classList.remove('theme-transition--to-dark', 'theme-transition--to-light');
      themeTransitionEl.classList.add(targetDark ? 'theme-transition--to-dark' : 'theme-transition--to-light');
      const rotFrom = targetDark ? '-90deg' : '90deg';
      const rotTo   = targetDark ? '90deg' : '-90deg';
      themeArc.style.transform = `rotate(${rotFrom})`;
      themeTransitionEl.classList.add('is-active');
      themeTransitionEl.setAttribute('aria-hidden', 'false');

      anime({
        targets: themeArc,
        rotate: [rotFrom, rotTo],
        duration: THEME_WIPE_MS,
        easing: 'cubicBezier(0.38, 0.02, 0.22, 1)',
        update(anim) {
          const t = anim.progress / 100;
          const blend = targetDark ? t : (1 - t);
          document.documentElement.style.setProperty('--theme-blend', String(blend));
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend } }));
        },
        complete() {
          applyThemeSystem(true);
          document.documentElement.style.removeProperty('--theme-blend');
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: targetDark ? 1 : 0 } }));
          themeArc.style.transform = '';
          themeTransitionEl.classList.remove('is-active', 'theme-transition--to-dark', 'theme-transition--to-light');
          themeTransitionEl.setAttribute('aria-hidden', 'true');
          themeWipeBusy = false;
        }
      });
    }

    if (themeToggle) {
      updateThemeToggleUi(isDarkTheme());
      themeToggle.addEventListener('click', e => {
        e.stopPropagation();
        if (e.shiftKey) {
          const sysDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
          if (themePrefersReducedMotion() || isDarkTheme() === sysDark) {
            applyThemeSystem(true);
            document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: sysDark ? 1 : 0 } }));
          } else {
            runThemeWipeToSystem(sysDark);
          }
          return;
        }
        const next = !isDarkTheme();
        if (themePrefersReducedMotion()) {
          applyThemeDom(next, true);
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: next ? 1 : 0 } }));
          return;
        }
        runThemeWipe(next, true);
      });
    }

    try {
      if (typeof matchMedia === 'function') {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
          if (themeIsExplicitOverride()) return;
          updateThemeToggleUi(ev.matches);
          document.dispatchEvent(new CustomEvent('themeblend', { detail: { blend: ev.matches ? 1 : 0 } }));
        });
      }
    } catch (err) { /* ignore */ }

    /** Time Machine (#versionScreen) — open without power animation (e.g. link from /v1/) */
    function showVersionScreenFromHash() {
      if (!versionScreen) return;
      versionScreen.classList.add('visible');
      anime.remove('.tm-stack');
      anime({
        targets: '.tm-stack',
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 500,
        easing: 'cubicBezier(0.16,1,0.3,1)',
      });
      if (powerFade) {
        powerFade.style.pointerEvents = 'none';
        powerFade.style.opacity = '0';
      }
    }

    function hideVersionScreenIfNeeded() {
      if (!versionScreen || !versionScreen.classList.contains('visible')) return;
      anime.remove('.tm-stack');
      versionScreen.classList.remove('visible');
      const stack = document.querySelector('#versionScreen .tm-stack');
      if (stack) {
        stack.style.opacity = '';
        stack.style.transform = '';
      }
    }

    // ── Icon stroke-draw on hover (accent swatches) ──
    const appColors = {
      'Studio':      '#E6007F', /* Hot Magenta */
      'Field Notes': '#00BFD9', /* Neon Cyan */
      'Garden':      '#FFE100', /* Digital Yellow */
      'Northstar':   '#FF8C00'  /* Solar Orange */
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

    const SECTION_APP_BY_SLUG = {
      studio: 'Studio',
      'field-notes': 'Field Notes',
      garden: 'Garden',
      northstar: 'Northstar'
    };

    /** Same artwork as launchpad icons, without the hover stroke-trace (.outline-path). */
    function cloneLaunchpadSectionIconSvgForModal(appName) {
      const btn = document.querySelector(`.app[data-app="${appName}"]`);
      const src = btn && btn.querySelector('.app-icon svg');
      if (!src) return null;
      const clone = src.cloneNode(true);
      clone.querySelectorAll('.outline-path').forEach(n => n.remove());

      const ids = [...clone.querySelectorAll('[id]')]
        .map(el => el.id)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
      const suffix = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      let serialized = new XMLSerializer().serializeToString(clone);
      for (const id of ids) {
        const nid = id + suffix;
        serialized = serialized.split(`id="${id}"`).join(`id="${nid}"`);
        serialized = serialized.split(`url(#${id})`).join(`url(#${nid})`);
      }
      const wrap = document.createElement('div');
      wrap.innerHTML = serialized;
      return wrap.querySelector('svg');
    }

    function clearModalSectionIcon() {
      const el = document.getElementById('sModalSectionIcon');
      if (!el) return;
      el.innerHTML = '';
      el.classList.remove('is-visible');
    }

    function showModalSectionIconFromSlug(sectionSlug) {
      const el = document.getElementById('sModalSectionIcon');
      if (!el) return;
      const appName = SECTION_APP_BY_SLUG[sectionSlug];
      if (!appName) {
        clearModalSectionIcon();
        return;
      }
      const svg = cloneLaunchpadSectionIconSvgForModal(appName);
      if (!svg) {
        clearModalSectionIcon();
        return;
      }
      svg.setAttribute('width', '22');
      svg.setAttribute('height', '22');
      svg.setAttribute('aria-hidden', 'true');
      el.innerHTML = '';
      el.appendChild(svg);
      el.classList.add('is-visible');
    }

    function showModalPreviouslyIcon() {
      const el = document.getElementById('sModalSectionIcon');
      if (!el) return;
      el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>';
      el.classList.add('is-visible');
    }

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
      fadeSwap(`<div class="sm-list sm-fade sm-loading"><span style="color:var(--text-secondary);font-size:0.85rem">Loading…</span></div>`);

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
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic;margin-top:8px">Nothing here yet.</p></div>`);
          return;
        }

        const rows = allItems.map(item => {
          if (item.type === 'video') {
            const safeTitle = item.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<button class="sm-row sm-row--video" data-section="${section}" data-slug="${item.slug}">
              <span class="sm-row-info">
                <span class="sm-row-title">${safeTitle}</span>
                <span class="sm-row-sub">${item.date}</span>
              </span>
              <div class="sm-row-thumb-wrap"><img class="sm-row-thumb" src="${item.thumbnail}" alt="" loading="lazy"></div>
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
      fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-size:0.85rem">Loading…</p></div>`);
      fetchChannelVideos(handle).then(videos => {
        const video = videos.find(v => v.videoId === videoId);
        if (!video) {
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Video not found.</p></div>`);
          return;
        }
        const safeTitle = video.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const desc = video.description
          ? `<p style="color:var(--text-secondary);font-size:16px;line-height:1.6;white-space:pre-wrap">${video.description.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 600)}${video.description.length > 600 ? '…' : ''}</p>`
          : '';
        const iframe = `<div class="fn-video-wrap"><iframe src="https://www.youtube.com/embed/${videoId}" title="${video.title.replace(/"/g, '&quot;')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
        fadeSwap(`<div class="sm-fade cs-body"><h1>${safeTitle}</h1>${iframe}${desc}</div>`);
        setTimeout(() => { sModalBody.scrollTop = 0; }, 140);
      }).catch(() => {
        fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Couldn't load video.</p></div>`);
      });
    }

    function openSModal() {
      if (modalIsOpen) return;
      modalIsOpen = true;
      sModal.style.pointerEvents = 'all';
      sModal.classList.add('sm-open');
    }

    let prevNavMode = false;

    function closeSModal() {
      if (!modalIsOpen) return;
      prevNavMode = false;
      sModalBack.onclick = null;
      modalIsOpen = false;
      clearModalSectionIcon();
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

    // ── Previously button — opens case studies in sModal ──
    function renderPrevList() {
      prevNavMode = true;
      sModalTitle.textContent = 'Previously';
      showModalPreviouslyIcon();
      sModalBack.style.display = 'none';
      sModalBack.onclick = null;
      const rows = loadedStudies.map(({ meta }, i) => `
        <button class="sm-row" data-prev-idx="${i}">
          <span class="sm-row-title">${(meta.title || '').replace(/</g, '&lt;')}</span>
          <span class="sm-row-sub">${(meta.company || '').replace(/</g, '&lt;')}${meta.timeline ? ' · ' + meta.timeline : ''}</span>
        </button>`).join('');
      fadeSwap(`<div class="sm-list sm-fade">${rows || '<p style="color:var(--text-secondary);font-style:italic;margin-top:8px">Nothing here yet.</p>'}</div>`);
      setTimeout(() => {
        sModalBody.querySelectorAll('[data-prev-idx]').forEach(btn => {
          btn.addEventListener('click', () => renderPrevDetail(+btn.dataset.prevIdx));
        });
      }, 140);
    }

    function renderPrevDetail(idx) {
      const { meta, body } = loadedStudies[idx];
      sModalTitle.textContent = meta.title || '';
      clearModalSectionIcon();
      sModalBack.style.display = 'flex';
      sModalBack.onclick = () => renderPrevList();
      const metaRows = ['company', 'role', 'timeline', 'tools']
        .filter(k => meta[k])
        .map(k => `<div class="cs-meta-item"><span class="cs-meta-label">${k.charAt(0).toUpperCase() + k.slice(1)}</span><span class="cs-meta-value">${meta[k]}</span></div>`)
        .join('');
      fadeSwap(`<div class="sm-fade cs-body">
        ${metaRows ? `<div class="cs-meta">${metaRows}</div>` : ''}
        ${mdToHTML(body)}
      </div>`);
      setTimeout(() => { sModalBody.scrollTop = 0; }, 140);
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (modalIsOpen) return;
        renderPrevList();
        openSModal();
      });
    }

    function renderIndex(section) {
      const data = SECTIONS[section];
      if (!data) return;
      sModalTitle.textContent = data.label;
      showModalSectionIconFromSlug(section);
      sModalBack.style.display = 'none';

      if (section === 'field-notes' || section === 'studio') {
        renderMixedIndex(section);
        return;
      }

      // Dynamic markdown-based sections
      fadeSwap(`<div class="sm-list sm-fade sm-loading"><span style="color:var(--text-secondary);font-size:0.85rem">Loading…</span></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ items, files }) => {
          const mdItems = items || (files || []).map(f => ({ file: f, date: '1970-01-01' }));
          mdItems.sort((a, b) => b.date.localeCompare(a.date));
          if (!mdItems.length) {
            fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic;margin-top:8px">Nothing here yet.</p></div>`);
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
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic;margin-top:8px">Couldn't load content.</p></div>`);
        });
    }

    function renderItem(section, slug) {
      const data = SECTIONS[section];
      if (!data) return;
      sModalTitle.textContent = data.label;
      clearModalSectionIcon();
      sModalBack.style.display = 'flex';

      if (section === 'field-notes' || section === 'studio') {
        // YouTube video IDs are 11 chars of base64url
        if (/^[A-Za-z0-9_-]{11}$/.test(slug)) {
          renderVideoItem(section, slug);
          return;
        }
        // Markdown article in content/[section]/
        fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-size:0.85rem">Loading…</p></div>`);
        fetch(`/api/content/list?category=${section}`)
          .then(r => r.json())
          .then(({ items, files }) => {
            const fileList = items ? items.map(i => i.file) : (files || []);
            const filename = slugToFilename(slug, fileList);
            if (!filename) { fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Not found.</p></div>`); return null; }
            return fetch(`/content/${section}/${encodeURIComponent(filename)}`).then(r => r.text());
          })
          .then(md => { if (md) { fadeSwap(`<div class="sm-fade cs-body">${mdToHTML(md)}</div>`); setTimeout(() => { sModalBody.scrollTop = 0; }, 140); } })
          .catch(() => { fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Couldn't load content.</p></div>`); });
        return;
      }

      // Markdown-based sections: fetch file list to resolve slug → filename, then fetch markdown
      fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-size:0.85rem">Loading…</p></div>`);
      fetch(`/api/content/list?category=${section}`)
        .then(r => r.json())
        .then(({ items, files }) => {
          const fileList = items ? items.map(i => i.file) : (files || []);
          const filename = slugToFilename(slug, fileList);
          if (!filename) {
            fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Not found.</p></div>`);
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
          fadeSwap(`<div class="sm-fade"><p style="color:var(--text-secondary);font-style:italic">Couldn't load content.</p></div>`);
        });
    }

    function renderNowBoard() {
      sModal.classList.add('sm-now');
      sModalTitle.textContent = 'Now';
      clearModalSectionIcon();
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
        function startTicker(fullVal) {
          const val = (fullVal || '').toUpperCase();
          const padded = val + '   ';
          if (padded.length <= MAX) return;
          let offset = 0;
          let tid;
          function advance() {
            offset = (offset + 1) % padded.length;
            const slice = (padded + padded).slice(offset, offset + MAX);
            for (let i = 0; i < MAX; i++) cells[i].setChar(slice[i] || ' ', true);
            // Long pause when the full string has cycled back to the start
            tid = setTimeout(advance, offset === 0 ? 5000 : 340);
          }
          // Hold the initial view for 1.4s (matching now-strip's PAUSE_AFTER_LOAD)
          // before the first scroll begins
          tid = setTimeout(advance, 1400);
        }
        return { row, setValue, startTicker };
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
            if (rows[i]) {
              rows[i].setValue(item.value, true, i * ROW_STAGGER);
              // Start ticker after the row's flip-in finishes + 1s reading pause
              const tickerDelay = i * ROW_STAGGER + (MAX - 1) * 75 + 192 + 1000;
              setTimeout(() => rows[i].startTicker(item.value), tickerDelay);
            }
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
            if (rows[i]) {
              rows[i].setValue(item.value, true, i * ROW_STAGGER);
              const tickerDelay = i * ROW_STAGGER + (MAX - 1) * 75 + 192 + 1000;
              setTimeout(() => rows[i].startTicker(item.value), tickerDelay);
            }
          });
        });
    }

    function handleHash() {
      const parsed = parseHash();

      if (parsed && parsed.section === 'versions' && !parsed.item) {
        closeSModal();
        showVersionScreenFromHash();
        return;
      }

      hideVersionScreenIfNeeded();

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
    if (location.search === '?work') setMode('work');
    else if (location.search === '?bookshelf') setMode('bookshelf');

    // Deep link on load
    handleHash();
