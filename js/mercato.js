(() => {
  const A = window.APP;
  let by = 'ricavo_max';
  let shown = 25;

  function totals() {
    const M = A.data.mercato; const I = M.ipotesi;
    const items = [
      ['Ricavo stimato al mese', `${A.fC(M.ricavo_min)} – ${A.fC(M.ricavo_max)} €`, `${A.fInt(M.idonee)} pagine sopra i ${A.fInt(I.soglia)} follower`, true],
      ['Ricavo stimato all\'anno', `${A.fC(M.ricavo_min * 12)} – ${A.fC(M.ricavo_max * 12)} €`, 'solo monetizzazione dei contenuti Meta', true],
      ['Visualizzazioni stimate al mese', A.fC(M.vis_mese_idonee), 'delle pagine idonee', false],
      ['Reazioni e commenti in tre mesi', A.fC(M.fk_interazioni), M.periodo, false],
    ];
    document.getElementById('m-big').replaceChildren(...items.map(([l, v, s, hot]) => { const d = A.el('div'); d.append(A.el('span', '', l), A.el('b', hot ? 'hot' : '', v), A.el('small', '', s)); return d; }));
    const steps = [
      ['Interazioni', `reazioni e commenti di ogni pagina nei ${I.giorni} giorni di Fanpage Karma, riportati a un mese`],
      ['Visualizzazioni', `× ${A.f1(I.ratio)}, le visualizzazioni per ogni reazione o commento osservate nei 458 video estratti`],
      ['Prezzo della pubblicità', `${String(I.cpm).replace('.', ',')} dollari ogni mille impressioni in Italia (Lebesgue, 2026), di cui il ${A.fP(I.quota)} al creator`],
      ['Visualizzazioni pagate', `dal ${A.fP(I.fill_min)} (minimo) al ${A.fP(I.fill_max)} (massimo) mostrano una pubblicità; foto e testi valgono la metà dei video`],
      ['Soglia', `solo le pagine con almeno ${A.fInt(I.soglia)} follower possono accedere al programma; cambio a ${String(I.cambio).replace('.', ',')}`],
    ];
    document.getElementById('m-steps').replaceChildren(...steps.map(([a, b], i) => {
      const d = A.el('div', 'mstep'); d.append(A.el('em', '', String(i + 1).padStart(2, '0')), A.el('b', '', a), A.el('span', '', b)); return d;
    }));
  }

  function ranking() {
    const box = document.getElementById('m-rank');
    const rows = A.data.pagine.filter((p) => p.idonea).sort((a, b) => b[by] - a[by]);
    const max = d3.max(rows, (p) => p.ricavo_max) || 1;
    document.getElementById('m-rank-n').textContent = `${A.fInt(rows.length)} pagine idonee`;
    box.replaceChildren(...rows.slice(0, shown).map((p, i) => {
      const b = A.el('button', 'mrow'); b.type = 'button';
      const who = A.el('div', 'mrow-who');
      const t = A.el('div'); t.append(A.el('strong', '', p.nome), A.el('small', '', `${p.paesi_admin} · ${A.fInt(p.follower)} follower`));
      who.append(A.el('em', '', String(i + 1)), A.avatar(p), t);
      const bar = A.el('div', 'mrow-bar');
      const rng = A.el('div', 'mrow-range');
      rng.style.left = (p.ricavo_min / max * 100) + '%';
      rng.style.width = Math.max(0.6, (p.ricavo_max - p.ricavo_min) / max * 100) + '%';
      rng.style.background = `linear-gradient(90deg, ${A.colorOf(p.paese_principale)}55, ${A.colorOf(p.paese_principale)})`;
      bar.append(rng);
      const v = A.el('div', 'mrow-val', `${A.fInt(p.ricavo_min)} – ${A.fInt(p.ricavo_max)} €`);
      b.append(who, bar, v);
      b.addEventListener('click', () => { A.selectPageOnGlobe && A.selectPageOnGlobe(p.riga); document.getElementById('localizzazione').scrollIntoView({ behavior: 'smooth' }); });
      b.addEventListener('mousemove', (ev) => A.tip(ev, p.nome, [`${A.fC(p.vis_mese)} visualizzazioni stimate al mese${p.vis_origine === 'follower' ? ' (dai follower)' : ''}`, `${A.fInt(p.ricavo_min * 12)} – ${A.fInt(p.ricavo_max * 12)} € all'anno`, 'Clicca per la scheda']));
      b.addEventListener('mouseleave', A.untip);
      return b;
    }));
    const more = document.getElementById('m-more');
    more.hidden = rows.length <= shown;
    more.textContent = `Mostra altre ${A.fInt(Math.min(25, rows.length - shown))}`;
  }

  function byCountry() {
    const agg = new Map();
    A.data.pagine.forEach((p) => {
      const k = p.paese_principale;
      if (!agg.has(k)) agg.set(k, { min: 0, max: 0, n: 0 });
      const a = agg.get(k); a.min += p.ricavo_min; a.max += p.ricavo_max; if (p.idonea) a.n += 1;
    });
    const rows = [...agg.entries()].filter(([, a]) => a.max > 0).sort((a, b) => b[1].max - a[1].max);
    const tot = d3.sum(rows, ([, a]) => a.max) || 1; const max = d3.max(rows, ([, a]) => a.max) || 1;
    document.getElementById('m-country').replaceChildren(...rows.map(([k, a]) => {
      const b = A.el('div', 'hbar static');
      const s = A.el('strong'); s.append(A.sw(A.colorOf(k)), A.el('span', '', k));
      const tr = A.el('div', 'track'); const f = A.el('div', 'fill'); f.style.width = (a.max / max * 100) + '%'; f.style.background = A.colorOf(k); tr.append(f);
      b.append(s, A.el('em', '', `${A.fP(a.max / tot)} · ${A.fC(a.min)} – ${A.fC(a.max)} € al mese · ${a.n} pagine`), tr);
      return b;
    }));
  }

  document.querySelectorAll('[data-mby]').forEach((b) => b.addEventListener('click', () => {
    by = b.dataset.mby; shown = 25;
    document.querySelectorAll('[data-mby]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    ranking();
  }));
  document.getElementById('m-more').addEventListener('click', () => { shown += 25; ranking(); });
  A.on('ready', () => { totals(); ranking(); byCountry(); });
})();
