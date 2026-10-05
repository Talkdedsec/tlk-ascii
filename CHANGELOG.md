# Changelog

## 1.1.2

- Fixed: pictures were cropped at the top and bottom on the default text grid since 1.1.0; framing now uses the output's real aspect ratio, and baked titles are no longer squashed.
- Fixed: opening your own image, video, webcam or text after a demo kept the demo's title, inversion, cut-off and framing.
- Fixed: Turkish accents and tall blackletter capitals were cut off in text sources; blackletter fonts fall back to Pirata One for missing letters.
- Fixed: webcam GIFs were a single repeated frame.
- Fixed: the last panel tab could be clipped.
- Rendering is 5–8× faster (glyphs are written straight into pixel memory), so sliders respond immediately.
- Look thumbnails use their own renderer and no longer slow down the main preview.

## 1.1.1

- Video recording is back to fixed-rate capture, so recorded clips play in every browser; empty recordings show an error instead of downloading.

## 1.1.0

- New darkroom interface: neutral graphite, tabbed panel, accent colour taken from the current palette.
- Looks gallery with live thumbnails of your own picture, plus random looks.
- Edge and halftone drawing modes; Floyd–Steinberg, Atkinson and Bayer dithering.
- Visual character set and palette pickers; palette editor with up to 8 colours.
- Film grain and CRT screen curve.
- Framing: aspect presets, zoom, move (Alt + drag), rotate, mirror.
- Before / after split view, undo and redo, editable slider values.
- Export dialog with animated GIF, trimmed PNG and settings links.
- Three new demos: line sketch, colour halftone, one-bit Atkinson.

## 1.0.0

- Image, animated GIF/WebP, video, webcam, text, fire and plasma sources.
- 38 character sets in 9 categories, inject your own characters, ink-measured glyph ordering.
- 24 palettes, single colour or source colours; glow, chromatic aberration, scanlines, vignette.
- Blackletter titles, crisp or built from glyphs; cycle, flicker and wave motion.
- PNG (1×–4×), SVG, HTML, TXT, clipboard and video export; JSON presets.
- English and Turkish interface; ten demos built from public domain artwork.
- Offline Windows app (portable and installer) built from the same code.
