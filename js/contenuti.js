(() => {
  const A = window.APP;
  const TIPI = ['Persone', 'Persone con testo', 'Card con testo', 'Luoghi e oggetti', 'Video', 'Senza descrizione', 'Solo testo'];
  const TIPI_COL = { 'Persone': '#FF2FA6', 'Persone con testo': '#B48CFF', 'Card con testo': '#F1D06B', 'Luoghi e oggetti': '#57D6C9', 'Video': '#7B93FF', 'Senza descrizione': '#4A515B', 'Solo testo': '#7E858E' };
  const REAZ = [['like', 'Mi piace', '#7B93FF'], ['love', 'Love', '#FF2FA6'], ['abbraccio', 'Abbraccio', '#F1D06B'], ['tristezza', 'Tristezza', '#80B9FC'], ['rabbia', 'Rabbia', '#FF5F74'], ['risata', 'Risata', '#57BE83'], ['stupore', 'Stupore', '#B48CFF']];
  let topBy = 'interazioni';
  let shown = 36;
  let sortBy = 'interazioni';
  let lastKey = '';

  const base = () => A.data.post.filter((p) => !A.state.pagina || p.riga === A.state.pagina);
  const withTema = () => base().filter((p) => !A.state.tema || p.tema === A.state.tema);

  function hbar({ name, color, frac, right, pressed, dim, onClick }) {
    const b = A.el(onClick ? 'button' : 'div', 'hbar' + (onClick ? '' : ' static') + (dim ? ' dim' : ''));
    if (onClick) { b.type = 'button'; b.setAttribute('aria-pressed', String(!!pressed)); b.addEventListener('click', onClick); }
    const s = A.el('strong'); s.append(A.sw(color), A.el('span', '', name));
    const tr = A.el('div', 'track'); const f = A.el('div', 'fill'); f.style.width = Math.max(0.5, frac * 100) + '%'; f.style.background = color; tr.append(f);
    b.append(s, A.el('em', '', right), tr);
    return b;
  }

  function focus() {
    const box = document.getElementById('pagefocus');
    const r = A.state.pagina;
    if (!r) { box.replaceChildren(); return; }
    const p = A.P.get(r);
    const card = A.el('div', 'tech pagefocus');
    const t = A.el('div');
    t.append(A.el('h3', '', p.nome), A.el('p', '', `${p.paesi_admin} · ${A.fInt(p.follower)} follower · ${A.fInt(p.n_post)} post analizzati · ${A.fInt(p.interazioni)} interazioni`));
    const x = A.el('button', 'btn', 'Tutte le pagine ×'); x.type = 'button';
    x.addEventListener('click', () => { A.state.pagina = null; A.emit('filtri'); });
    card.append(A.avatar(p), t, x);
    box.replaceChildren(card);
  }

  function temi() {
    const rows = base(); const tot = rows.length || 1;
    const g = d3.rollups(rows, (v) => ({ n: v.length, med: d3.median(v, (p) => p.interazioni) }), (p) => p.tema).sort((a, b) => b[1].n - a[1].n);
    const max = d3.max(g, (d) => d[1].n) || 1;
    document.getElementById('temi-n').textContent = `${A.fInt(rows.length)} post · clicca per filtrare`;
    document.getElementById('temi').replaceChildren(...g.map(([k, o]) => hbar({
      name: k, color: A.TEMI[k] || '#7E858E', frac: o.n / max,
      right: `${A.fP(o.n / tot)} · ${A.fInt(o.n)} post · mediana ${A.fInt(o.med)}`,
      pressed: A.state.tema === k, dim: A.state.tema && A.state.tema !== k,
      onClick: () => { A.state.tema = A.state.tema === k ? null : k; A.emit('filtri'); },
    })));
  }

  function tipi() {
    const rows = withTema(); const tot = rows.length || 1;
    const c = d3.rollup(rows, (v) => v.length, (p) => p.categoria_immagine);
    const g = TIPI.filter((k) => c.get(k)).map((k) => [k, c.get(k)]).sort((a, b) => b[1] - a[1]);
    const max = d3.max(g, (d) => d[1]) || 1;
    document.getElementById('tipi').replaceChildren(...g.map(([k, n]) => hbar({ name: k, color: TIPI_COL[k], frac: n / max, right: `${A.fP(n / tot)} · ${A.fInt(n)}` })));
  }

  function reazioni() {
    const rows = withTema();
    const s = REAZ.map(([k, n, c]) => ({ n, c, v: d3.sum(rows, (p) => p[k] || 0) }));
    const tot = d3.sum(s, (x) => x.v) || 1; const max = d3.max(s, (x) => x.v) || 1;
    document.getElementById('reazioni').replaceChildren(...s.map((x) => hbar({ name: x.n, color: x.c, frac: x.v / max, right: `${A.fP(x.v / tot)} · ${A.fInt(x.v)}` })));
  }

  function topImgs() {
    const rows = withTema().filter((p) => p.immagine).sort((a, b) => b[topBy] - a[topBy]).slice(0, 12);
    document.getElementById('top-note').textContent = A.state.pagina || A.state.tema ? 'con i filtri attivi' : 'su tutte le pagine';
    const box = document.getElementById('topimgs');
    box.replaceChildren(...rows.map((p, i) => {
      const pg = A.P.get(p.riga);
      const a = A.el('a', 'timg'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
      const src = A.img(p.immagine, true);
      if (src) { const im = A.el('img'); im.src = src; im.alt = p.descrizione_immagine || ''; im.loading = 'lazy'; a.append(im); } else a.append(A.el('div', 'noimg', 'immagine'));
      a.append(A.el('span', 'timg-rank', String(i + 1)));
      const b = A.el('div', 'timg-body');
      const who = A.el('div', 'timg-who'); who.append(A.avatar(pg), A.el('span', '', pg.nome));
      const num = A.el('div', 'timg-num', A.fC(p[topBy])); num.append(A.el('small', '', topBy));
      b.append(who, num, A.el('div', 'theme-tag', `${pg.paese_principale} · ${A.fD(p.data)}`));
      a.append(b);
      return a;
    }));
  }

  function selects() {
    const sp = document.getElementById('f-pagina');
    const pages = A.data.pagine.filter((p) => p.n_post).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    sp.replaceChildren(new Option('Tutte le pagine', ''), ...pages.map((p) => new Option(`${p.nome} · ${p.paese_principale}`, p.riga)));
    sp.value = A.state.pagina || '';
    const st = document.getElementById('f-tema');
    st.replaceChildren(new Option('Tutti i temi', ''), ...Object.keys(A.TEMI).map((k) => new Option(k, k)));
    st.value = A.state.tema || '';
  }

  function gallery() {
    const box = document.getElementById('gallery');
    const more = document.getElementById('more');
    const key = `${A.state.pagina}|${A.state.tema}|${sortBy}`;
    if (key !== lastKey) { shown = 36; lastKey = key; }
    const rows = withTema().sort((a, b) => (sortBy === 'recenti' ? d3.descending(a.data, b.data) : (b[sortBy] || 0) - (a[sortBy] || 0)));
    document.getElementById('arch-count').textContent = `${A.fInt(rows.length)} post`;
    if (!A.data.mini) { box.replaceChildren(A.el('div', 'loading', 'Caricamento delle immagini')); more.hidden = true; return; }
    box.replaceChildren(...rows.slice(0, shown).map((p) => {
      const pg = A.P.get(p.riga);
      const a = A.el('a', 'gpost'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
      const pic = A.el('div', 'pic');
      const src = A.img(p.immagine, false);
      if (src) { const im = A.el('img'); im.src = src; im.alt = p.descrizione_immagine || ''; im.loading = 'lazy'; pic.append(im); } else pic.append(A.el('div', 'noimg', p.tipo));
      if (p.tipo === 'video') pic.append(A.el('span', 'tag', 'video'));
      const b = A.el('div', 'body');
      const who = A.el('div', 'who'); const n = A.el('span'); n.append(A.sw(A.colorOf(pg.paese_principale)), document.createTextNode(pg.nome)); who.append(n, A.el('small', '', A.fD(p.data)));
      const tt = A.el('span', 'theme-tag'); tt.append(A.sw(A.TEMI[p.tema] || '#7E858E'), document.createTextNode(p.tema));
      const txt = (p.testo || '').slice(0, 160) + ((p.testo || '').length > 160 ? '…' : '');
      const nums = A.el('div', 'nums');
      [['reazioni', p.reazioni], ['commenti', p.commenti], ['condivisioni', p.condivisioni]].forEach(([l, v]) => { const s = A.el('span'); s.append(A.el('b', '', A.fInt(v)), document.createTextNode(' ' + l)); nums.append(s); });
      if (p.visualizzazioni) { const s = A.el('span'); s.append(A.el('b', '', A.fC(p.visualizzazioni)), document.createTextNode(' visualizzazioni')); nums.append(s); }
      b.append(who, tt, A.el('p', '', txt), nums);
      a.append(pic, b);
      return a;
    }));
    if (!rows.length) box.append(A.el('div', 'empty-note', 'Nessun post con questi filtri.'));
    more.hidden = rows.length <= shown;
    more.textContent = `Mostra altri ${A.fInt(Math.min(36, rows.length - shown))}`;
  }

  function render() { focus(); temi(); tipi(); reazioni(); topImgs(); selects(); gallery(); }

  document.querySelectorAll('.tabs [data-top]').forEach((b) => b.addEventListener('click', () => {
    topBy = b.dataset.top;
    document.querySelectorAll('.tabs [data-top]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    topImgs();
  }));
  document.getElementById('f-pagina').addEventListener('change', (e) => { A.state.pagina = e.target.value || null; A.emit('filtri'); });
  document.getElementById('f-tema').addEventListener('change', (e) => { A.state.tema = e.target.value || null; A.emit('filtri'); });
  document.getElementById('f-ordina').addEventListener('change', (e) => { sortBy = e.target.value; gallery(); });
  document.getElementById('f-reset').addEventListener('click', () => { A.state.pagina = null; A.state.tema = null; A.emit('filtri'); });
  document.getElementById('more').addEventListener('click', () => { shown += 36; gallery(); });

  A.on('ready', () => {
    render();
    new IntersectionObserver((es, obs) => {
      if (es[0].isIntersecting) { obs.disconnect(); A.loadMini().then(() => { topImgs(); gallery(); A.emit('mini'); }); }
    }, { rootMargin: '900px 0px' }).observe(document.getElementById('contenuti'));
  });
  A.on('filtri', () => { if (A.data.post) render(); });
})();
