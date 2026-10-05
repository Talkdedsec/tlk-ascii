/* Undo history and the interface accent colour. */
(function (GF) {
  'use strict';

  /* Snapshots are taken after a short pause, so dragging a slider is one
     step, not hundreds. */
  GF.createHistory = function (getState, applyState, onChange) {
    const stack = [];
    let index = -1;
    let timer = 0;
    let pending = false;

    function commit() {
      clearTimeout(timer);
      timer = 0;
      pending = false;
      const snap = JSON.stringify(getState());
      if (index >= 0 && stack[index] === snap) return;
      stack.splice(index + 1);
      stack.push(snap);
      if (stack.length > 150) stack.shift();
      index = stack.length - 1;
      onChange();
    }

    return {
      reset() {
        clearTimeout(timer);
        pending = false;
        stack.length = 0;
        stack.push(JSON.stringify(getState()));
        index = 0;
        onChange();
      },
      touch() {
        pending = true;
        clearTimeout(timer);
        timer = setTimeout(commit, 450);
        onChange();
      },
      flush() {
        if (pending) commit();
      },
      undo() {
        if (pending) commit();
        if (index <= 0) return false;
        index--;
        applyState(JSON.parse(stack[index]));
        onChange();
        return true;
      },
      redo() {
        if (pending) commit();
        if (index >= stack.length - 1) return false;
        index++;
        applyState(JSON.parse(stack[index]));
        onChange();
        return true;
      },
      get canUndo() {
        return pending || index > 0;
      },
      get canRedo() {
        return !pending && index < stack.length - 1;
      }
    };
  };

  /* ---------- accent ---------- */

  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function fromHsl(h, s, l) {
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return Math.round((l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    };
    return [f(0), f(8), f(4)];
  }

  function luminance([r, g, b]) {
    const c = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  }

  /* Picks the most characterful colour of the current look and makes it
     readable on the dark interface. Grey looks give a neutral accent. */
  GF.accentFor = function (S, last) {
    let candidates = [];
    if (S.colorMode === 'single') candidates = [GF.hexToRgb(S.color)];
    else if (S.colorMode === 'palette') candidates = GF.paletteStops(S.palette, S).map(GF.hexToRgb);
    else if (last && last.colors) {
      const c = last.colors;
      for (let i = 0; i < c.length; i += 4 * 53) if (c[i + 3] > 40) candidates.push([c[i], c[i + 1], c[i + 2]]);
    }
    let best = null;
    let bestScore = -1;
    for (const rgb of candidates) {
      const [h, s, l] = toHsl(rgb);
      const score = s * (1 - Math.abs(l - 0.58) * 1.2);
      if (score > bestScore) {
        bestScore = score;
        best = [h, s, l];
      }
    }
    if (!best || best[1] < 0.14) return [214, 214, 218];
    return fromHsl(best[0], Math.min(0.9, Math.max(0.45, best[1])), Math.min(0.72, Math.max(0.6, best[2])));
  };

  GF.applyAccent = function (rgb) {
    const root = document.documentElement.style;
    const [r, g, b] = rgb;
    root.setProperty('--accent', 'rgb(' + r + ' ' + g + ' ' + b + ')');
    root.setProperty('--accent-soft', 'rgb(' + r + ' ' + g + ' ' + b + ' / .16)');
    root.setProperty('--accent-line', 'rgb(' + r + ' ' + g + ' ' + b + ' / .5)');
    root.setProperty('--accent-ink', luminance(rgb) > 0.36 ? '#121214' : '#ffffff');
  };
})(window.GF = window.GF || {});
