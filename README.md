# 🎮 SpriteStudio

**A one-place solution for turning AI-generated sprite videos into game-ready assets — entirely in your browser.**

No uploads. No servers. No subscriptions.

---

## Demo

> 📸 *Screenshots and demo GIF coming soon*

---

## What it does

SpriteStudio takes an AI-generated sprite video (MP4, WebM, GIF, MOV, APNG) and walks you through a 4-stage pipeline to produce export-ready game assets in seconds.

```
Drop video → Extract frames → Review & curate → Process → Export
```

Everything runs locally using browser APIs — your files never leave your machine.

---

## Features

### 🎞 Frame Extraction
- Configurable extraction FPS (1–60) with quick presets
- Real-time progress with thumbnail generation
- Automatic color palette extraction from source frames

### ✂️ Frame Review
- Grid view with small / medium / large thumbnail sizes
- Keep / Discard per frame with keyboard shortcuts (`K`, `D`, `⌘A`)
- Shift+click range selection, multi-select, bulk actions
- Lightbox zoom with arrow key navigation

### 🎨 Non-destructive Processing
- **Chroma key** — click directly on the sprite to sample a background color, with tolerance + edge feather controls
- **Pixelator** — presets for 8-bit, Game Boy, CGA, NES, 1-bit and more
- **Outline** — fixed-cost 8-directional outline rendering
- **Drop shadow** — offset, blur, opacity, color
- **Adjustments** — flip, rotate, scale, brightness, contrast
- **Auto-crop** — trims transparent padding with configurable padding
- **Per-frame overrides** — nudge, brightness/contrast, pivot point per individual frame
- **Animation segments** — split frames into named clips (idle, walk, attack…)
- **Live preview** — debounced real-time canvas preview of processed output
- **Animation player** — play back kept frames at any FPS to check timing

### 📦 Export formats

| Format | Files |
|---|---|
| Spritesheet PNG + JSON | Texture atlas + coordinate map |
| Frames ZIP | Individual zero-padded PNGs |
| Animated GIF | Looping animation |
| WebP Frames ZIP | Web-optimized frame sequence |
| CSS Spritesheet | PNG + `@keyframes` animation |
| Godot 4 SpriteFrames | `.tres` resource for `AnimatedSprite2D` |
| Unity Sprite Sheet | PNG + `.meta` slice file |
| MUGEN Package | SFF v1 binary + AIR animation + ACT palette |

All formats are generated client-side — no server round-trips.

---

## Getting started

### Prerequisites
- Node.js 18+
- npm or yarn

### Run locally

```bash
git clone https://github.com/OLDHOUSE-MECHANIC/Untitled-Sprite-Studio.git
cd Untitled-Sprite-Studio
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

---

## Deploy to Railway

This repo includes a `Caddyfile` and `nixpacks.toml` for zero-config Railway deployment.

1. Push to GitHub
2. Go to [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo**
3. Select this repository — Railway auto-detects the nixpacks config and builds
4. Go to **Settings → Networking → Generate Domain** to get your public URL

The Caddyfile handles SPA routing (`try_files`) so page refreshes work correctly.

---

## Tech stack

- **React 19** + **Zustand** — UI and state
- **Vite** — build tooling
- **Tailwind CSS** — styling
- **OffscreenCanvas / Web APIs** — all image processing
- **JSZip** — ZIP archive generation
- **gif.js** — animated GIF encoding
- **Caddy** — production static file server

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `K` | Keep selected frames |
| `D` / `Delete` | Discard selected frames |
| `⌘A` / `Ctrl+A` | Select all frames |
| `Shift+Click` | Range select |
| `Escape` | Clear selection / close lightbox |
| `← →` | Navigate frames in lightbox |

---

## License

MIT
