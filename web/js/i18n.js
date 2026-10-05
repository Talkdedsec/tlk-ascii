/* English and Turkish interface strings. */
(function (GF) {
  'use strict';

  const STR = {
    en: {
      tagline: 'Image, video and text to glowing ASCII art',
      open: 'Open', openHint: 'Open an image, GIF or video (Ctrl+O)', webcam: 'Webcam', text: 'Text', demos: 'Demos',
      undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Shift+Z)', export: 'Export', exportHint: 'Export (E)',
      downloadApp: 'Download the Windows app', language: 'Language', about: 'About and shortcuts',
      play: 'Play', pause: 'Pause', restart: 'Restart',
      compare: 'Before / after', compareHint: 'Compare with the original (C)',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', actual: 'Actual size', fit: 'Fit to screen (F)',
      status: '{cols} × {rows} glyphs · {w} × {h} px', lastFrame: '{ms} ms',
      emptyTitle: 'Nothing loaded', emptyBody: 'Drop an image or video here, paste one with Ctrl+V, or start from a demo.',
      pickDemo: 'Browse demos', dropTitle: 'Drop to open', dropBody: 'Image, GIF or video',

      'tab.looks': 'Looks', 'tab.glyphs': 'Glyphs', 'tab.color': 'Tone & colour', 'tab.effects': 'Effects', 'tab.frame': 'Frame',
      'sec.looks': 'Looks', 'sec.saved': 'Saved presets', 'sec.mode': 'Drawing mode', 'sec.charset': 'Character set',
      'sec.grid': 'Grid and type', 'sec.tone': 'Tone', 'sec.color': 'Colour', 'sec.light': 'Light', 'sec.screen': 'Screen',
      'sec.title': 'Title', 'sec.motion': 'Motion', 'sec.source': 'Source', 'sec.framing': 'Framing', 'sec.output': 'Output size',

      randomLook: 'Surprise me', looksHint: 'A look changes glyphs, colour and effects; your source, framing and tone stay. Ctrl+Z undoes it.',
      mode: 'Mode', modeAscii: 'ASCII', modeEdges: 'Edges', modeHalftone: 'Halftone',
      edgeThreshold: 'Edge cut-off', edgeGlyphs: 'Edge glyphs', edgeAscii: 'ASCII  | / - \\', edgeBox: 'Box  │ ╱ ─ ╲', edgeFill: 'Fill between edges',
      halftoneChar: 'Dot character', dither: 'Dithering', ditherNone: 'None', ditherFloyd: 'Floyd', ditherAtkinson: 'Atkinson', ditherBayer: 'Bayer',
      inject: 'Your own characters', injectHint: 'They replace the set, e.g. a name.',
      depth: 'Depth', cell: 'Cell size', grid: 'Grid', gridText: 'Text', gridSquare: 'Square',
      offset: 'Character offset', glyphFont: 'Glyph font', glyphScale: 'Glyph scale', glyphBold: 'Bold glyphs', invert: 'Invert',
      brightness: 'Brightness', contrast: 'Contrast', gamma: 'Gamma', threshold: 'Cut-off', saturation: 'Saturation',
      colorMode: 'Colour from', modePalette: 'Palette', modeSingle: 'One colour', modeSource: 'Source',
      color: 'Colour', fade: 'Fade with tone', bg: 'Background', transparent: 'Transparent background',
      customStops: 'Palette colours', addStop: 'Add colour', removeStop: 'Remove colour', fromCurrent: 'Copy the last palette',
      glow: 'Glow', glowRadius: 'Glow radius', chroma: 'Colour fringe', scanlines: 'Scanlines', vignette: 'Vignette', grain: 'Film grain', curvature: 'Screen curve',
      title: 'Title text', titleFont: 'Typeface', titleSize: 'Size', titleColor: 'Colour', titlePos: 'Position',
      posTop: 'Top', posCenter: 'Middle', posBottom: 'Bottom', titleMode: 'Style', modeOverlay: 'Crisp', modeBaked: 'Made of glyphs', titleGlow: 'Title glow',
      anim: 'Motion', animNone: 'None', animCycle: 'Cycle', animFlicker: 'Flicker', animWave: 'Wave', animSpeed: 'Speed', animAmount: 'Amount',
      sourceNone: 'No source', sourceImage: 'Image', sourceVideo: 'Video', sourceAnimation: 'Animated image', sourceWebcam: 'Webcam', sourceText: 'Text', sourceProcedural: 'Generated',
      textContent: 'Text', textFont: 'Typeface', textAspect: 'Canvas', textWeight: 'Weight', regular: 'Regular', bold: 'Bold',
      mirror: 'Mirror webcam', outWidth: 'Width',
      frame: 'Frame', frameSource: 'Original', frameZoom: 'Zoom', frameX: 'Move sideways', frameY: 'Move up / down',
      rotateLeft: 'Rotate left', rotateRight: 'Rotate right', flipX: 'Mirror', resetFrame: 'Reset framing',
      frameHint: 'Alt + drag on the picture moves it; Alt + mouse wheel zooms.',

      exportTitle: 'Export', exImage: 'Image', exAnim: 'Animation', exText: 'Text', exShare: 'Share',
      pngScale: 'Size', pngTrim: 'Trim empty edges', png: 'Save PNG', pngInfo: '{w} × {h} px',
      gif: 'Make GIF', gifWidth: 'Width', gifFps: 'Frames per second', gifSeconds: 'Length',
      gifStatic: 'This picture does not move, so the GIF gets a single frame. Turn on Motion for an animated one.',
      gifWorking: 'Making GIF… {p}%', cancel: 'Cancel',
      video: 'Record video', stopRec: 'Stop recording', recordHint: 'Records the preview. Videos record from the start until they end.',
      noRecorder: 'This browser cannot record video.', recording: 'Recording', seconds: 's',
      txt: 'Save TXT', html: 'Save HTML', svg: 'Save SVG', copyText: 'Copy text',
      shareLink: 'Copy settings link', shareHint: 'The link carries your settings, not your picture. It opens with the current demo.',
      linkCopied: 'Link copied',

      presetName: 'Preset name', savePreset: 'Save', loadPreset: 'Load', deletePreset: 'Delete',
      exportPreset: 'Export JSON', importPreset: 'Import JSON', reset: 'Reset all settings', noPresets: 'No saved presets yet.',
      presetSaved: 'Preset saved', presetLoaded: 'Preset loaded',
      copied: 'Copied to clipboard', saved: 'Saved', openFailed: 'That file could not be opened.', webcamFailed: 'The webcam is not available.',
      renderFailed: 'Rendering failed.', exporting: 'Exporting…',

      demosTitle: 'Demos', demosBody: 'Each demo loads a source and a full set of settings.', close: 'Close',
      aboutTitle: 'TLK ASCII',
      aboutBody: 'Turns images, videos, webcam footage and text into ASCII art with palettes, glow and motion. Everything runs on your device; files are never uploaded.',
      aboutCredits: 'Demo artwork: public domain and CC0 works from the National Gallery of Art, The Metropolitan Museum of Art and Wikimedia Commons. Fonts: SIL Open Font License. GIF encoding: gifenc (MIT).',
      source: 'Source code', shortcuts: 'Shortcuts',
      kOpen: 'Open a file', kSave: 'Save PNG', kExport: 'Export', kCopy: 'Copy text', kUndo: 'Undo / redo', kCompare: 'Before / after',
      kRandom: 'Surprise me', kPanKeys: 'Alt + drag · Alt + wheel', kFit: 'Fit to screen', kPlay: 'Play / pause', kDemos: 'Demos', kPan: 'Move / zoom the picture'
    },
    tr: {
      tagline: 'Resim, video ve yazıdan parlayan ASCII sanatı',
      open: 'Aç', openHint: 'Resim, GIF veya video aç (Ctrl+O)', webcam: 'Kamera', text: 'Yazı', demos: 'Demolar',
      undo: 'Geri al (Ctrl+Z)', redo: 'İleri al (Ctrl+Shift+Z)', export: 'Dışa aktar', exportHint: 'Dışa aktar (E)',
      downloadApp: 'Windows uygulamasını indir', language: 'Dil', about: 'Hakkında ve kısayollar',
      play: 'Oynat', pause: 'Duraklat', restart: 'Baştan',
      compare: 'Önce / sonra', compareHint: 'Orijinalle karşılaştır (C)',
      zoomIn: 'Yakınlaştır', zoomOut: 'Uzaklaştır', actual: 'Gerçek boyut', fit: 'Ekrana sığdır (F)',
      status: '{cols} × {rows} karakter · {w} × {h} px', lastFrame: '{ms} ms',
      emptyTitle: 'Henüz bir şey yok', emptyBody: 'Bir resim ya da videoyu buraya bırak, Ctrl+V ile yapıştır veya bir demoyla başla.',
      pickDemo: 'Demolara göz at', dropTitle: 'Açmak için bırak', dropBody: 'Resim, GIF veya video',

      'tab.looks': 'Görünüm', 'tab.glyphs': 'Karakter', 'tab.color': 'Ton ve renk', 'tab.effects': 'Efekt', 'tab.frame': 'Kadraj',
      'sec.looks': 'Görünümler', 'sec.saved': 'Kayıtlı ön ayarlar', 'sec.mode': 'Çizim modu', 'sec.charset': 'Karakter seti',
      'sec.grid': 'Izgara ve yazı', 'sec.tone': 'Ton', 'sec.color': 'Renk', 'sec.light': 'Işık', 'sec.screen': 'Ekran',
      'sec.title': 'Başlık', 'sec.motion': 'Hareket', 'sec.source': 'Kaynak', 'sec.framing': 'Kadraj', 'sec.output': 'Çıktı boyutu',

      randomLook: 'Şaşırt beni', looksHint: 'Görünüm karakterleri, rengi ve efektleri değiştirir; kaynak, kadraj ve ton aynı kalır. Ctrl+Z geri alır.',
      mode: 'Mod', modeAscii: 'ASCII', modeEdges: 'Kenar', modeHalftone: 'Yarım ton',
      edgeThreshold: 'Kenar eşiği', edgeGlyphs: 'Kenar karakterleri', edgeAscii: 'ASCII  | / - \\', edgeBox: 'Kutu  │ ╱ ─ ╲', edgeFill: 'Kenarların arasını doldur',
      halftoneChar: 'Nokta karakteri', dither: 'Dithering', ditherNone: 'Yok', ditherFloyd: 'Floyd', ditherAtkinson: 'Atkinson', ditherBayer: 'Bayer',
      inject: 'Kendi karakterlerin', injectHint: 'Seti değiştirir, örneğin bir isim.',
      depth: 'Derinlik', cell: 'Hücre boyutu', grid: 'Izgara', gridText: 'Metin', gridSquare: 'Kare',
      offset: 'Karakter kaydırma', glyphFont: 'Karakter fontu', glyphScale: 'Karakter ölçeği', glyphBold: 'Kalın karakter', invert: 'Ters çevir',
      brightness: 'Parlaklık', contrast: 'Kontrast', gamma: 'Gama', threshold: 'Kesme eşiği', saturation: 'Doygunluk',
      colorMode: 'Renk kaynağı', modePalette: 'Palet', modeSingle: 'Tek renk', modeSource: 'Kaynak',
      color: 'Renk', fade: 'Tona göre solma', bg: 'Arka plan', transparent: 'Saydam arka plan',
      customStops: 'Palet renkleri', addStop: 'Renk ekle', removeStop: 'Rengi kaldır', fromCurrent: 'Son paleti kopyala',
      glow: 'Parlama', glowRadius: 'Parlama yarıçapı', chroma: 'Renk saçağı', scanlines: 'Tarama çizgileri', vignette: 'Vinyet', grain: 'Film greni', curvature: 'Ekran bükülmesi',
      title: 'Başlık yazısı', titleFont: 'Yazı tipi', titleSize: 'Boyut', titleColor: 'Renk', titlePos: 'Konum',
      posTop: 'Üst', posCenter: 'Orta', posBottom: 'Alt', titleMode: 'Stil', modeOverlay: 'Net', modeBaked: 'Karakterlerden', titleGlow: 'Başlık parlaması',
      anim: 'Hareket', animNone: 'Yok', animCycle: 'Döngü', animFlicker: 'Titreme', animWave: 'Dalga', animSpeed: 'Hız', animAmount: 'Miktar',
      sourceNone: 'Kaynak yok', sourceImage: 'Resim', sourceVideo: 'Video', sourceAnimation: 'Hareketli resim', sourceWebcam: 'Kamera', sourceText: 'Yazı', sourceProcedural: 'Üretilmiş',
      textContent: 'Yazı', textFont: 'Yazı tipi', textAspect: 'Tuval', textWeight: 'Kalınlık', regular: 'Normal', bold: 'Kalın',
      mirror: 'Kamerayı aynala', outWidth: 'Genişlik',
      frame: 'Oran', frameSource: 'Orijinal', frameZoom: 'Yakınlaştırma', frameX: 'Yatay kaydır', frameY: 'Dikey kaydır',
      rotateLeft: 'Sola döndür', rotateRight: 'Sağa döndür', flipX: 'Aynala', resetFrame: 'Kadrajı sıfırla',
      frameHint: 'Resmin üstünde Alt + sürükle kaydırır, Alt + fare tekerleği yakınlaştırır.',

      exportTitle: 'Dışa aktar', exImage: 'Görsel', exAnim: 'Animasyon', exText: 'Metin', exShare: 'Paylaş',
      pngScale: 'Boyut', pngTrim: 'Boş kenarları kırp', png: 'PNG kaydet', pngInfo: '{w} × {h} px',
      gif: 'GIF oluştur', gifWidth: 'Genişlik', gifFps: 'Saniyedeki kare', gifSeconds: 'Süre',
      gifStatic: 'Bu görüntü hareket etmiyor, GIF tek kare olur. Hareketli GIF için Efekt sekmesinden Hareket\'i aç.',
      gifWorking: 'GIF hazırlanıyor… %{p}', cancel: 'Vazgeç',
      video: 'Video kaydet', stopRec: 'Kaydı durdur', recordHint: 'Önizlemeyi kaydeder. Videolar baştan sonuna kadar kaydedilir.',
      noRecorder: 'Bu tarayıcı video kaydedemiyor.', recording: 'Kaydediliyor', seconds: 'sn',
      txt: 'TXT kaydet', html: 'HTML kaydet', svg: 'SVG kaydet', copyText: 'Metni kopyala',
      shareLink: 'Ayar linkini kopyala', shareHint: 'Link resmini değil ayarlarını taşır. Mevcut demoyla açılır.',
      linkCopied: 'Link kopyalandı',

      presetName: 'Ön ayar adı', savePreset: 'Kaydet', loadPreset: 'Yükle', deletePreset: 'Sil',
      exportPreset: 'JSON dışa aktar', importPreset: 'JSON içe aktar', reset: 'Tüm ayarları sıfırla', noPresets: 'Henüz kayıtlı ön ayar yok.',
      presetSaved: 'Ön ayar kaydedildi', presetLoaded: 'Ön ayar yüklendi',
      copied: 'Panoya kopyalandı', saved: 'Kaydedildi', openFailed: 'Bu dosya açılamadı.', webcamFailed: 'Kameraya erişilemiyor.',
      renderFailed: 'Çizim başarısız oldu.', exporting: 'Dışa aktarılıyor…',

      demosTitle: 'Demolar', demosBody: 'Her demo bir kaynak ve eksiksiz bir ayar seti yükler.', close: 'Kapat',
      aboutTitle: 'TLK ASCII',
      aboutBody: 'Resim, video, kamera görüntüsü ve yazıyı paletler, parlama ve hareketle ASCII sanatına çevirir. Her şey senin cihazında çalışır, dosyalar hiçbir yere yüklenmez.',
      aboutCredits: 'Demo görselleri: National Gallery of Art, The Metropolitan Museum of Art ve Wikimedia Commons’tan kamu malı ve CC0 eserler. Fontlar: SIL Open Font License. GIF kodlama: gifenc (MIT).',
      source: 'Kaynak kodu', shortcuts: 'Kısayollar',
      kOpen: 'Dosya aç', kSave: 'PNG kaydet', kExport: 'Dışa aktar', kCopy: 'Metni kopyala', kUndo: 'Geri al / ileri al', kCompare: 'Önce / sonra',
      kRandom: 'Şaşırt beni', kPanKeys: 'Alt + sürükle · Alt + tekerlek', kFit: 'Ekrana sığdır', kPlay: 'Oynat / duraklat', kDemos: 'Demolar', kPan: 'Resmi kaydır / yakınlaştır'
    }
  };

  let lang = '';
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
