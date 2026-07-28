# 🐟 Pixel Fish Tank

A tiny retro, 8-bit style aquarium you can play in your browser. No build step,
no dependencies — just static HTML/CSS/JS, ready for GitHub Pages.

## Features

- **Procedurally generated koi** — every koi rolls its own base color, pattern
  (solid / kohaku / calico / speckled), spots, size and fins, so no two match.
- **Smooth, natural motion** — eased steering + gentle wandering, with chunky
  pixel rendering and a wagging tail.
- **Bubbles** — koi occasionally blow bubbles that rise and pop at the surface.
- **Cursor / finger curiosity** — every so often a koi or two will notice your
  pointer and swim over to it… but only if it can actually get there. Put your
  cursor in the gravel or outside the glass and they'll ignore it.
- **More critters** — dart around with shrimp, and add snails and crabs that
  patrol the gravel, plus swaying plants.
- **No clumping** — a soft separation force keeps everyone from stacking up.
- **Build & edit your tank** — pick a starting lineup on the title screen, then
  in the tank tap to select a creature and delete it, add more, or recolor the
  gravel on the fly.
- **Responsive** — laid out for phones, iPad / tablets, and desktop, with
  touch-friendly controls.

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. Pick the branch and the `/ (root)` folder, then save.
4. Your tank goes live at `https://<user>.github.io/<repo>/`.

The included `.nojekyll` file makes Pages serve everything as-is.

## Project layout

```
index.html          # title screen + tank view
css/style.css       # retro styling, responsive layout
js/palette.js       # colors + helpers
js/creatures.js     # base Creature + Shrimp / Snail / Crab
js/koi.js           # procedural koi generator
js/plants.js        # swaying plants
js/tank.js          # engine: canvas, loop, separation, pointer
js/main.js          # UI wiring + screens
```
