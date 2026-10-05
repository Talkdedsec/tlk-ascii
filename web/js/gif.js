/* Animated GIF export. Frames are rendered off screen, one shared palette
   is built from a few sample frames (no colour flicker), then every frame is
   mapped to it and encoded with gifenc. */
(function (GF) {
  'use strict';

  function seek(video, t) {
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener('seeked', done);
        resolve();
      };
      video.addEventListener('seeked', done);
      video.currentTime = Math.min(Math.max(0, t), Math.max(0, (video.duration || 0) - 0.01));
      setTimeout(done, 1500);
    });
  }

  const tick = () => new Promise((r) => setTimeout(r, 0));

  /* opts: renderer, source, settings, width, fps, seconds, animated,
     onProgress(fraction), signal (AbortSignal) */
  GF.makeGif = async function (opts) {
    const { renderer, source, settings, onProgress, signal } = opts;
    const enc = window.gifenc;
    const fps = Math.max(1, Math.min(50, opts.fps));
    const frames = opts.animated ? Math.max(2, Math.round(fps * opts.seconds)) : 1;
    const delay = Math.round(1000 / fps);
    const scale = opts.width / settings.outWidth;
    const canvas = document.createElement('canvas');
    const isVideo = source.kind === 'video';
    const video = isVideo ? source.el : null;
    const wasPaused = video ? video.paused : true;
    if (video) video.pause();
    const transparent = !!settings.transparent;
    const format = transparent ? 'rgba4444' : 'rgb565';

    async function frame(f) {
      const t = f / fps;
      if (video) await seek(video, t);
      source.update(t, settings);
      renderer.render(source, settings, canvas, { scale, time: t, keepLast: true });
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    }

    try {
      /* palette from the first, middle and last frames */
      const picks = Array.from(new Set([0, Math.floor(frames / 2), frames - 1]));
      const samples = [];
      for (const f of picks) samples.push((await frame(f)).data);
      const joined = new Uint8ClampedArray(samples.reduce((a, s) => a + s.length, 0));
      let off = 0;
      for (const s of samples) {
        joined.set(s, off);
        off += s.length;
      }
      const palette = enc.quantize(joined, 256, { format, oneBitAlpha: transparent });
      const transparentIndex = transparent ? palette.findIndex((p) => p[3] === 0) : -1;

      const gif = enc.GIFEncoder();
      for (let f = 0; f < frames; f++) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const img = await frame(f);
        const index = enc.applyPalette(img.data, palette, format);
        gif.writeFrame(index, img.width, img.height, {
          palette: f === 0 ? palette : undefined,
          delay,
          repeat: 0,
          transparent: transparentIndex >= 0,
          transparentIndex: Math.max(0, transparentIndex)
        });
        if (onProgress) onProgress((f + 1) / frames);
        await tick();
      }
      gif.finish();
      return new Blob([gif.bytes()], { type: 'image/gif' });
    } finally {
      if (video && !wasPaused) video.play().catch(() => {});
    }
  };
})(window.GF = window.GF || {});
