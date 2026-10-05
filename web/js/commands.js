/* Ctrl+K: one search box for every action, look, demo and panel. */
(function (GF) {
  'use strict';

  const { el } = GF.UI;
  const t = (k) => GF.i18n.t(k);
  let source = null;
  let list = [];
  let shown = [];
  let active = 0;

  const fold = (s) => s.toLocaleLowerCase(GF.i18n.lang).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

  /* every query word must appear, in order of preference: start of label first */
  function match(item, words) {
    const hay = fold(item.label + ' ' + (item.keywords || '') + ' ' + item.group);
    let score = 0;
    for (const w of words) {
      const i = hay.indexOf(w);
      if (i < 0) return -1;
      score += i === 0 ? 3 : hay[i - 1] === ' ' ? 2 : 1;
    }
    return score;
  }

  function render(q) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    shown = (words.length
      ? list.map((x) => [x, match(x, words)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).map(([x]) => x)
      : list.filter((x) => !x.hidden)).slice(0, 60);
    active = 0;
    const ul = document.getElementById('cmd-list');
    if (!shown.length) {
      ul.replaceChildren(el('li', { class: 'cmd-empty', text: t('cmdNone') }));
      return;
    }
    let group = '';
    const nodes = [];
    shown.forEach((x, i) => {
      if (x.group !== group) {
        group = x.group;
        nodes.push(el('li', { class: 'cmd-group', role: 'presentation', text: group }));
      }
      nodes.push(el('li', {
        role: 'option', id: 'cmd-' + i, class: 'cmd-item', 'aria-selected': i === 0 ? 'true' : 'false',
        onclick: () => run(i), onmousemove: () => select(i)
      }, [el('span', { text: x.label }), x.hint ? el('kbd', { text: x.hint }) : null]));
    });
    ul.replaceChildren(...nodes);
    document.getElementById('cmd-input').setAttribute('aria-activedescendant', 'cmd-0');
  }

  function select(i) {
    if (!shown.length) return;
    active = (i + shown.length) % shown.length;
    document.querySelectorAll('#cmd-list .cmd-item').forEach((n, k) => n.setAttribute('aria-selected', k === active ? 'true' : 'false'));
    const node = document.getElementById('cmd-' + active);
    if (node) node.scrollIntoView({ block: 'nearest' });
    document.getElementById('cmd-input').setAttribute('aria-activedescendant', 'cmd-' + active);
  }

  function run(i) {
    const item = shown[i];
    document.getElementById('dlg-cmd').close();
    if (item) setTimeout(() => item.run(), 0);
  }

  GF.Commands = {
    init(getItems) {
      source = getItems;
      const input = document.getElementById('cmd-input');
      input.placeholder = t('cmdPlaceholder');
      input.addEventListener('input', () => render(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          select(active + 1);
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          select(active - 1);
          e.preventDefault();
        } else if (e.key === 'Enter') {
          run(active);
          e.preventDefault();
        }
      });
    },
    open() {
      const dlg = document.getElementById('dlg-cmd');
      const input = document.getElementById('cmd-input');
      input.placeholder = t('cmdPlaceholder');
      list = source();
      input.value = '';
      render('');
      if (!dlg.open) dlg.showModal();
      input.focus();
    }
  };
})(window.GF = window.GF || {});
