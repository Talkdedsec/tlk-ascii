/* English and Turkish interface strings. */
(function (GF) {
  'use strict';

  const STR = {
    en: {
      tagline: 'Image, video and text to glowing ASCII art',
      open: 'Open', openHint: 'Image, GIF or video (Ctrl+O)', webcam: 'Webcam', text: 'Text', fire: 'Fire', plasma: 'Plasma',
      demos: 'Demos', export: 'Export', about: 'About', language: 'Language', downloadApp: 'Download the Windows app',
      fit: 'Fit to screen', zoomIn: 'Zoom in', zoomOut: 'Zoom out', actual: 'Actual size',
      play: 'Play', pause: 'Pause', restart: 'Restart',
      dropTitle: 'Drop to open', dropBody: 'Image, GIF or video',
      emptyTitle: 'Forge your first piece',
      emptyBody: 'Drop an image or video here, paste one with Ctrl+V, or start from a demo.',
      pickDemo: 'Browse demos',
      'sec.source': 'Source', 'sec.ascii': 'Glyphs', 'sec.adjust': 'Tone', 'sec.color': 'Colour', 'sec.effects': 'Effects',
      'sec.title': 'Title', 'sec.anim': 'Animation', 'sec.export': 'Export', 'sec.presets': 'Presets',
      sourceNone: 'No source yet', sourceImage: 'Image', sourceVideo: 'Video', sourceAnimation: 'Animated image', sourceWebcam: 'Webcam', sourceText: 'Text', sourceProcedural: 'Generated',
      textContent: 'Text', textFont: 'Typeface', textAspect: 'Canvas', textWeight: 'Weight', regular: 'Regular', bold: 'Bold',
      outWidth: 'Output width', mirror: 'Mirror webcam',
      charCategory: 'Character category', charSet: 'Character set', inject: 'Inject characters', injectHint: 'Your own characters replace the set, e.g. a name.',
      depth: 'Depth', cell: 'Cell size', grid: 'Grid', gridText: 'Text (tall cells)', gridSquare: 'Square',
      offset: 'Character offset', glyphFont: 'Glyph font', glyphScale: 'Glyph scale', glyphBold: 'Bold glyphs', invert: 'Invert',
      brightness: 'Brightness', contrast: 'Contrast', gamma: 'Gamma', threshold: 'Cut-off', saturation: 'Saturation',
      colorMode: 'Colour mode', modePalette: 'Palette', modeSingle: 'Single colour', modeSource: 'Source colours',
      paletteCategory: 'Palette category', palette: 'Palette', color: 'Colour', fade: 'Fade with tone',
      bg: 'Background', transparent: 'Transparent background',
      glow: 'Glow', glowRadius: 'Glow radius', chroma: 'Chromatic aberration', scanlines: 'Scanlines', vignette: 'Vignette',
      title: 'Title text', titleFont: 'Title typeface', titleSize: 'Title size', titleColor: 'Title colour', titlePos: 'Position',
      posTop: 'Top', posCenter: 'Centre', posBottom: 'Bottom', titleMode: 'Title style', modeOverlay: 'Crisp on top', modeBaked: 'Made of glyphs', titleGlow: 'Title glow',
      anim: 'Motion', animNone: 'None', animCycle: 'Cycle glyphs', animFlicker: 'Flicker', animWave: 'Wave', animSpeed: 'Speed', animAmount: 'Amount',
      pngScale: 'PNG scale', png: 'Save PNG', txt: 'Save TXT', html: 'Save HTML', svg: 'Save SVG', copyText: 'Copy text',
      record: 'Record video', stopRec: 'Stop', duration: 'Length', recording: 'Recording', seconds: 's',
      recordHint: 'Records what you see. Videos record from the start until they end.',
      noRecorder: 'This browser cannot record video.',
      presetName: 'Preset name', savePreset: 'Save', loadPreset: 'Load', deletePreset: 'Delete',
      exportPreset: 'Export JSON', importPreset: 'Import JSON', reset: 'Reset all settings', noPresets: 'No saved presets yet.',
      copied: 'Copied to clipboard', saved: 'Saved', presetSaved: 'Preset saved', presetLoaded: 'Preset loaded',
      openFailed: 'That file could not be opened.', webcamFailed: 'The webcam is not available.', renderFailed: 'Rendering failed.',
      exporting: 'Exporting…', loading: 'Loading…',
      demosTitle: 'Demos', demosBody: 'Each demo loads a source and a full set of settings. Change anything afterwards.',
      close: 'Close',
      aboutTitle: 'About TLK ASCII',
      aboutBody: 'TLK ASCII turns images, videos, webcam footage and text into ASCII art with palettes, glow and motion. Everything runs on your device; files are never uploaded.',
      aboutCredits: 'Demo artwork: public domain and CC0 works from the National Gallery of Art, The Metropolitan Museum of Art and Wikimedia Commons. Fonts: SIL Open Font License.',
      source: 'Source code', shortcuts: 'Shortcuts',
      kOpen: 'Open a file', kSave: 'Save PNG', kCopy: 'Copy text', kFit: 'Fit to screen', kPlay: 'Play / pause', kDemos: 'Demos',
      status: '{cols} × {rows} glyphs · {w} × {h} px',
      lastFrame: '{ms} ms'
    },
    tr: {
      tagline: 'Resim, video ve yazıdan parlayan ASCII sanatı',
      open: 'Aç', openHint: 'Resim, GIF veya video (Ctrl+O)', webcam: 'Kamera', text: 'Yazı', fire: 'Ateş', plasma: 'Plazma',
      demos: 'Demolar', export: 'Dışa aktar', about: 'Hakkında', language: 'Dil', downloadApp: 'Windows uygulamasını indir',
      fit: 'Ekrana sığdır', zoomIn: 'Yakınlaştır', zoomOut: 'Uzaklaştır', actual: 'Gerçek boyut',
      play: 'Oynat', pause: 'Duraklat', restart: 'Baştan',
      dropTitle: 'Açmak için bırak', dropBody: 'Resim, GIF veya video',
      emptyTitle: 'İlk eserini döv',
      emptyBody: 'Bir resim ya da videoyu buraya sürükle, Ctrl+V ile yapıştır veya bir demoyla başla.',
      pickDemo: 'Demolara göz at',
      'sec.source': 'Kaynak', 'sec.ascii': 'Karakterler', 'sec.adjust': 'Ton', 'sec.color': 'Renk', 'sec.effects': 'Efektler',
      'sec.title': 'Başlık', 'sec.anim': 'Animasyon', 'sec.export': 'Dışa aktar', 'sec.presets': 'Ön ayarlar',
      sourceNone: 'Henüz kaynak yok', sourceImage: 'Resim', sourceVideo: 'Video', sourceAnimation: 'Hareketli resim', sourceWebcam: 'Kamera', sourceText: 'Yazı', sourceProcedural: 'Üretilmiş',
      textContent: 'Yazı', textFont: 'Yazı tipi', textAspect: 'Tuval', textWeight: 'Kalınlık', regular: 'Normal', bold: 'Kalın',
      outWidth: 'Çıktı genişliği', mirror: 'Kamerayı aynala',
      charCategory: 'Karakter kategorisi', charSet: 'Karakter seti', inject: 'Kendi karakterlerin', injectHint: 'Yazdığın karakterler seti değiştirir, örneğin bir isim.',
      depth: 'Derinlik', cell: 'Hücre boyutu', grid: 'Izgara', gridText: 'Metin (uzun hücre)', gridSquare: 'Kare',
      offset: 'Karakter kaydırma', glyphFont: 'Karakter fontu', glyphScale: 'Karakter ölçeği', glyphBold: 'Kalın karakter', invert: 'Ters çevir',
      brightness: 'Parlaklık', contrast: 'Kontrast', gamma: 'Gama', threshold: 'Kesme eşiği', saturation: 'Doygunluk',
      colorMode: 'Renk modu', modePalette: 'Palet', modeSingle: 'Tek renk', modeSource: 'Kaynak renkleri',
      paletteCategory: 'Palet kategorisi', palette: 'Palet', color: 'Renk', fade: 'Tona göre solma',
      bg: 'Arka plan', transparent: 'Saydam arka plan',
      glow: 'Parlama', glowRadius: 'Parlama yarıçapı', chroma: 'Renk kayması', scanlines: 'Tarama çizgileri', vignette: 'Vinyet',
      title: 'Başlık yazısı', titleFont: 'Başlık yazı tipi', titleSize: 'Başlık boyutu', titleColor: 'Başlık rengi', titlePos: 'Konum',
      posTop: 'Üst', posCenter: 'Orta', posBottom: 'Alt', titleMode: 'Başlık stili', modeOverlay: 'Üstte net', modeBaked: 'Karakterlerden', titleGlow: 'Başlık parlaması',
      anim: 'Hareket', animNone: 'Yok', animCycle: 'Karakter döngüsü', animFlicker: 'Titreme', animWave: 'Dalga', animSpeed: 'Hız', animAmount: 'Miktar',
      pngScale: 'PNG ölçeği', png: 'PNG kaydet', txt: 'TXT kaydet', html: 'HTML kaydet', svg: 'SVG kaydet', copyText: 'Metni kopyala',
      record: 'Video kaydet', stopRec: 'Durdur', duration: 'Süre', recording: 'Kaydediliyor', seconds: 'sn',
      recordHint: 'Ekranda göreni kaydeder. Videolar baştan sonuna kadar kaydedilir.',
      noRecorder: 'Bu tarayıcı video kaydedemiyor.',
      presetName: 'Ön ayar adı', savePreset: 'Kaydet', loadPreset: 'Yükle', deletePreset: 'Sil',
      exportPreset: 'JSON dışa aktar', importPreset: 'JSON içe aktar', reset: 'Tüm ayarları sıfırla', noPresets: 'Henüz kayıtlı ön ayar yok.',
      copied: 'Panoya kopyalandı', saved: 'Kaydedildi', presetSaved: 'Ön ayar kaydedildi', presetLoaded: 'Ön ayar yüklendi',
      openFailed: 'Bu dosya açılamadı.', webcamFailed: 'Kameraya erişilemiyor.', renderFailed: 'Çizim başarısız oldu.',
      exporting: 'Dışa aktarılıyor…', loading: 'Yükleniyor…',
      demosTitle: 'Demolar', demosBody: 'Her demo bir kaynak ve eksiksiz bir ayar seti yükler. Sonra istediğini değiştir.',
      close: 'Kapat',
      aboutTitle: 'TLK ASCII hakkında',
      aboutBody: 'TLK ASCII; resim, video, kamera görüntüsü ve yazıyı paletler, parlama ve hareketle ASCII sanatına çevirir. Her şey senin cihazında çalışır, dosyalar hiçbir yere yüklenmez.',
      aboutCredits: 'Demo görselleri: National Gallery of Art, The Metropolitan Museum of Art ve Wikimedia Commons’tan kamu malı ve CC0 eserler. Fontlar: SIL Open Font License.',
      source: 'Kaynak kodu', shortcuts: 'Kısayollar',
      kOpen: 'Dosya aç', kSave: 'PNG kaydet', kCopy: 'Metni kopyala', kFit: 'Ekrana sığdır', kPlay: 'Oynat / duraklat', kDemos: 'Demolar',
      status: '{cols} × {rows} karakter · {w} × {h} px',
      lastFrame: '{ms} ms'
    }
  };

  let lang = 'en';
  try {
    lang = localStorage.getItem('tlk-ascii.lang') || '';
  } catch (e) {
    lang = '';
  }
  if (!STR[lang]) lang = /^tr\b/i.test(navigator.language || '') ? 'tr' : 'en';

  GF.i18n = {
    get lang() {
      return lang;
    },
    set(l) {
      if (!STR[l]) return;
      lang = l;
      try {
        localStorage.setItem('tlk-ascii.lang', l);
      } catch (e) { /* storage may be unavailable */ }
      document.documentElement.lang = l;
    },
    t(key, vars) {
      let s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
      if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
      return s;
    },
    name(obj) {
      return (obj && (obj[lang] || obj.en)) || '';
    }
  };
  document.documentElement.lang = lang;
})(window.GF = window.GF || {});
