// koi.js — procedurally generated koi. Every koi rolls random traits at
// birth (base color, pattern, spots, size). It uses the same detailed
// sprite pipeline as the other fish (outline + shading + baked fins), so
// Koi just builds a config and lets Fish handle drawing.

function makeKoiPattern() {
  const styleRoll = Math.random();
  let base, spots = [];
  const bw = randInt(18, 26);
  const bh = Math.round(bw * 0.55);

  const spotColorsFor = (baseColor) => {
    if (isLight(baseColor)) return ['#ff7b3d', '#e34b4b', '#2b2b2b'];
    if (baseColor === '#2b2b2b') return ['#ff7b3d', '#f6f2e9', '#e34b4b'];
    return ['#f6f2e9', '#2b2b2b'];
  };

  const addBlobs = (n, rMin, rMax, colors) => {
    for (let i = 0; i < n; i++) {
      spots.push({
        cx: rand(bw * 0.15, bw * 0.85),
        cy: rand(bh * 0.15, bh * 0.85),
        r: rand(rMin, rMax),
        color: pick(colors),
      });
    }
  };

  if (styleRoll < 0.2) {
    base = pick(PALETTE.koiBase);                                // solid
  } else if (styleRoll < 0.55) {
    base = '#f6f2e9';                                            // kohaku two-tone
    addBlobs(randInt(2, 3), bh * 0.28, bh * 0.42, ['#ff7b3d', '#e34b4b']);
  } else if (styleRoll < 0.8) {
    base = '#f6f2e9';                                            // calico
    addBlobs(randInt(3, 5), bh * 0.18, bh * 0.34, ['#ff7b3d', '#2b2b2b', '#e34b4b']);
  } else {
    base = pick(['#ff7b3d', '#ffd23f', '#f6f2e9']);             // speckled
    addBlobs(randInt(8, 14), 0.8, 1.8, spotColorsFor(base));
  }
  return { base, spots, bw, bh };
}

class Koi extends Fish {
  constructor(x, y) {
    super(x, y);
    this.type = 'koi';
    const p = makeKoiPattern();
    const cfg = {
      bw: p.bw, bh: p.bh, base: p.base, spots: p.spots,
      dorsal: 0.32, ventral: 0.16,
      finColor: shade(p.base, 0.28), tailColor: p.base,
      tailLen: 0.42, tailH: 0.72, outline: OUTLINE,
    };
    const gfx = buildFishGraphics(cfg);
    this.bodyCvs = gfx.body; this.tailCvs = gfx.tail;
    this.bw = p.bw; this.bh = p.bh; this.baseColor = p.base;
    this.radius = this.bw * 0.45;
    this.maxSpeed = rand(22, 34);
    this.tailLen = 0.42; this.dorsal = 0.32; this.ventral = 0.16;
  }
}
