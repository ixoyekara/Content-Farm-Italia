(() => {
  const COLORS = {
    'Sri Lanka': '#FF2FA6', 'Pakistan': '#FAA074', 'Armenia': '#80B9FC', 'Vietnam': '#57BE83',
    'Cambogia': '#E7C94A', 'Regno Unito': '#B48CFF', 'Australia': '#57D6C9', 'Stati Uniti': '#6B97FC',
    'Emirati Arabi Uniti': '#F1D06B', 'Canada': '#FF7267', 'Italia': '#E9E7E4', 'Non dichiarato': '#7E858E',
  };
  const TEMI = {
    'Leader e politica': '#FF2FA6', 'Immigrazione e sicurezza': '#FF7267', 'Orgoglio italiano': '#E9E7E4',
    'Storie strappalacrime': '#B48CFF', 'Nostalgia e tradizioni': '#F1D06B', "Cartoline d'Italia": '#57D6C9',
    'Buongiorno e frasi': '#7B93FF', 'Altro': '#4A515B',
  };
  const nf = new Intl.NumberFormat('it-IT');
  const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const pf = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });
  const df = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });

  const listeners = {};
  const APP = {
    COLORS, TEMI,
    colorOf: (c) => COLORS[c] || '#9AA0A8',
    fInt: (n) => (n === null || n === undefined ? '—' : nf.format(Math.round(n))),
    f1: (n) => (n === null || n === undefined ? '—' : nf1.format(n)),
    fC: (n) => (n === null || n === undefined ? '—' : n >= 1e6 ? `${nf1.format(n / 1e6)} Mln` : n >= 1e4 ? `${nf.format(Math.round(n / 1000))} mila` : nf.format(Math.round(n))),
    fP: (n) => (n === null || n === undefined ? '—' : pf.format(n)),
    fD: (s) => df.format(new Date(s.length <= 10 ? s + 'T12:00:00Z' : s)),
    state: { pagina: null, tema: null },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    emit(ev, v) { (listeners[ev] || []).forEach((fn) => fn(v)); },
    data: {},
  };
  window.APP = APP;

  APP.el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };
  APP.sw = (color) => { const i = APP.el('i', 'sw'); i.style.background = color; return i; };
  APP.avatar = (page, cls) => {
    if (page && page.foto) { const i = APP.el('img', cls || ''); i.src = page.foto; i.alt = ''; i.loading = 'lazy'; return i; }
    const d = APP.el('div', 'avatar ' + (cls || '')); return d;
  };
  APP.media = (file) => (file ? 'media/' + file.replace(/\.[a-z]+$/i, '.webp') : null);
  APP.setPagina = (riga, go) => {
    APP.state.pagina = riga;
    APP.emit('filtri');
    if (go) document.getElementById('contenuti').scrollIntoView({ behavior: 'smooth' });
  };

  const tip = document.getElementById('tip');
  APP.tip = (ev, title, lines) => {
    tip.replaceChildren(APP.el('b', '', title), ...lines.map((l) => APP.el('span', '', l)));
    tip.hidden = false;
    const w = tip.offsetWidth; const h = tip.offsetHeight;
    let x = ev.clientX + 14; let y = ev.clientY + 14;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - 14;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  };
  APP.untip = () => { tip.hidden = true; };

  let miniP = null;
  APP.loadMini = () => {
    if (!miniP) {
      miniP = fetch('data/miniature.json').then((r) => r.json()).then((rows) => {
        APP.data.mini = new Map(rows.map((m) => [m.immagine, m.src]));
        return APP.data.mini;
      }).catch(() => { APP.data.mini = new Map(); return APP.data.mini; });
    }
    return miniP;
  };
  APP.img = (file, big) => {
    if (!file) return null;
    if (big && APP.data.bigs && APP.data.bigs.has(file)) return APP.media(file);
    if (APP.data.mini && APP.data.mini.has(file)) return APP.data.mini.get(file);
    if (APP.data.bigs && APP.data.bigs.has(file)) return APP.media(file);
    return null;
  };

  // ---------- Section 1
  function feed() {
    const box = document.getElementById('feed');
    const pm = new Map(APP.data.post.map((p) => [p.post_id, p]));
    const posts = APP.data.scelte.feed.map((id) => pm.get(id)).filter(Boolean);
    document.getElementById('feed-count').textContent = `${posts.length} post`;
    box.replaceChildren(...posts.map((p) => {
      const pg = APP.P.get(p.riga);
      const art = APP.el('article', 'fpost');
      const rev = APP.el('div', 'fpost-reveal');
      rev.append(APP.sw(APP.colorOf(p.paese_principale)), document.createTextNode('Gestita da '), APP.el('b', '', pg.paesi.length ? pg.paesi.join(' · ') : 'paese non dichiarato'));
      const head = APP.el('div', 'fpost-head');
      const who = APP.el('div');
      who.append(APP.el('div', 'fpost-name', pg.nome_attuale || pg.nome), APP.el('div', 'fpost-meta', `${APP.fD(p.data)} · ${APP.fInt(pg.follower)} follower`));
      head.append(APP.avatar(pg), who, APP.el('span', 'fpost-follow', 'Segui'));
      art.append(rev, head);
      if (p.testo) {
        const t = APP.el('div', 'fpost-text clamp', p.testo + (p.testo_troncato ? '…' : ''));
        art.append(t);
        if (p.testo.length > 200) {
          const m = APP.el('button', 'fpost-more', 'Altro');
          m.type = 'button';
          m.addEventListener('click', () => { t.classList.toggle('clamp'); m.textContent = t.classList.contains('clamp') ? 'Altro' : 'Meno'; });
          art.append(m);
        }
      }
      if (p.immagine) {
        const fig = APP.el('div', 'fpost-img');
        const im = APP.el('img'); im.src = APP.media(p.immagine); im.alt = p.descrizione_immagine || ''; im.loading = 'lazy';
        fig.append(im);
        if (p.tipo === 'video') fig.append(APP.el('span', 'fpost-badge', `Video · ${APP.fC(p.visualizzazioni)} visualizzazioni`));
        art.append(fig);
      }
      const st = APP.el('div', 'fpost-stats');
      const l = APP.el('span'); l.append(APP.el('b', '', APP.fInt(p.reazioni)), document.createTextNode(' reazioni'));
      const r = APP.el('span'); r.append(APP.el('b', '', APP.fInt(p.commenti)), document.createTextNode(' commenti · '), APP.el('b', '', APP.fInt(p.condivisioni)), document.createTextNode(' condivisioni'));
      st.append(l, r);
      const act = APP.el('div', 'fpost-actions');
      ['Mi piace', 'Commenta', 'Condividi'].forEach((x) => act.append(APP.el('span', '', x)));
      const a = APP.el('a', 'fpost-link', 'Apri il post originale ↗'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
      art.append(st, act, a);
      return art;
    }));
  }

  function origins() {
    const g = d3.rollups(APP.data.pagine, (v) => v.length, (p) => p.paese_principale).sort((a, b) => b[1] - a[1]);
    const tot = APP.data.pagine.length;
    const bar = document.getElementById('origin-bar');
    bar.replaceChildren(...g.map(([k, n]) => {
      const d = APP.el('div'); d.style.flex = n; d.style.background = APP.colorOf(k);
      d.addEventListener('mousemove', (ev) => APP.tip(ev, k, [`${n} ${n === 1 ? 'pagina' : 'pagine'} · ${APP.fP(n / tot)}`]));
      d.addEventListener('mouseleave', APP.untip);
      return d;
    }));
    document.getElementById('origin-list').replaceChildren(...g.map(([k, n]) => {
      const d = APP.el('div'); d.append(APP.sw(APP.colorOf(k)), APP.el('span', '', k), APP.el('em', '', `${n} · ${APP.fP(n / tot)}`)); return d;
    }));
  }

  function big() {
    const P = APP.data.pagine; const post = APP.data.post;
    const record = d3.greatest(P.filter((p) => p.post_giorno), (p) => p.post_giorno);
    const items = [
      ['Pagine monitorate', APP.fInt(P.length), 'tutte attive al 13 ottobre', false],
      ['Follower complessivi', APP.fC(d3.sum(P, (p) => p.follower)), 'sommati sulle 43 pagine', false],
      ['Gestite dallo Sri Lanka', APP.fInt(P.filter((p) => p.paesi.includes('Sri Lanka')).length), 'tra i paesi dichiarati', true],
      ['Visualizzazioni video', APP.fC(d3.sum(post, (p) => p.visualizzazioni || 0)), 'solo negli ultimi 50 post per pagina', false],
      ['Interazioni', APP.fC(d3.sum(post, (p) => p.interazioni)), 'reazioni, commenti e condivisioni', false],
      ['Post su leader e politica', APP.fP(post.filter((p) => p.tema === 'Leader e politica').length / post.length), 'tre su quattro citano Giorgia Meloni', true],
      ['Post al giorno, record', APP.f1(record.post_giorno), `${record.nome}, ${record.paesi.join(' · ')}`, false],
      ['Reti coordinate', APP.fInt(APP.data.reti.length), `${d3.sum(APP.data.reti, (r) => r.n_pagine)} pagine con contenuti in comune`, true],
      ['Origine nascosta', APP.fInt(P.filter((p) => !p.paesi.length).length), 'nessun paese dichiarato', false],
    ];
    document.getElementById('big').replaceChildren(...items.map(([l, v, s, hot]) => {
      const d = APP.el('div'); d.append(APP.el('span', '', l), APP.el('b', hot ? 'hot' : '', v), APP.el('small', '', s)); return d;
    }));
  }

  // nav highlight
  const links = [...document.querySelectorAll('.bar-nav a')];
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.dataset.sec === e.target.id)); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['contesto', 'localizzazione', 'contenuti', 'reti'].forEach((id) => io.observe(document.getElementById(id)));

  APP.ready = Promise.all(['pagine', 'post', 'legami', 'reti', 'mondo', 'scelte'].map((k) => fetch(`data/${k}.json`).then((r) => r.json()).then((d) => { APP.data[k] = d; })))
    .then(() => {
      APP.P = new Map(APP.data.pagine.map((p) => [p.riga, p]));
      const bigs = new Set(APP.data.scelte.feed.map((id) => APP.data.post.find((p) => p.post_id === id)?.immagine));
      const byI = [...APP.data.post].filter((p) => p.immagine).sort((a, b) => b.interazioni - a.interazioni).slice(0, 24);
      const byS = [...APP.data.post].filter((p) => p.immagine).sort((a, b) => b.condivisioni - a.condivisioni).slice(0, 24);
      byI.concat(byS).forEach((p) => bigs.add(p.immagine));
      APP.data.legami.filter((l) => l.riga_a !== l.riga_b).forEach((l) => { if (l.immagine_a) bigs.add(l.immagine_a); if (l.immagine_b) bigs.add(l.immagine_b); });
      APP.data.bigs = bigs;
      feed(); origins(); big();
      APP.emit('ready');
    })
    .catch((e) => {
      document.querySelectorAll('.loading').forEach((x) => { x.textContent = 'Dati non caricati. Ricarica la pagina.'; });
      console.error(e);
    });
})();
