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

A deploy workflow is already included at `.github/workflows/pages.yml`. The
**one-time** step (GitHub won't let automation enable Pages for you the first
time) is to turn Pages on:

1. Go to **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**.

That's it. From then on every push to `main` or the game branch auto-builds and
publishes; you can also trigger it manually from the **Actions** tab
("Deploy to GitHub Pages" → *Run workflow*). The site goes live at
`https://sarwesv.github.io/fishsim/`.

Prefer no Actions at all? Instead set **Source → Deploy from a branch**, pick the
branch and the `/ (root)` folder — the static site is served directly. The
included `.nojekyll` file makes Pages serve everything as-is either way.

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
