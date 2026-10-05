/* Exports: PNG, plain text, coloured HTML, SVG and screen recordings. */
(function (GF) {
  'use strict';

  function stamp() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function escapeXml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function hex2(v) {
    return Math.round(v).toString(16).padStart(2, '0');
  }

  /* Rows of characters; empty cells become spaces. */
  function toLines(last) {
    const lines = [];
    for (let y = 0; y < last.rows; y++) {
      let line = '';
      for (let x = 0; x < last.cols; x++) {
        const gi = last.idx[y * last.cols + x];
        line += gi < 0 ? ' ' : last.glyphs[gi].chr;
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines;
  }

  /* Runs of equal colour per row, colours rounded so neighbours merge. */
  function runs(last, y) {
    const out = [];
    let cur = null;
    for (let x = 0; x < last.cols; x++) {
      const i = y * last.cols + x;
      const gi = last.idx[i];
      const p = i * 4;
      const chr = gi < 0 ? ' ' : last.glyphs[gi].chr;
      let color = null;
      if (gi >= 0) {
        const q = (v) => Math.min(255, Math.round(v / 8) * 8);
        const a = last.colors[p + 3] / 255;
        color = '#' + hex2(q(last.colors[p])) + hex2(q(last.colors[p + 1])) + hex2(q(last.colors[p + 2])) + (a < 0.97 ? hex2(Math.round(a * 10) * 25.5) : '');
      }
      if (cur && (cur.color === color || chr === ' ')) {
        cur.text += chr;
      } else {
        cur = { color, text: chr, x };
        out.push(cur);
      }
    }
    return out;
  }

  function fontCss(s) {
    return GF.fontStack(s.glyphFont).replace(/"/g, "'");
  }

  GF.Exporter = {
    stamp,
    download,
    toText(last) {
      return toLines(last).join('\n') + '\n';
    },

    toHTML(last) {
      const s = last.settings;
      const glow = s.glow > 0 ? 'text-shadow:0 0 ' + Math.round(s.glowRadius * 0.8) + 'px currentColor;' : '';
      const fontPx = Math.round(last.ch * (s.grid === 'square' ? 0.86 : 0.92) * (s.glyphScale / 100));
      /* Every cell is a fixed-width box, so proportional fonts such as
         blackletter still line up. */
      let body = '';
      for (let y = 0; y < last.rows; y++) {
        let row = '';
        for (const r of runs(last, y)) {
          if (!r.color) {
            row += '<i style="width:' + Array.from(r.text).length * last.cw + 'px"></i>';
            continue;
          }
          row += '<span style="color:' + r.color + '">' + Array.from(r.text).map((c) => '<i>' + escapeXml(c) + '</i>').join('') + '</span>';
        }
        body += '<div>' + row + '</div>\n';
      }
      return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>ASCII art</title>\n<style>\n' +
        'html,body{margin:0;background:' + (s.transparent ? 'transparent' : s.bg) + ';}\n' +
        '.art{display:inline-block;padding:24px;font:' + (s.bold ? '700 ' : '400 ') + fontPx + 'px ' + fontCss(s) + ';' + glow + '}\n' +
        '.art div{height:' + last.ch + 'px;line-height:' + last.ch + 'px;white-space:nowrap}\n' +
        '.art i{display:inline-block;width:' + last.cw + 'px;height:' + last.ch + 'px;text-align:center;font-style:normal;overflow:hidden;vertical-align:top}\n' +
        '</style>\n</head>\n<body>\n<div class="art">\n' + body + '</div>\n</body>\n</html>\n';
    },

    toSVG(last) {
      const s = last.settings;
      const fontPx = Math.round(last.ch * (s.grid === 'square' ? 0.86 : 0.92) * (s.glyphScale / 100));
      const parts = [];
      parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + last.W + '" height="' + last.H + '" viewBox="0 0 ' + last.W + ' ' + last.H + '">');
      if (s.glow > 0) {
        const sd = Math.max(1, s.glowRadius * 0.6).toFixed(1);
        parts.push('<defs><filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="' + sd + '" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>');
      }
      if (!s.transparent) parts.push('<rect width="100%" height="100%" fill="' + s.bg + '"/>');
      parts.push('<g font-family="' + fontCss(s) + '" font-size="' + fontPx + '"' + (s.bold ? ' font-weight="700"' : '') + ' text-anchor="middle" dominant-baseline="central"' + (s.glow > 0 ? ' filter="url(#glow)"' : '') + '>');
      for (let y = 0; y < last.rows; y++) {
        const cy = (y + 0.5) * last.ch;
        for (const r of runs(last, y)) {
          if (!r.color) continue;
          const chars = Array.from(r.text);
          const xs = [];
          let txt = '';
          chars.forEach((c, k) => {
            if (c === ' ') return;
            xs.push(((r.x + k + 0.5) * last.cw).toFixed(1));
            txt += c;
          });
          if (!txt) continue;
          const fill = r.color.length > 7 ? r.color.slice(0, 7) + '" fill-opacity="' + (parseInt(r.color.slice(7), 16) / 255).toFixed(2) : r.color;
          parts.push('<text x="' + xs.join(' ') + '" y="' + cy.toFixed(1) + '" fill="' + fill + '">' + escapeXml(txt) + '</text>');
        }
      }
      parts.push('</g></svg>');
      return parts.join('\n');
    },

    /* Pick the best recording format this browser offers. */
    recorderType() {
      if (!('MediaRecorder' in window)) return null;
      const types = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      return types.find((t) => window.MediaRecorder.isTypeSupported(t)) || null;
    },

    record(canvas, seconds, onTick) {
      const type = this.recorderType();
      if (!type || !canvas.captureStream) return null;
      /* A fixed-rate capture: clips recorded this way play back in every
         browser. The render loop keeps painting while recording. */
      const stream = canvas.captureStream(30);
      const rec = new window.MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16000000 });
      const chunks = [];
      rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      const started = performance.now();
      let timer = 0;
      const done = new Promise((resolve) => {
        rec.onstop = () => {
          clearInterval(timer);
          stream.getTracks().forEach((t) => t.stop());
          const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: type.split(';')[0] });
          resolve({ blob: blob.size > 1024 ? blob : null, ext });
        };
      });
      rec.start(250);
      timer = setInterval(() => {
        const el = (performance.now() - started) / 1000;
        if (onTick) onTick(el);
        if (seconds && el >= seconds && rec.state === 'recording') rec.stop();
      }, 100);
      return { done, stop: () => rec.state === 'recording' && rec.stop() };
    }
  };
})(window.GF = window.GF || {});
