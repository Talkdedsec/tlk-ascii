/* Small DOM toolkit for the panel and dialogs. */
(function (GF) {
  'use strict';

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    (children || []).forEach((c) => c != null && c !== false && e.append(c));
    return e;
  }

  let uid = 0;
  const id = (k) => 'f-' + (k || 'x') + '-' + ++uid;

  function decimals(step) {
    if (step >= 1) return 0;
    return step >= 0.1 ? 1 : 2;
  }

  /* Slider with an editable value. Double-click the label to reset. */
  function range(o) {
    const fid = id(o.key);
    const input = el('input', { type: 'range', id: fid, min: o.min, max: o.max, step: o.step });
    const val = el('input', { type: 'text', class: 'val', inputmode: 'decimal', spellcheck: 'false', 'aria-label': o.label });
    const label = el('label', { for: fid, text: o.label, title: o.resetTitle || '' });
    const paint = (v) => {
      input.style.setProperty('--p', (((v - o.min) / (o.max - o.min)) * 100).toFixed(2) + '%');
      val.value = Number(v).toFixed(decimals(o.step));
    };
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      paint(v);
      o.onInput(v);
    });
    val.addEventListener('change', () => {
      let v = parseFloat(val.value.replace(',', '.'));
      if (!isFinite(v)) v = o.get();
      v = Math.min(o.max, Math.max(o.min, v));
      input.value = v;
      paint(v);
      o.onInput(v);
    });
    val.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') val.blur();
    });
    label.addEventListener('dblclick', () => {
      if (o.reset == null) return;
      input.value = o.reset;
      paint(o.reset);
      o.onInput(o.reset);
    });
    const node = el('div', { class: 'row range' }, [
      el('div', { class: 'row-head' }, [label, el('span', { class: 'val-wrap' }, [val, o.unit ? el('span', { class: 'unit', text: o.unit }) : null])]),
      input
    ]);
    return {
      node,
      sync() {
        const v = o.get();
        input.value = v;
        if (document.activeElement !== val) paint(v);
        else input.style.setProperty('--p', (((v - o.min) / (o.max - o.min)) * 100).toFixed(2) + '%');
      }
    };
  }

  /* Exclusive buttons. options: [[value, label], …] */
  function segmented(o) {
    const group = el('div', { class: 'seg' + (o.wrap ? ' wrap' : ''), role: 'radiogroup', 'aria-label': o.label });
    let opts = [];
    function build() {
      opts = typeof o.options === 'function' ? o.options() : o.options;
      group.replaceChildren(...opts.map(([v, lab]) => el('button', {
        type: 'button', role: 'radio', 'data-v': v, text: lab,
        onclick: () => o.onInput(v)
      })));
    }
    group.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = opts.findIndex((x) => String(x[0]) === String(o.get()));
      o.onInput(opts[(i + (e.key === 'ArrowRight' ? 1 : -1) + opts.length) % opts.length][0]);
      requestAnimationFrame(() => {
        const b = group.querySelector('[aria-checked="true"]');
        if (b) b.focus();
      });
      e.preventDefault();
    });
    build();
    const node = el('div', { class: 'row' }, [o.label ? el('span', { class: 'label', text: o.label }) : null, group]);
    return {
      node,
      rebuild: build,
      sync() {
        const cur = String(o.get());
        group.querySelectorAll('button').forEach((b) => {
          const on = b.dataset.v === cur;
          b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
        });
        if (!group.querySelector('[aria-checked="true"]') && group.firstChild) group.firstChild.tabIndex = 0;
      }
    };
  }

  function select(o) {
    const fid = id(o.key);
    const s = el('select', { id: fid });
    s.addEventListener('change', () => o.onInput(s.value));
    const node = el('div', { class: 'row' }, [el('label', { for: fid, class: 'label', text: o.label }), s]);
    return {
      node,
      sync() {
        const opts = typeof o.options === 'function' ? o.options() : o.options;
        const cur = String(o.get());
        if (s.options.length !== opts.length || Array.from(s.options).some((op, i) => op.value !== String(opts[i][0]) || op.textContent !== opts[i][1])) {
          s.replaceChildren(...opts.map(([v, lab]) => el('option', { value: v, text: lab })));
        }
        s.value = cur;
      }
    };
  }

  function check(o) {
    const fid = id(o.key);
    const input = el('input', { type: 'checkbox', id: fid, role: 'switch' });
    input.addEventListener('change', () => o.onInput(input.checked));
    const node = el('div', { class: 'row check' }, [el('label', { for: fid }, [el('span', { text: o.label }), input])]);
    return { node, sync() { input.checked = !!o.get(); } };
  }

  function color(o) {
    const fid = id(o.key);
    const pick = el('input', { type: 'color', id: fid });
    const hex = el('input', { type: 'text', class: 'hex', maxlength: 7, spellcheck: 'false', 'aria-label': o.label + ' (hex)' });
    pick.addEventListener('input', () => {
      hex.value = pick.value;
      o.onInput(pick.value);
    });
    hex.addEventListener('change', () => {
      const v = hex.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v)) {
        const val = (v.startsWith('#') ? v : '#' + v).toLowerCase();
        pick.value = val;
        o.onInput(val);
      } else hex.value = o.get();
    });
    const node = el('div', { class: 'row color-row' }, [el('label', { for: fid, class: 'label', text: o.label }), el('div', { class: 'color' }, [pick, hex])]);
    return {
      node,
      sync() {
        pick.value = o.get();
        if (document.activeElement !== hex) hex.value = o.get();
      }
    };
  }

  function text(o) {
    const fid = id(o.key);
    const input = o.multiline
      ? el('textarea', { id: fid, rows: 2, maxlength: o.maxlength, spellcheck: 'false' })
      : el('input', { type: 'text', id: fid, maxlength: o.maxlength, spellcheck: 'false', placeholder: o.placeholder || '' });
    input.addEventListener('input', () => o.onInput(input.value));
    const node = el('div', { class: 'row' }, [el('label', { for: fid, class: 'label', text: o.label }), input, o.hint ? el('small', { class: 'hint', text: o.hint }) : null]);
    return {
      node,
      sync() {
        if (document.activeElement !== input) input.value = o.get();
      }
    };
  }

  GF.UI = { el, range, segmented, select, check, color, text };
})(window.GF = window.GF || {});
