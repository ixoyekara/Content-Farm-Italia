(() => {
  const A = window.APP;
  const TIPI = { 'Stessa immagine': '#FF2FA6', 'Variante generata': '#B48CFF', 'Stesso testo': '#F1D06B' };
  const PESO = { 'Stessa immagine': 3, 'Variante generata': 2, 'Stesso testo': 1 };
  const F = { rete: null, pair: null, page: null };
  let tra = [];

  function legend() {
    document.getElementById('net-legend').replaceChildren(...Object.entries(TIPI).map(([k, c]) => {
      const s = A.el('span'); const i = A.el('i'); i.style.background = c; s.append(i, document.createTextNode(k)); return s;
    }));
  }

  function list() {
    document.getElementById('reti-n').textContent = `${A.data.reti.length} reti · ${d3.sum(A.data.reti, (r) => r.n_pagine)} pagine`;
    document.getElementById('reti-list').replaceChildren(...A.data.reti.map((r) => {
      const b = A.el('button', 'rete'); b.type = 'button'; b.setAttribute('aria-pressed', String(F.rete === r.rete));
      const top = A.el('div', 'rete-top'); top.append(A.el('b', '', r.rete), A.el('small', '', `${A.fInt(r.follower)} follower`));
      const faces = A.el('div', 'faces'); r.pagine.forEach((x) => faces.append(A.avatar(A.P.get(x))));
      const ll = tra.filter((l) => r.pagine.includes(l.riga_a));
      const img = ll.filter((l) => l.tipo !== 'Stesso testo').length; const txt = ll.length - img;
      b.append(top, faces,
        A.el('small', '', r.pagine.map((x) => A.P.get(x).nome).join(' · ')),
        A.el('small', '', `Paesi dichiarati: ${r.paesi.join(', ')}`),
        A.el('small', '', `${A.fInt(img)} immagini in comune · ${A.fInt(txt)} testi identici`));
      b.addEventListener('click', () => { F.rete = F.rete === r.rete ? null : r.rete; F.pair = null; F.page = null; draw(); proofs(); list(); });
      return b;
    }));
  }

  function graphData() {
    const ed = d3.rollups(tra, (v) => ({ n: v.length, tipi: d3.rollup(v, (x) => x.length, (x) => x.tipo), top: d3.greatest(v, (x) => PESO[x.tipo]).tipo }), (l) => `${l.riga_a}|${l.riga_b}`)
      .map(([k, o]) => { const [s, t] = k.split('|'); return { id: k, source: s, target: t, ...o }; });
    const ids = [...new Set(ed.flatMap((e) => [e.source, e.target]))];
    const reteOf = new Map(); A.data.reti.forEach((r) => r.pagine.forEach((p) => reteOf.set(p, r.rete)));
    const nodes = ids.map((id) => ({ id, p: A.P.get(id), rete: reteOf.get(id) }));
    return { nodes, ed };
  }

  function draw() {
    const box = document.getElementById('net-graph');
    const w = Math.max(320, box.clientWidth);
    const H = w < 640 ? 560 : 680;
    box.style.minHeight = H + 'px';
    const { nodes, ed } = graphData();
    const reti = A.data.reti.map((r) => r.rete);
    const cols = w < 640 ? 1 : 2; const rows = Math.ceil(reti.length / cols);
    const anchor = new Map(reti.map((r, i) => [r, [(w / cols) * ((i % cols) + 0.5), 40 + ((H - 60) / rows) * (Math.floor(i / cols) + 0.5)]]));
    const rad = d3.scaleSqrt().domain([0, d3.max(nodes, (n) => n.p.follower) || 1]).range([14, w < 640 ? 26 : 34]);
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(ed).id((d) => d.id).distance((e) => 110 + (w < 640 ? -30 : 0)).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-420))
      .force('collide', d3.forceCollide((d) => rad(d.p.follower) + 30))
      .force('x', d3.forceX((d) => anchor.get(d.rete)[0]).strength(0.22))
      .force('y', d3.forceY((d) => anchor.get(d.rete)[1]).strength(0.22))
      .stop();
    for (let i = 0; i < 500; i += 1) sim.tick();
    nodes.forEach((n) => { const r = rad(n.p.follower) + 40; n.x = Math.max(r, Math.min(w - r, n.x)); n.y = Math.max(r + 30, Math.min(H - r, n.y)); });

    const svg = d3.select(box).selectAll('svg').data([0]).join('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${w} ${H}`);
    svg.selectAll('*').remove();
    const defs = svg.append('defs');
    nodes.forEach((n) => { defs.append('clipPath').attr('id', 'cp-' + n.id).append('circle').attr('r', rad(n.p.follower)); });

    const active = (n) => (!F.rete || n.rete === F.rete) && (!F.page || n.id === F.page || ed.some((e) => (e.source.id === F.page && e.target.id === n.id) || (e.target.id === F.page && e.source.id === n.id)));
    const edgeOn = (e) => (!F.rete || e.source.rete === F.rete) && (!F.page || e.source.id === F.page || e.target.id === F.page) && (!F.pair || e.id === F.pair);

    // rete halos
    const hal = svg.append('g');
    d3.groups(nodes, (n) => n.rete).forEach(([r, v]) => {
      const cx = d3.mean(v, (n) => n.x); const cy = d3.mean(v, (n) => n.y);
      const R = d3.max(v, (n) => Math.hypot(n.x - cx, n.y - cy) + rad(n.p.follower)) + 34;
      const g = hal.append('g').attr('opacity', !F.rete || F.rete === r ? 1 : 0.25);
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'rgba(255,47,166,0.025)').attr('stroke', '#343A43').attr('stroke-dasharray', '3 5');
      g.append('text').attr('x', cx).attr('y', cy - R - 8).attr('text-anchor', 'middle').attr('fill', '#7E858E').style('font-size', '11px').style('letter-spacing', '.12em').text(r.toUpperCase());
    });

    const eg = svg.append('g').selectAll('g').data(ed).join('g').style('cursor', 'pointer')
      .attr('opacity', (e) => (edgeOn(e) ? 1 : 0.12))
      .on('mousemove', (ev, e) => A.tip(ev, `${e.source.p.nome} ↔ ${e.target.p.nome}`, [...[...e.tipi].map(([t, n]) => `${t}: ${A.fInt(n)}`), 'Clicca per le prove']))
      .on('mouseleave', A.untip)
      .on('click', (ev, e) => { F.pair = F.pair === e.id ? null : e.id; F.page = null; draw(); proofs(); });
    eg.append('line').attr('x1', (e) => e.source.x).attr('y1', (e) => e.source.y).attr('x2', (e) => e.target.x).attr('y2', (e) => e.target.y)
      .attr('stroke', (e) => TIPI[e.top]).attr('stroke-width', (e) => 2 + Math.sqrt(e.n) * 1.7).attr('stroke-opacity', 0.85).attr('stroke-linecap', 'round');
    eg.append('line').attr('x1', (e) => e.source.x).attr('y1', (e) => e.source.y).attr('x2', (e) => e.target.x).attr('y2', (e) => e.target.y)
      .attr('stroke', 'transparent').attr('stroke-width', 18);
    eg.filter((e) => e.n > 1).append('text').attr('x', (e) => (e.source.x + e.target.x) / 2).attr('y', (e) => (e.source.y + e.target.y) / 2).attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('fill', '#E9E7E4').style('font-size', '11px').style('font-weight', 700).style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 4)
      .text((e) => '×' + e.n);

    const ng = svg.append('g').selectAll('g').data(nodes).join('g').attr('transform', (n) => `translate(${n.x},${n.y})`).style('cursor', 'pointer')
      .attr('opacity', (n) => (active(n) ? 1 : 0.2))
      .on('mousemove', (ev, n) => A.tip(ev, n.p.nome, [`${n.p.paesi_admin}`, `${A.fInt(n.p.follower)} follower · ${n.rete}`, 'Clicca per le sue prove']))
      .on('mouseleave', A.untip)
      .on('click', (ev, n) => { F.page = F.page === n.id ? null : n.id; F.pair = null; draw(); proofs(); });
    ng.append('circle').attr('r', (n) => rad(n.p.follower) + 4).attr('fill', '#0B0D10').attr('stroke', (n) => A.colorOf(n.p.paese_principale)).attr('stroke-width', (n) => (F.page === n.id ? 4 : 2.5));
    ng.each(function (n) {
      const g = d3.select(this); const r = rad(n.p.follower);
      if (n.p.foto) g.append('image').attr('href', n.p.foto).attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2).attr('clip-path', `url(#cp-${n.id})`).attr('preserveAspectRatio', 'xMidYMid slice');
      else g.append('circle').attr('r', r).attr('fill', '#1D222A');
    });
    ng.append('text').attr('y', (n) => rad(n.p.follower) + 18).attr('text-anchor', 'middle').attr('fill', '#E9E7E4').style('font-size', '11.5px').style('font-weight', 600)
      .style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 4).text((n) => n.p.nome);
    ng.append('text').attr('y', (n) => rad(n.p.follower) + 31).attr('text-anchor', 'middle').attr('fill', (n) => A.colorOf(n.p.paese_principale)).style('font-size', '9.5px').style('letter-spacing', '.1em')
      .style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 3).text((n) => (n.p.paesi.length ? n.p.paesi.join(' · ') : 'non dichiarato').toUpperCase());
  }

  function proofs() {
    const box = document.getElementById('proofs');
    const reteOf = new Map(); A.data.reti.forEach((r) => r.pagine.forEach((p) => reteOf.set(p, r.rete)));
    let ll = tra.filter((l) => (!F.rete || reteOf.get(l.riga_a) === F.rete)
      && (!F.pair || `${l.riga_a}|${l.riga_b}` === F.pair)
      && (!F.page || l.riga_a === F.page || l.riga_b === F.page));
    const txtSeen = new Map();
    const shownL = [];
    ll.sort((a, b) => PESO[b.tipo] - PESO[a.tipo]).forEach((l) => {
      if (l.tipo !== 'Stesso testo') { shownL.push(l); return; }
      const k = `${l.riga_a}|${l.riga_b}`; const n = txtSeen.get(k) || 0; txtSeen.set(k, n + 1);
      if (n < 2) shownL.push(l);
    });
    const title = document.getElementById('proofs-title');
    const all = document.getElementById('proofs-all');
    if (F.pair) { const [a, b] = F.pair.split('|'); title.textContent = `Le prove · ${A.P.get(a).nome} e ${A.P.get(b).nome}`; }
    else if (F.page) title.textContent = `Le prove · ${A.P.get(F.page).nome}`;
    else if (F.rete) title.textContent = `Le prove · ${F.rete}`;
    else title.textContent = 'Le prove';
    all.hidden = !(F.pair || F.page || F.rete);
    const pm = new Map(A.data.post.map((p) => [p.post_id, p]));
    const extraTxt = ll.filter((l) => l.tipo === 'Stesso testo').length - shownL.filter((l) => l.tipo === 'Stesso testo').length;
    box.replaceChildren(...shownL.map((l) => {
      const c = A.el('article', 'proof');
      const h = A.el('div', 'proof-h'); const t = A.el('b', '', l.tipo); t.style.color = TIPI[l.tipo];
      h.append(t, A.el('span', '', reteOf.get(l.riga_a) || ''));
      const pics = A.el('div', 'proof-pics');
      [[l.riga_a, l.post_a, l.immagine_a, l.data_a], [l.riga_b, l.post_b, l.immagine_b, l.data_b]].forEach(([r, pid, img, dt]) => {
        const pg = A.P.get(r); const p = pm.get(pid);
        const a = A.el('a', 'proof-pic'); a.href = p ? p.url : pg.link; a.target = '_blank'; a.rel = 'noopener';
        const src = A.img(img, true);
        if (src) { const im = A.el('img'); im.src = src; im.alt = p?.descrizione_immagine || ''; im.loading = 'lazy'; a.append(im); } else a.append(A.el('div', 'noimg', 'solo testo'));
        const cap = A.el('div', 'proof-cap'); cap.append(A.avatar(pg), A.el('span', '', pg.nome), A.el('small', '', `${pg.paesi.length ? pg.paesi.join(' · ') : 'non dichiarato'} · ${A.fD(dt)}`));
        a.append(cap); pics.append(a);
      });
      c.append(h, pics);
      if (l.tipo === 'Stesso testo') { const p = pm.get(l.post_a); if (p && p.testo) c.append(A.el('q', '', p.testo.slice(0, 160) + (p.testo.length > 160 ? '…' : ''))); }
      return c;
    }));
    if (extraTxt > 0) {
      const n = A.el('article', 'proof'); n.append(A.el('div', 'proof-h', `Altri ${A.fInt(extraTxt)} testi identici`), A.el('p', 'empty-note', 'Per ogni coppia di pagine sono mostrati due esempi di testo identico; gli altri seguono lo stesso schema.'));
      box.append(n);
    }
  }

  document.getElementById('proofs-all').addEventListener('click', () => { F.rete = null; F.pair = null; F.page = null; draw(); proofs(); list(); });
  A.on('rete', (r) => { F.rete = r; F.pair = null; F.page = null; draw(); proofs(); list(); });
  A.on('ready', () => {
    tra = A.data.legami.filter((l) => l.riga_a !== l.riga_b && TIPI[l.tipo]);
    legend(); list(); draw(); proofs();
    let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(draw, 150); }).observe(document.getElementById('net-graph'));
  });
})();
