(() => {
  const A = window.APP;
  const TIPI = { 'Stessa immagine': '#FF2FA6', 'Variante generata': '#B48CFF', 'Stesso testo': '#F1D06B', 'Gruppo amministrato': '#57D6C9' };
  const PESO = { 'Stessa immagine': 3, 'Variante generata': 2, 'Stesso testo': 1 };
  const F = { rete: null, pair: null, page: null };
  let tra = [];

  function legend() {
    document.getElementById('net-legend').replaceChildren(...Object.entries(TIPI).map(([k, c]) => {
      const s = A.el('span'); const i = A.el('i'); i.style.background = c; s.append(i, document.createTextNode(k)); return s;
    }));
  }

  const reteOf = () => { const m = new Map(); A.data.reti.forEach((r) => r.pagine.forEach((p) => m.set(p, r.rete))); return m; };
  const groupsOfRete = (r) => A.data.gruppi.filter((g) => g.pagine.some((p) => r.pagine.includes(p)));

  function list() {
    document.getElementById('reti-n').textContent = `${A.data.reti.length} reti · ${d3.sum(A.data.reti, (r) => r.n_pagine)} pagine`;
    document.getElementById('reti-list').replaceChildren(...A.data.reti.map((r) => {
      const b = A.el('button', 'rete'); b.type = 'button'; b.setAttribute('aria-pressed', String(F.rete === r.rete));
      const top = A.el('div', 'rete-top'); top.append(A.el('b', '', r.rete), A.el('small', '', `${A.fInt(r.follower)} follower`));
      const faces = A.el('div', 'faces'); r.pagine.forEach((x) => faces.append(A.avatar(A.P.get(x))));
      const gs = groupsOfRete(r);
      const prove = [];
      if (r.immagini) prove.push(`${A.fInt(r.immagini)} ${r.immagini === 1 ? 'immagine' : 'immagini'} in comune`);
      if (r.testi) prove.push(`${A.fInt(r.testi)} ${r.testi === 1 ? 'testo identico' : 'testi identici'}`);
      if (r.gruppi_condivisi.length) prove.push(`${r.gruppi_condivisi.length} ${r.gruppi_condivisi.length === 1 ? 'gruppo amministrato insieme' : 'gruppi amministrati insieme'}`);
      b.append(top, faces,
        A.el('small', '', r.pagine.map((x) => A.P.get(x).nome).join(' · ')),
        A.el('small', '', `Paesi dichiarati: ${r.paesi.join(', ')}`),
        A.el('small', '', prove.join(' · ')),
        A.el('small', '', `${gs.length ? `${A.fC(d3.sum(gs, (g) => g.membri))} membri nei gruppi · ` : ''}ricavo stimato ${A.fC(r.ricavo_min)} – ${A.fC(r.ricavo_max)} € al mese`));
      b.addEventListener('click', () => { F.rete = F.rete === r.rete ? null : r.rete; F.pair = null; F.page = null; draw(); proofs(); list(); });
      return b;
    }));
  }

  function graphData() {
    const ed = d3.rollups(tra, (v) => ({ n: v.length, tipi: d3.rollup(v, (x) => x.length, (x) => x.tipo), top: d3.greatest(v, (x) => PESO[x.tipo]).tipo }), (l) => `${l.riga_a}|${l.riga_b}`)
      .map(([k, o]) => { const [s, t] = k.split('|'); return { id: k, source: s, target: t, kind: 'p', ...o }; });
    const ro = reteOf();
    const pageIds = [...ro.keys()];
    const nodes = pageIds.map((id) => ({ id, kind: 'p', p: A.P.get(id), rete: ro.get(id) }));
    A.data.reti.forEach((r) => groupsOfRete(r).forEach((g) => {
      if (nodes.some((n) => n.id === g.id)) return;
      nodes.push({ id: g.id, kind: 'g', g, rete: r.rete });
      g.pagine.filter((p) => ro.get(p) === r.rete).forEach((p) => ed.push({ id: `${g.id}|${p}`, source: g.id, target: p, kind: 'g', n: 1, top: 'Gruppo amministrato', tipi: new Map([['Gruppo amministrato', 1]]) }));
    }));
    return { nodes, ed };
  }

  function draw() {
    const box = document.getElementById('net-graph');
    const w = Math.max(320, box.clientWidth);
    const { nodes, ed } = graphData();
    const reti = A.data.reti.map((r) => r.rete);
    const cols = w < 640 ? 1 : (w < 1000 ? 2 : 3); const rows = Math.ceil(reti.length / cols);
    const cellH = w < 640 ? 300 : 280;
    const H = 50 + rows * cellH;
    box.style.minHeight = H + 'px';
    const anchor = new Map(reti.map((r, i) => [r, [(w / cols) * ((i % cols) + 0.5), 40 + cellH * (Math.floor(i / cols) + 0.5)]]));
    const maxF = d3.max(nodes.filter((n) => n.kind === 'p'), (n) => n.p.follower) || 1;
    const maxM = d3.max(nodes.filter((n) => n.kind === 'g'), (n) => n.g.membri) || 1;
    const rp = d3.scaleSqrt().domain([0, maxF]).range([13, w < 640 ? 24 : 30]);
    const rg = d3.scaleSqrt().domain([0, maxM]).range([8, 22]);
    const rad = (n) => (n.kind === 'p' ? rp(n.p.follower) : rg(n.g.membri));
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(ed).id((d) => d.id).distance((e) => (e.kind === 'g' ? 70 : 105)).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-360))
      .force('collide', d3.forceCollide((d) => rad(d) + 26))
      .force('x', d3.forceX((d) => anchor.get(d.rete)[0]).strength(0.3))
      .force('y', d3.forceY((d) => anchor.get(d.rete)[1]).strength(0.3))
      .stop();
    for (let i = 0; i < 500; i += 1) sim.tick();
    nodes.forEach((n) => { const r = rad(n) + 40; n.x = Math.max(r, Math.min(w - r, n.x)); n.y = Math.max(r + 24, Math.min(H - r - 10, n.y)); });

    const svg = d3.select(box).selectAll('svg').data([0]).join('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${w} ${H}`);
    svg.selectAll('*').remove();
    const defs = svg.append('defs');
    nodes.filter((n) => n.kind === 'p').forEach((n) => { defs.append('clipPath').attr('id', 'cp-' + n.id).append('circle').attr('r', rad(n)); });

    const nb = (id) => ed.filter((e) => e.source.id === id || e.target.id === id).flatMap((e) => [e.source.id, e.target.id]);
    const active = (n) => (!F.rete || n.rete === F.rete) && (!F.page || n.id === F.page || nb(F.page).includes(n.id));
    const edgeOn = (e) => (!F.rete || e.source.rete === F.rete) && (!F.page || e.source.id === F.page || e.target.id === F.page) && (!F.pair || e.id === F.pair);

    const hal = svg.append('g');
    d3.groups(nodes, (n) => n.rete).forEach(([r, v]) => {
      const cx = d3.mean(v, (n) => n.x); const cy = d3.mean(v, (n) => n.y);
      const R = d3.max(v, (n) => Math.hypot(n.x - cx, n.y - cy) + rad(n)) + 30;
      const g = hal.append('g').attr('opacity', !F.rete || F.rete === r ? 1 : 0.25);
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'rgba(255,47,166,0.025)').attr('stroke', '#343A43').attr('stroke-dasharray', '3 5');
      g.append('text').attr('x', cx).attr('y', Math.max(14, cy - R - 8)).attr('text-anchor', 'middle').attr('fill', '#7E858E').style('font-size', '11px').style('letter-spacing', '.12em').text(r.toUpperCase());
    });

    const eg = svg.append('g').selectAll('g').data(ed).join('g').style('cursor', 'pointer')
      .attr('opacity', (e) => (edgeOn(e) ? 1 : 0.12))
      .on('mousemove', (ev, e) => {
        const a = e.source.kind === 'g' ? e.source.g.nome : e.source.p.nome; const b = e.target.p ? e.target.p.nome : e.target.g.nome;
        A.tip(ev, e.kind === 'g' ? `${b} amministra ${a}` : `${a} ↔ ${b}`, e.kind === 'g' ? [`${A.fInt(e.source.g.membri)} membri`] : [...[...e.tipi].map(([t, n]) => `${t}: ${A.fInt(n)}`), 'Clicca per le prove']);
      })
      .on('mouseleave', A.untip)
      .on('click', (ev, e) => { if (e.kind === 'g') return; F.pair = F.pair === e.id ? null : e.id; F.page = null; draw(); proofs(); });
    eg.append('line').attr('x1', (e) => e.source.x).attr('y1', (e) => e.source.y).attr('x2', (e) => e.target.x).attr('y2', (e) => e.target.y)
      .attr('stroke', (e) => TIPI[e.top]).attr('stroke-width', (e) => (e.kind === 'g' ? 1.6 : 2 + Math.sqrt(e.n) * 1.7)).attr('stroke-opacity', 0.85).attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (e) => (e.kind === 'g' ? '4 4' : null));
    eg.append('line').attr('x1', (e) => e.source.x).attr('y1', (e) => e.source.y).attr('x2', (e) => e.target.x).attr('y2', (e) => e.target.y).attr('stroke', 'transparent').attr('stroke-width', 18);
    eg.filter((e) => e.n > 1).append('text').attr('x', (e) => (e.source.x + e.target.x) / 2).attr('y', (e) => (e.source.y + e.target.y) / 2).attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('fill', '#E9E7E4').style('font-size', '11px').style('font-weight', 700).style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 4).text((e) => '×' + e.n);

    const ng = svg.append('g').selectAll('g').data(nodes).join('g').attr('transform', (n) => `translate(${n.x},${n.y})`).style('cursor', 'pointer')
      .attr('opacity', (n) => (active(n) ? 1 : 0.2))
      .on('mousemove', (ev, n) => (n.kind === 'p'
        ? A.tip(ev, n.p.nome, [n.p.paesi_admin, `${A.fInt(n.p.follower)} follower · ${n.rete}`, 'Clicca per le sue prove'])
        : A.tip(ev, n.g.nome, ['Gruppo Facebook', `${A.fInt(n.g.membri)} membri`, n.g.esterni ? `più ${n.g.esterni} amministratori fuori dall'elenco` : 'amministrato da pagine dell\'elenco'])))
      .on('mouseleave', A.untip)
      
      .on('click', (ev, n) => { if (n.kind === 'g') return; F.page = F.page === n.id ? null : n.id; F.pair = null; draw(); proofs(); });
    ng.each(function (n) {
      const g = d3.select(this); const r = rad(n);
      if (n.kind === 'g') {
        g.append('rect').attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2).attr('fill', '#12151A').attr('stroke', TIPI['Gruppo amministrato']).attr('stroke-width', 2);
        g.append('text').attr('text-anchor', 'middle').attr('dy', '.35em').attr('fill', TIPI['Gruppo amministrato']).style('font-size', Math.max(8, r * 0.55) + 'px').style('font-weight', 700).text('G');
        g.append('text').attr('y', r + 14).attr('text-anchor', 'middle').attr('fill', '#B9BCC1').style('font-size', '10px').style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 3)
          .text(`${n.g.nome.replace(/[^\p{L}\p{N}' ]/gu, '').trim().slice(0, 26)} · ${A.fC(n.g.membri)}`);
        return;
      }
      g.append('circle').attr('r', r + 4).attr('fill', '#0B0D10').attr('stroke', A.colorOf(n.p.paese_principale)).attr('stroke-width', F.page === n.id ? 4 : 2.5);
      if (n.p.foto) g.append('image').attr('href', n.p.foto).attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2).attr('clip-path', `url(#cp-${n.id})`).attr('preserveAspectRatio', 'xMidYMid slice');
      else g.append('circle').attr('r', r).attr('fill', '#1D222A');
      g.append('text').attr('y', r + 18).attr('text-anchor', 'middle').attr('fill', '#E9E7E4').style('font-size', '11.5px').style('font-weight', 600)
        .style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 4).text(n.p.nome.length > 30 ? n.p.nome.slice(0, 29) + '…' : n.p.nome);
      g.append('text').attr('y', r + 31).attr('text-anchor', 'middle').attr('fill', A.colorOf(n.p.paese_principale)).style('font-size', '9.5px').style('letter-spacing', '.1em')
        .style('paint-order', 'stroke').attr('stroke', '#0B0D10').attr('stroke-width', 3).text((n.p.paesi.length ? n.p.paesi.join(' · ') : 'non dichiarato').toUpperCase());
    });
  }

  function groupCard(g) {
    const c = A.el('article', 'proof');
    const h = A.el('div', 'proof-h'); const t = A.el('b', '', 'Gruppo amministrato insieme'); t.style.color = TIPI['Gruppo amministrato'];
    h.append(t, A.el('span', '', reteOf().get(g.pagine[0]) || ''));
    const title = A.el('a', 'proof-group'); title.href = g.link; title.target = '_blank'; title.rel = 'noopener';
    title.append(A.el('b', '', g.nome), A.el('small', '', `${A.fInt(g.membri)} membri${g.esterni ? ` · più ${g.esterni} ${g.esterni === 1 ? 'amministratore' : 'amministratori'} fuori dall'elenco` : ''}`));
    const adm = A.el('div', 'proof-admins');
    g.pagine.forEach((r) => { const pg = A.P.get(r); const d = A.el('div', 'proof-cap'); d.append(A.avatar(pg), A.el('span', '', pg.nome), A.el('small', '', pg.paesi.length ? pg.paesi.join(' · ') : 'non dichiarato')); adm.append(d); });
    c.append(h, title, adm);
    return c;
  }

  function proofs() {
    const box = document.getElementById('proofs');
    const ro = reteOf();
    const ll = tra.filter((l) => (!F.rete || ro.get(l.riga_a) === F.rete)
      && (!F.pair || `${l.riga_a}|${l.riga_b}` === F.pair)
      && (!F.page || l.riga_a === F.page || l.riga_b === F.page));
    const txtSeen = new Map(); const shownL = [];
    [...ll].sort((a, b) => PESO[b.tipo] - PESO[a.tipo]).forEach((l) => {
      if (l.tipo !== 'Stesso testo') { shownL.push(l); return; }
      const k = `${l.riga_a}|${l.riga_b}`; const n = txtSeen.get(k) || 0; txtSeen.set(k, n + 1);
      if (n < 2) shownL.push(l);
    });
    const gs = F.pair ? [] : A.data.gruppi.filter((g) => g.pagine.length >= 2 && (!F.rete || g.pagine.some((p) => ro.get(p) === F.rete)) && (!F.page || g.pagine.includes(F.page)));
    const title = document.getElementById('proofs-title');
    const all = document.getElementById('proofs-all');
    if (F.pair) { const [a, b] = F.pair.split('|'); title.textContent = `Le prove · ${A.P.get(a).nome} e ${A.P.get(b).nome}`; }
    else if (F.page) title.textContent = `Le prove · ${A.P.get(F.page).nome}`;
    else if (F.rete) title.textContent = `Le prove · ${F.rete}`;
    else title.textContent = 'Le prove';
    all.hidden = !(F.pair || F.page || F.rete);
    const pm = new Map(A.data.post.map((p) => [p.post_id, p]));
    const extraTxt = ll.filter((l) => l.tipo === 'Stesso testo').length - shownL.filter((l) => l.tipo === 'Stesso testo').length;
    const cards = shownL.map((l) => {
      const c = A.el('article', 'proof');
      const h = A.el('div', 'proof-h'); const t = A.el('b', '', l.tipo); t.style.color = TIPI[l.tipo];
      h.append(t, A.el('span', '', ro.get(l.riga_a) || ''));
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
    });
    box.replaceChildren(...gs.map(groupCard), ...cards);
    if (extraTxt > 0) {
      const n = A.el('article', 'proof'); n.append(A.el('div', 'proof-h', `Altri ${A.fInt(extraTxt)} testi identici`), A.el('p', 'empty-note', 'Per ogni coppia di pagine sono mostrati due esempi di testo identico; gli altri seguono lo stesso schema.'));
      box.append(n);
    }
  }

  document.getElementById('proofs-all').addEventListener('click', () => { F.rete = null; F.pair = null; F.page = null; draw(); proofs(); list(); });
  A.on('rete', (r) => { F.rete = r; F.pair = null; F.page = null; draw(); proofs(); list(); });
  A.on('ready', () => {
    tra = A.data.legami.filter((l) => l.riga_a !== l.riga_b && PESO[l.tipo]);
    legend(); list(); draw(); proofs();
    let t; let lastW = 0;
    new ResizeObserver(() => { const w = document.getElementById('net-graph').clientWidth; if (Math.abs(w - lastW) < 2) return; lastW = w; clearTimeout(t); t = setTimeout(draw, 150); }).observe(document.getElementById('net-graph'));
  });
})();
