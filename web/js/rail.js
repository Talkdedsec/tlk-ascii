/* The looks gallery on the left: search, categories, favourites and saved
   presets, every tile a live render of the loaded picture. */
(function (GF) {
  'use strict';

  const { el } = GF.UI;
  const t = (k, v) => GF.i18n.t(k, v);
  const nm = (o) => GF.i18n.name(o);
  const FAV_KEY = 'tlk-ascii.favs';
  const PRESET_KEY = 'tlk-ascii.presets';

  let ctx = null;
  let filter = 'all';
  let query = '';
  let tiles = [];
  let timer = 0;
  let token = 0;
  let dirty = true;
  let grid = null;

  const store = {
    read(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem(key) || 'null');
        return v == null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    write(key, v) {
      try {
        localStorage.setItem(key, JSON.stringify(v));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  const favs = () => new Set(store.read(FAV_KEY, []));
  const presets = () => {
    const v = store.read(PRESET_KEY, []);
    return Array.isArray(v) ? v : [];
  };

  function toggleFav(id) {
    const f = favs();
    if (f.has(id)) f.delete(id);
    else f.add(id);
    store.write(FAV_KEY, [...f]);
    renderGrid();
  }

  function items() {
    const f = favs();
    const q = query.trim().toLocaleLowerCase(GF.i18n.lang);
    if (filter === 'saved') {
      return presets().map((p, i) => ({ kind: 'preset', id: 'p' + i, index: i, name: p.name, settings: p.settings }))
        .filter((x) => !q || x.name.toLocaleLowerCase().includes(q));
    }
    return GF.LOOKS.filter((l) => {
      if (filter === 'fav' && !f.has(l.id)) return false;
      if (filter !== 'all' && filter !== 'fav' && l.tag !== filter) return false;
      if (!q) return true;
      return [l.name.en, l.name.tr, l.tag].some((s) => s.toLocaleLowerCase(GF.i18n.lang).includes(q));
    }).map((l) => ({ kind: 'look', id: l.id, name: nm(l.name), look: l, fav: f.has(l.id) }));
  }

  function lookOf(item) {
    return item.kind === 'look' ? GF.lookSettings(item.look) : Object.assign({}, GF.DEFAULTS, item.settings);
  }

  function renderGrid() {
    const list = items();
    tiles = [];
    if (!list.length) {
      const msg = filter === 'fav' ? t('noFavs') : filter === 'saved' ? t('noPresets') : t('noMatch');
      grid.replaceChildren(el('p', { class: 'hint rail-empty', text: msg }));
      return;
    }
    grid.replaceChildren(...list.map((item) => {
      const canvas = el('canvas', { width: 4, height: 3 });
      const apply = el('button', {
        type: 'button', class: 'look-hit', 'aria-label': item.name,
        onclick: () => (item.kind === 'look' ? ctx.applyLook(lookOf(item), item.name) : ctx.loadPreset(item.settings, item.name))
      });
      const side = item.kind === 'look'
        ? el('button', {
          type: 'button', class: 'star' + (item.fav ? ' on' : ''), 'aria-pressed': item.fav ? 'true' : 'false',
          title: item.fav ? t('favRemove') : t('favAdd'), 'aria-label': (item.fav ? t('favRemove') : t('favAdd')) + ': ' + item.name,
          text: item.fav ? '★' : '☆', onclick: () => toggleFav(item.id)
        })
        : el('button', {
          type: 'button', class: 'star', title: t('deletePreset'), 'aria-label': t('deletePreset') + ': ' + item.name, text: '×',
          onclick: () => {
            const l = presets();
            l.splice(item.index, 1);
            store.write(PRESET_KEY, l);
            renderGrid();
          }
        });
      const node = el('div', { class: 'look' }, [
        el('span', { class: 'look-img' }, [canvas]),
        el('span', { class: 'look-foot' }, [el('span', { class: 'look-name', text: item.name }), side]),
        apply
      ]);
      tiles.push({ item, canvas });
      return node;
    }));
    schedule(30);
  }

  function schedule(delay) {
    dirty = true;
    if (!ctx || !ctx.hasSource() || document.body.classList.contains('rail-closed') || document.body.classList.contains('focus')) return;
    clearTimeout(timer);
    timer = setTimeout(run, delay || 0);
  }

  /* one tile per task, so the interface stays responsive */
  function run() {
    dirty = false;
    const my = ++token;
    let i = 0;
    const step = () => {
      if (my !== token) return;
      const tile = tiles[i++];
      if (!tile) return;
      ctx.renderThumb(tile.canvas, lookOf(tile.item));
      setTimeout(step, 0);
    };
    step();
  }

  function build() {
    const rail = document.getElementById('rail');
    const chips = el('div', { class: 'chips rail-chips', role: 'group', 'aria-label': t('looksTitle') });
    const filters = [['all', t('filterAll')], ['fav', '★ ' + t('filterFav')], ['saved', t('filterSaved')]]
      .concat(GF.LOOK_TAGS.map((g) => [g.id, nm(g.name)]));
    const paintChips = () => chips.replaceChildren(...filters.map(([id, label]) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': filter === id ? 'true' : 'false', text: label,
      onclick: () => {
        filter = id;
        paintChips();
        foot.hidden = filter !== 'saved';
        renderGrid();
      }
    })));
    const search = el('input', { type: 'text', class: 'search', placeholder: t('searchLooks'), 'aria-label': t('searchLooks'), spellcheck: 'false' });
    search.value = query;
    search.addEventListener('input', () => {
      query = search.value;
      renderGrid();
    });
    grid = el('div', { class: 'looks' });

    const name = el('input', { type: 'text', maxlength: 40, placeholder: t('presetName'), 'aria-label': t('presetName') });
    const importInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    importInput.addEventListener('change', async () => {
      const f = importInput.files[0];
      importInput.value = '';
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        ctx.loadPreset(data.settings || data, f.name.replace(/\.json$/i, ''));
      } catch (e) {
        ctx.toast(t('openFailed'), true);
      }
    });
    const foot = el('div', { class: 'rail-foot' }, [
      el('div', { class: 'inline-form' }, [name, el('button', {
        type: 'button', class: 'btn', text: t('savePreset'),
        onclick: () => {
          const n = name.value.trim() || 'Preset ' + (presets().length + 1);
          const l = presets().filter((p) => p.name !== n);
          l.unshift({ name: n, settings: Object.assign({}, ctx.S) });
          if (store.write(PRESET_KEY, l.slice(0, 60))) {
            name.value = '';
            ctx.toast(t('presetSaved'));
            renderGrid();
          }
        }
      })]),
      el('div', { class: 'btn-row' }, [
        el('button', {
          type: 'button', class: 'btn small', text: t('exportPreset'),
          onclick: () => {
            const blob = new Blob([JSON.stringify({ app: 'tlk-ascii', version: 2, settings: ctx.S }, null, 2)], { type: 'application/json' });
            GF.Exporter.download(blob, 'tlk-ascii-preset-' + GF.Exporter.stamp() + '.json');
          }
        }),
        el('button', { type: 'button', class: 'btn small', text: t('importPreset'), onclick: () => importInput.click() }),
        el('button', { type: 'button', class: 'btn small quiet', text: t('reset'), onclick: () => ctx.setMany({}, GF.DEFAULTS) })
      ]),
      importInput
    ]);
    foot.hidden = filter !== 'saved';
    paintChips();
    rail.replaceChildren(
      el('div', { class: 'rail-head' }, [el('h2', { text: t('looksTitle') }), search]),
      chips,
      el('div', { class: 'rail-scroll' }, [grid]),
      foot
    );
    renderGrid();
  }

  GF.Rail = {
    mount(context) {
      ctx = context;
      build();
    },
    rebuild: build,
    refresh: () => schedule(450),
    sourceChanged: () => schedule(60),
    shown() {
      if (dirty) schedule(30);
    }
  };
})(window.GF = window.GF || {});
