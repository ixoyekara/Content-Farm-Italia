(() => {
  const A = window.APP;
  const ITALIA = { lat: 42.67, lng: 12.27 };
  const METRICHE = [
    { k: 'pagine', label: 'Numero di pagine', desc: 'quante pagine gestisce il paese', fmt: (v) => A.fInt(v), pageKey: 'follower' },
    { k: 'follower', label: 'Follower', desc: 'somma dei follower delle pagine', fmt: (v) => A.fC(v) },
    { k: 'interazioni', label: 'Interazioni generate', desc: 'reazioni, commenti e condivisioni', fmt: (v) => A.fC(v) },
    { k: 'visualizzazioni', label: 'Visualizzazioni video', desc: 'sui video degli ultimi post', fmt: (v) => A.fC(v) },
    { k: 'interazioni_post', label: 'Interazioni per post', desc: 'media per singolo contenuto', fmt: (v) => A.fInt(v) },
    { k: 'post_giorno', label: 'Post al giorno', desc: 'ritmo di pubblicazione', fmt: (v) => A.f1(v) },
    { k: 'interazioni_follower', label: 'Interazioni per follower', desc: 'quanto rende ogni follower', fmt: (v) => A.f1(v) },
    { k: 'quota_politica', label: 'Quota di post politici', desc: 'leader e politica sul totale', fmt: (v) => A.fP(v) },
  ];
  const S = { metric: 'follower', country: null, page: null };
  let agg = new Map();
  let globe = null;
  let centroids = new Map();
  const NASCOSTA = 'Non dichiarato';

  const metric = () => METRICHE.find((m) => m.k === S.metric);
  const pageVal = (p) => { const m = metric(); return p[m.pageKey || m.k]; };
  const pageFmt = (v) => { const m = metric(); return m.pageKey ? A.fC(v) : m.fmt(v); };

  function aggregate() {
    agg = new Map();
    A.data.pagine.forEach((p) => {
      const keys = p.paesi.length ? p.paesi : [NASCOSTA];
      keys.forEach((k) => {
        if (!agg.has(k)) agg.set(k, { nome: k, pagine: 0, follower: 0, interazioni: 0, visualizzazioni: 0, post_giorno: 0, n_post: 0, follower_attivi: 0, politici: 0, righe: [] });
        const a = agg.get(k);
        a.pagine += 1; a.follower += p.follower; a.righe.push(p.riga);
        if (p.n_post) {
          a.interazioni += p.interazioni; a.visualizzazioni += p.visualizzazioni; a.post_giorno += p.post_giorno;
          a.n_post += p.n_post; a.follower_attivi += p.follower; a.politici += p.quota_politica * p.n_post;
        }
      });
    });
    agg.forEach((a) => {
      a.interazioni_post = a.n_post ? a.interazioni / a.n_post : null;
      a.interazioni_follower = a.follower_attivi ? a.interazioni / a.follower_attivi : null;
      a.quota_politica = a.n_post ? a.politici / a.n_post : null;
    });
  }

  const ramp = d3.interpolateRgb('#3A2133', '#FF2FA6');
  function norm() {
    const vals = [...agg.values()].filter((a) => a.nome !== 'Italia' && a.nome !== NASCOSTA).map((a) => a[S.metric] || 0);
    const max = d3.max(vals) || 1;
    return (v) => Math.sqrt(Math.max(0, v || 0) / max);
  }

  // ---------- rail
  function rail() {
    const box = document.getElementById('metric-opts');
    box.replaceChildren(...METRICHE.map((m) => {
      const b = A.el('button', 'opt'); b.type = 'button'; b.setAttribute('aria-pressed', String(S.metric === m.k));
      b.append(A.el('i'), A.el('strong', '', m.label), A.el('small', '', m.desc));
      b.addEventListener('click', () => { S.metric = m.k; refresh(); });
      return b;
    }));
    const list = document.getElementById('country-list');
    const rows = [...agg.values()].sort((a, b) => (b[S.metric] || 0) - (a[S.metric] || 0));
    list.replaceChildren(...rows.map((a) => {
      const b = A.el('button', 'opt'); b.type = 'button'; b.setAttribute('aria-pressed', String(S.country === a.nome));
      const i = A.el('i'); i.style.background = A.colorOf(a.nome); i.style.borderColor = A.colorOf(a.nome);
      b.append(i, A.el('strong', '', a.nome), A.el('em', '', metric().fmt(a[S.metric])));
      b.addEventListener('click', () => selectCountry(S.country === a.nome ? null : a.nome));
      return b;
    }));
    const m = metric(); const vals = [...agg.values()].filter((a) => a.nome !== 'Italia' && a.nome !== NASCOSTA).map((a) => a[S.metric] || 0);
    document.getElementById('legend-label').textContent = m.label;
    document.getElementById('legend-min').textContent = m.fmt(0);
    document.getElementById('legend-max').textContent = m.fmt(d3.max(vals));
  }

  // ---------- card
  function metricsGrid(items) {
    const g = A.el('div', 'metrics');
    items.forEach(([l, v, hot]) => { const d = A.el('div'); d.append(A.el('span', '', l), A.el('b', hot ? 'hot' : '', v)); g.append(d); });
    return g;
  }
  function pageRows(righe) {
    const pages = righe.map((r) => A.P.get(r)).sort((a, b) => (pageVal(b) ?? -1) - (pageVal(a) ?? -1));
    const list = A.el('div', 'plist');
    pages.forEach((p) => {
      const b = A.el('button', 'prow'); b.type = 'button';
      const t = A.el('div'); t.append(A.el('strong', '', p.nome), A.el('small', '', `${p.paesi_admin} · dal ${A.fD(p.data_creazione)}`));
      b.append(A.avatar(p), t, A.el('em', '', pageVal(p) === null ? 'n.d.' : pageFmt(pageVal(p))));
      b.addEventListener('click', () => selectPage(p.riga));
      list.append(b);
    });
    return list;
  }
  function card() {
    const body = document.getElementById('card-body');
    const m = metric();
    if (S.page) {
      const p = A.P.get(S.page);
      const top = A.el('div', 'pcard-top');
      const t = A.el('div');
      t.append(A.el('div', 'pcard-name', p.nome), A.el('div', 'pcard-sub', `${p.paesi_admin} · creata il ${A.fD(p.data_creazione)}${p.id_pagina ? ' · ID ' + p.id_pagina : ''}`));
      top.append(A.avatar(p), t);
      const back = A.el('button', 'back', `← ${S.country || 'Tutti i paesi'}`); back.type = 'button';
      back.addEventListener('click', () => { S.page = null; card(); });
      const head = A.el('div', 'ph'); head.append(back, A.el('small', '', 'Scheda pagina'));
      const grid = metricsGrid([
        ['Follower', A.fInt(p.follower), true],
        ['Interazioni', p.n_post ? A.fInt(p.interazioni) : 'n.d.'],
        ['Interazioni per post', p.n_post ? A.fInt(p.interazioni_post) : 'n.d.'],
        ['Visualizzazioni', p.n_post ? A.fC(p.visualizzazioni) : 'n.d.'],
        ['Post al giorno', p.n_post ? A.f1(p.post_giorno) : 'n.d.'],
        ['Interazioni per follower', p.n_post ? A.f1(p.interazioni_follower) : 'n.d.'],
        ['Post politici', p.n_post ? A.fP(p.quota_politica) : 'n.d.'],
        ['Rete', p.rete || 'nessuna', !!p.rete],
      ]);
      const sig = A.el('div', 'signals');
      (p.segnali.length ? p.segnali : ['Nessun segnale particolare oltre alla gestione estera']).forEach((s) => sig.append(A.el('div', '', s)));
      const act = A.el('div', 'card-actions');
      if (p.n_post) {
        const c = A.el('button', 'btn primary', 'Contenuti →'); c.type = 'button';
        c.addEventListener('click', () => A.setPagina(p.riga, true));
        act.append(c);
      }
      const fb = A.el('a', 'btn', 'Pagina ↗'); fb.href = p.link; fb.target = '_blank'; fb.rel = 'noopener';
      act.append(fb);
      if (p.rete) {
        const r = A.el('button', 'btn', `${p.rete} →`); r.type = 'button';
        r.addEventListener('click', () => { A.emit('rete', p.rete); document.getElementById('reti').scrollIntoView({ behavior: 'smooth' }); });
        act.append(r);
      }
      body.replaceChildren(head, top, grid, A.el('div', 'sub-h', 'Segnali'), sig, act);
      return;
    }
    if (S.country) {
      const a = agg.get(S.country);
      const back = A.el('button', 'back', '← Tutti i paesi'); back.type = 'button';
      back.addEventListener('click', () => selectCountry(null));
      const head = A.el('div', 'ph'); head.append(back, A.el('small', '', S.country === NASCOSTA ? 'senza paese dichiarato' : 'collegato all\'Italia'));
      const h = A.el('div', 'ctry-head'); h.append(A.el('h3', '', S.country === NASCOSTA ? 'Origine nascosta' : a.nome));
      const grid = metricsGrid([
        ['Pagine', A.fInt(a.pagine), true], ['Follower', A.fInt(a.follower)],
        ['Interazioni', A.fC(a.interazioni)], ['Visualizzazioni', A.fC(a.visualizzazioni)],
        ['Interazioni per post', A.fInt(a.interazioni_post)], ['Post al giorno', A.f1(a.post_giorno)],
      ]);
      body.replaceChildren(head, h, grid, A.el('div', 'sub-h', `Pagine · ordinate per ${m.pageKey ? 'follower' : m.label.toLowerCase()}`), pageRows(a.righe));
      return;
    }
    const P = A.data.pagine;
    const head = A.el('div', 'ph'); head.append(A.el('span', '', 'Panoramica'), A.el('small', '', 'tutte le pagine'));
    const grid = metricsGrid([
      ['Pagine', A.fInt(P.length), true], ['Paesi esteri', A.fInt([...agg.keys()].filter((k) => k !== 'Italia' && k !== NASCOSTA).length)],
      ['Follower', A.fInt(d3.sum(P, (p) => p.follower))], ['Interazioni', A.fC(d3.sum(P, (p) => p.interazioni || 0))],
    ]);
    const note = A.el('p', 'empty-note', 'Le colonne sui paesi misurano la metrica scelta. Clicca un paese sul mappamondo o nella lista a sinistra per vedere le sue pagine. Qui sotto le pagine più forti per la metrica scelta.');
    const top = [...P].sort((a, b) => (pageVal(b) ?? -1) - (pageVal(a) ?? -1)).slice(0, 12).map((p) => p.riga);
    body.replaceChildren(head, grid, note, A.el('div', 'sub-h', `Prime 12 · ${m.pageKey ? 'follower' : m.label.toLowerCase()}`), pageRows(top));
  }

  // ---------- globe
  const view = { base: { lat: 26, lng: 46, alt: 2.15 }, target: null, cur: null };
  view.target = { ...view.base }; view.cur = { ...view.base };
  let pointer = { x: 0, y: 0, on: false };
  let visible = false;

  function polyStyle() {
    if (!globe) return;
    const n = norm();
    globe
      .polygonCapColor((f) => {
        const k = f.properties.nome;
        if (k === 'Italia') return '#7B93FF';
        if (k && agg.has(k)) return S.country === k ? '#FF8FD0' : ramp(Math.max(0.15, n(agg.get(k)[S.metric])));
        return '#1A1E25';
      })
      .polygonSideColor(() => 'rgba(42,47,55,0.4)')
      .polygonStrokeColor((f) => (f.properties.nome && agg.has(f.properties.nome) ? 'rgba(255,143,208,0.7)' : '#2A2F37'))
      .polygonAltitude((f) => (f.properties.nome === 'Italia' ? 0.012 : f.properties.nome && agg.has(f.properties.nome) ? (S.country === f.properties.nome ? 0.014 : 0.008) : 0.004));
    globe.pointsData([...agg.values()].filter((a) => centroids.has(a.nome) && a.nome !== 'Italia').map((a) => ({ nome: a.nome, lat: centroids.get(a.nome)[1], lng: centroids.get(a.nome)[0], v: a[S.metric] })))
      .pointLat('lat').pointLng('lng')
      .pointAltitude((d) => 0.02 + 0.55 * n(d.v))
      .pointRadius((d) => (S.country === d.nome ? 1.25 : 0.95))
      .pointColor((d) => (S.country === d.nome ? '#FFFFFF' : (S.country ? 'rgba(255,47,166,0.45)' : '#FF2FA6')))
      .pointsMerge(false).pointsTransitionDuration(600)
      .onPointClick((d) => selectCountry(S.country === d.nome ? null : d.nome))
      .pointLabel((d) => { const w = A.el('div', 'gtip'); w.append(A.el('b', '', d.nome), document.createTextNode(`${metric().label}: ${metric().fmt(d.v)}`)); return w; });
    const arcs = [...agg.values()].filter((a) => centroids.has(a.nome) && a.nome !== 'Italia').map((a) => {
      const c = centroids.get(a.nome); return { nome: a.nome, startLat: c[1], startLng: c[0], endLat: ITALIA.lat, endLng: ITALIA.lng };
    });
    globe.arcsData(arcs)
      .arcColor((d) => (S.country === d.nome ? ['rgba(255,47,166,0.2)', '#FF2FA6', '#7B93FF'] : (S.country ? ['rgba(255,47,166,0)', 'rgba(255,47,166,0.08)'] : ['rgba(255,47,166,0.05)', 'rgba(255,47,166,0.55)'])))
      .arcStroke((d) => (S.country === d.nome ? 1.4 : 0.45))
      .arcDashLength((d) => (S.country === d.nome ? 0.5 : 0.35))
      .arcDashGap((d) => (S.country === d.nome ? 0.12 : 0.25))
      .arcDashAnimateTime((d) => (S.country === d.nome ? 1600 : 3200))
      .arcAltitudeAutoScale(0.42);
    globe.htmlElementsData([...agg.values()].filter((a) => centroids.has(a.nome)).map((a) => ({ nome: a.nome, lat: centroids.get(a.nome)[1], lng: centroids.get(a.nome)[0], alt: a.nome === 'Italia' ? 0.02 : 0.03 + 0.55 * n(a[S.metric]) })));
  }

  function labelEl(d) {
    const e = A.el('div', 'glabel' + (d.nome === 'Italia' ? ' it' : '') + (S.country === d.nome ? ' on' : ''));
    e.append(document.createTextNode(d.nome));
    const a = agg.get(d.nome);
    if (a && d.nome !== 'Italia') e.append(A.el('b', '', metric().fmt(a[S.metric])));
    e.addEventListener('click', () => selectCountry(S.country === d.nome ? null : d.nome));
    return e;
  }

  function initGlobe() {
    const box = document.getElementById('globe-box');
    const el = document.getElementById('globe');
    if (typeof Globe === 'undefined') {
      el.replaceChildren(A.el('p', 'empty-note', 'Il mappamondo non si è caricato. Usa la lista dei paesi a sinistra.'));
      return;
    }
    A.data.mondo.features.forEach((f) => { if (f.properties.nome) centroids.set(f.properties.nome, d3.geoCentroid(f)); });
    globe = new Globe(el, { animateIn: false })
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true).atmosphereColor('#7B93FF').atmosphereAltitude(0.18)
      .showGraticules(true)
      .polygonsData(A.data.mondo.features)
      .polygonsTransitionDuration(500)
      .polygonLabel((f) => {
        const k = f.properties.nome; if (!k || !agg.has(k)) return '';
        const a = agg.get(k);
        const wrap = A.el('div', 'gtip'); wrap.append(A.el('b', '', k), document.createTextNode(`${A.fInt(a.pagine)} pagine · ${metric().label}: ${metric().fmt(a[S.metric])}`));
        return wrap;
      })
      .onPolygonHover((f) => { el.style.cursor = f && f.properties.nome && agg.has(f.properties.nome) ? 'pointer' : 'crosshair'; })
      .onPolygonClick((f) => { const k = f.properties.nome; if (k && agg.has(k)) selectCountry(S.country === k ? null : k); })
      .arcStartLat('startLat').arcStartLng('startLng').arcEndLat('endLat').arcEndLng('endLng')
      .ringsData([ITALIA]).ringLat('lat').ringLng('lng')
      .ringColor(() => (t) => `rgba(123,147,255,${1 - t})`).ringMaxRadius(5).ringPropagationSpeed(2.4).ringRepeatPeriod(1100)
      .htmlLat('lat').htmlLng('lng').htmlAltitude('alt').htmlElement(labelEl);
    const mat = globe.globeMaterial();
    mat.color && mat.color.set('#10141A');
    if (mat.emissive) mat.emissive.set('#07090C');
    if ('shininess' in mat) mat.shininess = 4;
    const c = globe.controls();
    c.enableZoom = false; c.enableRotate = false; c.enablePan = false; c.autoRotate = false;
    const size = () => { globe.width(box.clientWidth).height(box.clientHeight); };
    size();
    new ResizeObserver(size).observe(box);
    polyStyle();
    globe.pointOfView({ lat: view.cur.lat, lng: view.cur.lng, altitude: view.cur.alt }, 0);

    box.style.touchAction = 'pan-y';
    const hint = document.getElementById('globe-hint');
    if (window.matchMedia('(pointer: coarse)').matches) hint.textContent = 'Trascina in orizzontale per ruotare';
    // Mouse: the globe follows the cursor. Touch: the surface follows the finger, like dragging a real globe.
    let drag = null;
    box.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      drag = { x: e.clientX, y: e.clientY };
      pointer.on = false;
    });
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      if (e.pointerType === 'mouse') {
        pointer = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5, on: true };
      } else if (drag) {
        const k = 140 * (view.base.alt / 2.15);
        view.base.lng -= ((e.clientX - drag.x) / r.width) * k;
        view.base.lat = Math.max(-55, Math.min(70, view.base.lat + ((e.clientY - drag.y) / r.height) * k * 0.6));
        drag = { x: e.clientX, y: e.clientY };
      }
      hint.hidden = true;
    });
    const endDrag = () => { drag = null; };
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);
    box.addEventListener('pointerleave', () => { pointer.on = false; drag = null; });
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) { globe.resumeAnimation(); loop(); } else globe.pauseAnimation();
    }, { threshold: 0.05 }).observe(box);
    document.getElementById('gz-in').addEventListener('click', () => { view.base.alt = Math.max(1.1, view.base.alt * 0.8); });
    document.getElementById('gz-out').addEventListener('click', () => { view.base.alt = Math.min(3.6, view.base.alt * 1.25); });
    document.getElementById('gz-reset').addEventListener('click', () => { selectCountry(null); view.base = { lat: 26, lng: 46, alt: 2.15 }; });
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = null;
  function loop() {
    if (raf || !globe) return;
    const step = () => {
      raf = null;
      if (!visible) return;
      const t = view.target; const b = view.base;
      t.lng = b.lng + (pointer.on ? pointer.x * 80 : 0);
      t.lat = Math.max(-55, Math.min(70, b.lat - (pointer.on ? pointer.y * 46 : 0)));
      t.alt = b.alt;
      const k = reduce ? 1 : 0.07;
      const c = view.cur;
      let dl = t.lng - c.lng; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
      const moved = Math.abs(dl) + Math.abs(t.lat - c.lat) + Math.abs(t.alt - c.alt) > 0.01;
      if (moved) {
        c.lng += dl * k; c.lat += (t.lat - c.lat) * k; c.alt += (t.alt - c.alt) * k;
        globe.pointOfView({ lat: c.lat, lng: c.lng, altitude: c.alt }, 0);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function selectCountry(k) {
    S.country = k; S.page = null;
    if (k && centroids.has(k) && k !== 'Italia') {
      const c = centroids.get(k);
      const mid = d3.geoInterpolate(c, [ITALIA.lng, ITALIA.lat])(0.5);
      const dist = d3.geoDistance(c, [ITALIA.lng, ITALIA.lat]);
      view.base = { lat: mid[1], lng: mid[0], alt: Math.min(3.4, 1.35 + dist * 0.85) };
    } else if (k === 'Italia') {
      view.base = { lat: ITALIA.lat, lng: ITALIA.lng, alt: 1.5 };
    } else if (!k) {
      view.base = { lat: 26, lng: 46, alt: 2.15 };
    }
    refresh();
  }
  function selectPage(r) {
    S.page = r;
    if (!S.country) { const p = A.P.get(r); S.country = p.paesi[0] || NASCOSTA; }
    card();
  }
  A.selectPageOnGlobe = (r) => { const p = A.P.get(r); selectCountry(p.paesi[0] || NASCOSTA); selectPage(r); };

  function refresh() { rail(); card(); polyStyle(); }

  A.on('ready', () => { aggregate(); initGlobe(); refresh(); });
})();
