/* FIGlet banners: classic ASCII lettering (figlet.js), fonts loaded on demand.
   The result is a grid of characters that the renderer draws one-to-one. */
(function (GF) {
  'use strict';

  GF.FIGLET_FONTS = [
    ['ansi-shadow', "ANSI Shadow"],
    ['ansi-regular', "ANSI Regular"],
    ['ansi-compact', "ANSI Compact"],
    ['standard', "Standard"],
    ['slant', "Slant"],
    ['small', "Small"],
    ['small-slant', "Small Slant"],
    ['big', "Big"],
    ['bloody', "Bloody"],
    ['dos-rebel', "DOS Rebel"],
    ['delta-corps-priest-1', "Delta Corps Priest 1"],
    ['calvin-s', "Calvin S"],
    ['pagga', "Pagga"],
    ['elite', "Elite"],
    ['doom', "Doom"],
    ['graffiti', "Graffiti"],
    ['3d-ascii', "3D-ASCII"],
    ['sub-zero', "Sub-Zero"],
    ['larry-3d', "Larry 3D"],
    ['isometric1', "Isometric1"],
    ['star-wars', "Star Wars"],
    ['electronic', "Electronic"],
    ['blurvision-ascii', "BlurVision ASCII"],
    ['shaded-blocky', "Shaded Blocky"],
    ['big-money-ne', "Big Money-ne"],
    ['poison', "Poison"],
    ['ogre', "Ogre"],
    ['fraktur', "Fraktur"],
    ['alligator', "Alligator"],
    ['merlin1', "Merlin1"],
    ['colossal', "Colossal"],
    ['train', "Train"],
    ['ghost', "Ghost"],
    ['cybermedium', "Cybermedium"],
    ['rectangles', "Rectangles"],
    ['roman', "Roman"],
    ['univers', "Univers"],
    ['banner3-d', "Banner3-D"],
    ['dancing-font', "Dancing Font"],
    ['impossible', "Impossible"],
    ['gothic', "Gothic"],
    ['future', "Future"],
    ['bulbhead', "Bulbhead"],
    ['chunky', "Chunky"],
    ['cricket', "Cricket"],
    ['stop', "Stop"],
    ['rounded', "Rounded"],
    ['lean', "Lean"],
    ['script', "Script"],
    ['shadow', "Shadow"],
    ['thin', "Thin"],
    ['twisted', "Twisted"],
    ['modular', "Modular"],
    ['tmplr', "Tmplr"],
    ['cosmike', "Cosmike"],
    ['fire-font-k', "Fire Font-k"]
  ];

  const loaded = new Map();
  const ready = new Set();

  function load(slug) {
    if (loaded.has(slug)) return loaded.get(slug);
    if (!GF.FIGLET_FONTS.some((f) => f[0] === slug)) return Promise.reject(new Error('font'));
    const p = fetch('figlet/' + slug + '.flf')
      .then((r) => {
        if (!r.ok) throw new Error('font');
        return r.text();
      })
      .then((text) => {
        window.figlet.parseFont(slug, text);
        ready.add(slug);
        return true;
      });
    p.catch(() => loaded.delete(slug));
    loaded.set(slug, p);
    return p;
  }

  const LAYOUTS = { default: 'default', fitted: 'fitted', full: 'full' };

  GF.Banner = {
    load,
    isReady: (slug) => ready.has(slug),
    /* lines of text, or null while the font is still loading */
    lines(text, slug, layout) {
      if (!ready.has(slug)) {
        load(slug).catch(() => {});
        return null;
      }
      const out = [];
      for (const row of String(text || ' ').split('\n')) {
        const art = window.figlet.textSync(row || ' ', { font: slug, horizontalLayout: LAYOUTS[layout] || 'default', verticalLayout: 'default' });
        out.push(...art.replace(/\s+$/, '').split('\n'));
      }
      while (out.length && !out[out.length - 1].trim()) out.pop();
      while (out.length && !out[0].trim()) out.shift();
      return out.length ? out : [' '];
    }
  };
})(window.GF = window.GF || {});
