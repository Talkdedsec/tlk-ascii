<div align="center">

# TLK ASCII

**Image, video and text to glowing ASCII art. Free, private, no account.**

[**Open the app ↗**](https://talkdedsec.github.io/tlk-ascii/) · [Download for Windows](https://github.com/Talkdedsec/tlk-ascii/releases/latest) · [Türkçe](README.tr.md)

[![Quality](https://github.com/Talkdedsec/tlk-ascii/actions/workflows/ci.yml/badge.svg)](https://github.com/Talkdedsec/tlk-ascii/actions/workflows/ci.yml)
[![Website](https://github.com/Talkdedsec/tlk-ascii/actions/workflows/pages.yml/badge.svg)](https://github.com/Talkdedsec/tlk-ascii/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/Talkdedsec/tlk-ascii?color=ff5a2a)](https://github.com/Talkdedsec/tlk-ascii/releases/latest)
[![MIT](https://img.shields.io/badge/license-MIT-e8b34a)](LICENSE)

![TLK ASCII](web/icons/og.jpg)

</div>

TLK ASCII turns pictures, videos, GIFs, your webcam and plain text into ASCII art that glows. Pick from 38 character sets (classic ramps, braille, blocks, card suits, runes, katakana…), 24 colour palettes or the source's own colours, then add bloom, chromatic aberration, scanlines, a blackletter title and motion. Export PNG up to 4×, SVG, HTML, plain text or a video.

It runs entirely on your device: in the browser through GitHub Pages, or as an offline Windows program. The interface is in **English and Turkish**.

## Demos

Every demo loads a source and a complete set of settings. Click one to open it in the app.

| | | | | |
|:-:|:-:|:-:|:-:|:-:|
| [![Memento mori](web/demos/previews/skull.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=skull)<br>Memento mori | [![Knight, Death and Devil](web/demos/previews/knight.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=knight)<br>Knight, Death and Devil | [![Runes of the dragon](web/demos/previews/dragon.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=dragon)<br>Runes of the dragon | [![Gilded rhinoceros](web/demos/previews/rhino.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=rhino)<br>Gilded rhinoceros | [![Forged helmet](web/demos/previews/helmet.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=helmet)<br>Forged helmet |
| [![Self-portrait in colour](web/demos/previews/portrait.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=portrait)<br>Self-portrait in colour | [![Phosphor Melencolia](web/demos/previews/melencolia.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=melencolia)<br>Phosphor Melencolia | [![Living fire](web/demos/previews/fire.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=fire)<br>Living fire (animated) | [![Gothic title](web/demos/previews/gothic.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=gothic)<br>Gothic title | [![Vapour plasma](web/demos/previews/plasma.jpg)](https://talkdedsec.github.io/tlk-ascii/#demo=plasma)<br>Vapour plasma (animated) |

## Start in 10 seconds

1. [Open TLK ASCII](https://talkdedsec.github.io/tlk-ascii/).
2. Drop an image or video on the page, paste one with <kbd>Ctrl</kbd>+<kbd>V</kbd>, or choose **Demos**.
3. Adjust the panel on the right, then press **Save PNG**.

No login, installation or upload is involved.

## What you can do

| Area | Details |
| --- | --- |
| Sources | Images (PNG, JPG, WebP, AVIF…), animated GIF/WebP, video files, webcam, typed text, generated fire and plasma |
| Glyphs | 38 character sets in 9 categories, your own characters (e.g. a name), depth 2–64, cell size, text or square grid, character offset, 8 glyph fonts including blackletter |
| Tone | Invert, brightness, contrast, gamma, cut-off, saturation |
| Colour | 24 palettes, single colour, or colours sampled from the source; fade with tone; any background or transparent |
| Effects | Two-stage glow, chromatic aberration, scanlines, vignette |
| Title | Blackletter or mono title, either crisp on top or built from glyphs |
| Motion | Cycle, flicker or wave the glyphs; videos and GIFs play live |
| Export | PNG at 1×–4×, SVG, HTML, TXT, copy to clipboard, video recording (MP4 where the browser supports it, otherwise WebM) |
| Presets | Save, load, export and import settings as JSON |

Glyphs are sorted by how much ink they leave in the chosen font, so any character set, including your own text, maps from dark to bright correctly.

## Windows app

Download from the [latest release](https://github.com/Talkdedsec/tlk-ascii/releases/latest):

- `tlk-ascii-<version>-portable.exe`: a single file, no installation. Double-click to run.
- `tlk-ascii-<version>-setup.exe`: installs for the current user, with Start menu and desktop shortcuts and an uninstaller.

It is the same app as the website and works completely offline. The executables are not code-signed, so Windows SmartScreen may show "Windows protected your PC". Choose **More info → Run anyway**, or check the file against `SHA256SUMS.txt` in the release first.

## Tips

- **Engravings and line art:** turn on **Invert** and raise **Cut-off** until the paper disappears.
- **Photos:** try **Source colours** with gamma 1.5–2 for dark pictures.
- **Your name as the texture:** type it into **Inject characters**.
- **Sharper detail:** lower the cell size or raise the output width.
- **Blocks and braille** fill the cell best on the **Text** grid; **card suits and dots** look best on the **Square** grid.
- Double-click any slider to reset it.

## Shortcuts

| Keys | Action |
| --- | --- |
| <kbd>Ctrl</kbd> <kbd>O</kbd> | Open a file |
| <kbd>Ctrl</kbd> <kbd>S</kbd> | Save PNG |
| <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>C</kbd> | Copy as text |
| <kbd>Ctrl</kbd> + mouse wheel | Zoom |
| <kbd>F</kbd> | Fit to screen |
| <kbd>Space</kbd> | Play / pause |
| <kbd>D</kbd> | Demos |

## Privacy

Files are read with the browser's File API and processed on your device. Nothing is uploaded, there are no analytics and no cookies. Saved presets and the language choice live in your browser's local storage. The website is hosted on GitHub Pages, which may keep ordinary access logs.

## Development

Node.js 24 is only needed to work on the project; the web app itself has no build step.

```sh
git clone https://github.com/Talkdedsec/tlk-ascii.git
cd tlk-ascii
npm ci
npm run serve      # http://127.0.0.1:5173
npm test           # end-to-end checks in Edge or Chrome
npm start          # desktop app
npm run dist       # Windows portable + installer into release/
npm run demos      # re-render demo previews, icons and the social image
```

```
web/        the app (HTML, CSS, plain JavaScript, fonts, demo images)
desktop/    Electron shell that serves web/ offline
scripts/    local server, browser tests, demo renderer
```

The browser scripts use an installed Edge or Chrome; set `BROWSER_PATH` to use another Chromium-based browser.

## Credits

Demo artwork, all public domain or CC0:

- Andreas Vesalius, *De humani corporis fabrica*, 1543 ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Vesalius_Fabrica_skulls.jpg))
- Albrecht Dürer, *Knight, Death and Devil*, 1513, National Gallery of Art ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer,_Knight,_Death_and_Devil,_1513,_NGA_6637.jpg))
- Albrecht Dürer, *Saint George Killing the Dragon*, 1501–1504, National Gallery of Art ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer,_Saint_George_Killing_the_Dragon,_1501-1504,_NGA_6715.jpg))
- Albrecht Dürer, *The Rhinoceros*, 1515, National Gallery of Art ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer,_The_Rhinoceros,_1515,_NGA_47903.jpg))
- Albrecht Dürer, *Melencolia I*, 1514, National Gallery of Art ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer,_Melencolia_I,_1514,_NGA_6640.jpg))
- Albrecht Dürer, *Self-Portrait at Twenty-Eight*, 1500 ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_1500_self-portrait_(High_resolution_and_detail).jpg))
- *Close Helmet*, c. 1555, The Metropolitan Museum of Art ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Close_Helmet_MET_DT271729.jpg))

Fonts, all under the SIL Open Font License 1.1 (licence texts in [`web/fonts`](web/fonts)): IBM Plex Mono, VT323, Press Start 2P, UnifrakturMaguntia, Pirata One, Grenze Gotisch, Jacquard 24, Noto Sans Runic and a subset of Noto Sans Symbols 2.

## License

[MIT](LICENSE) for the code. Fonts keep their own licence; the demo images are public domain or CC0.
