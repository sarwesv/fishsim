// fish.js — shared Fish base (swim + bubbles + pointer curiosity) plus a
// config-driven FinFish for every non-koi species. Sprites are detailed
// pixel art: a shaded body silhouette with baked dorsal/anal fins and an
// eye, wrapped in a 1px dark outline, plus a separate outlined tail that
// flaps. Koi (koi.js) also extends Fish and uses the same pipeline.

const OUTLINE = '#141b26';

class Fish extends Creature {
  constructor(x, y) {
    super(x, y);
    this.isFish = true;
    this.curious = 0;
    this.bubbleT = rand(2, 7);
    this.tailLen = 0.35; this.dorsal = 0.2; this.ventral = 0.15;
  }

  steer(dt, tank) {
    if (this.curious > 0) {
      this.curious -= dt;
      const p = tank.pointer;
      if (p.active && tank.isSwimmable(p.x, p.y)) {
        this.seek(p.x, p.y, 0.9);
        this.avoidBounds(tank);
        this.maybeBubble(dt, tank);
        return;
      }
      this.curious = 0;
    }
    this.wander(dt, tank);
    this.avoidBounds(tank);
    this.maybeBubble(dt, tank);
  }

  maybeBubble(dt, tank) {
    this.bubbleT -= dt;
    if (this.bubbleT <= 0) {
      this.bubbleT = rand(3, 9);
      tank.addBubble(this.x + this.dir * (this.bw / 2), this.y - 1);
    }
  }

  draw(ctx) {
    const bw = this.bw, bh = this.bh;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * this.scale, this.scale);

    // flapping tail behind the body — vertical squash keeps pixels crisp
    const tc = this.tailCvs;
    const wag = 0.82 + 0.18 * Math.sin(this.animT * 7);
    const th = tc.height * wag;
    const swish = Math.sin(this.animT * 7) * (bh * 0.06);
    ctx.drawImage(tc, -bw / 2 - tc.width + 1, -th / 2 + swish, tc.width, th);

    // body (centered)
    const bc = this.bodyCvs;
    ctx.drawImage(bc, -bc.width / 2, -bc.height / 2);
    ctx.restore();

    if (this.selected) {
      const pulse = (window.SELPULSE && window.SELPULSE.v) || 0;
      ctx.strokeStyle = '#ffe066';
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, bw * 0.75 + pulse * 2, bh * 0.95 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// --- sprite painting helpers ---

// Wrap every opaque region in a 1px outline (read once so it never chains).
function addOutline(cvs, g, color) {
  const w = cvs.width, h = cvs.height;
  const d = g.getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] === 0 &&
          (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) {
        g.fillRect(x, y, 1, 1);
      }
    }
  }
}

// Local body color from the species pattern (koi uses spot blobs).
function patternColorAt(cfg, x, patY) {
  const bw = cfg.bw, bh = cfg.bh, mid = (bh - 1) / 2;
  if (cfg.spots) {
    let c = cfg.base;
    for (const s of cfg.spots) if (Math.hypot(x - s.cx, patY - s.cy) <= s.r) c = s.color;
    return c;
  }
  const stripeGap = Math.max(3, Math.round(bw / 4));
  const b = x / bw;
  switch (cfg.pattern) {
    case 'belly': return patY - mid > bh * 0.08 ? cfg.accent : cfg.base;
    case 'stripes': return x % stripeGap < 2 ? cfg.accent : cfg.base;
    case 'rear': return x < bw * 0.42 ? cfg.accent : cfg.base;
    case 'front': return x > bw * 0.55 ? cfg.accent : cfg.base;
    case 'top': return patY < mid - bh * 0.05 ? cfg.accent : cfg.base;
    case 'spot': return Math.hypot(x - bw * 0.3, patY - mid) <= bh * 0.26 ? cfg.accent : cfg.base;
    case 'bands':
      return ((b > 0.16 && b < 0.28) || (b > 0.46 && b < 0.58) || (b > 0.78 && b < 0.88)) ? cfg.accent : cfg.base;
    default: return cfg.base;
  }
}

// Pattern color + top-light / belly-shadow volume shading.
function shadedColor(cfg, x, yBody) {
  let c = patternColorAt(cfg, x, yBody + (cfg.bh - 1) / 2);
  const rel = yBody / (cfg.bh / 2);
  if (rel < -0.45) c = shade(c, 0.16);
  else if (rel > 0.5) c = shade(c, -0.18);
  return c;
}

function buildDetailedFish(cfg) {
  const bw = cfg.bw, bh = cfg.bh, half = bw / 2;
  const topPad = Math.ceil(bh * cfg.dorsal) + 1;
  const botPad = Math.ceil(bh * cfg.ventral) + 1;
  const W = bw + 2, H = bh + topPad + botPad;
  const midY = topPad + (bh - 1) / 2;

  const dorsal = new Array(bw).fill(0);
  const dS = Math.floor(bw * 0.26), dE = Math.floor(bw * 0.64);
  for (let x = dS; x <= dE; x++) dorsal[x] = Math.sin(((x - dS) / Math.max(1, dE - dS)) * Math.PI) * (bh * cfg.dorsal);
  const anal = new Array(bw).fill(0);
  const aS = Math.floor(bw * 0.16), aE = Math.floor(bw * 0.46);
  for (let x = aS; x <= aE; x++) anal[x] = Math.sin(((x - aS) / Math.max(1, aE - aS)) * Math.PI) * (bh * cfg.ventral);

  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d');

  for (let x = 0; x < bw; x++) {
    const nx = (x - (bw - 1) / 2) / half;
    const hy = (bh / 2) * Math.sqrt(Math.max(0, 1 - nx * nx));
    const bodyTop = Math.round(midY - hy), bodyBot = Math.round(midY + hy);
    const t = Math.round(midY - hy - dorsal[x]);
    const b = Math.round(midY + hy + anal[x]);
    for (let y = t; y <= b; y++) {
      const color = (y < bodyTop || y > bodyBot) ? cfg.finColor : shadedColor(cfg, x, y - midY);
      g.fillStyle = color;
      g.fillRect(x + 1, y, 1, 1);
    }
  }

  // pectoral fin hint (a few darker pixels on the near side)
  g.fillStyle = shade(cfg.base, -0.22);
  const pfx = Math.round(bw * 0.56) + 1, pfy = Math.round(midY + bh * 0.16);
  g.fillRect(pfx, pfy, 2, 1);
  g.fillRect(pfx - 1, pfy + 1, 3, 1);

  // eye near the front
  const ex = Math.round(bw - 3.5) + 1, ey = Math.round(midY - bh * 0.2);
  g.fillStyle = '#f6f2e9'; g.fillRect(ex, ey, 2, 2);
  g.fillStyle = '#141b26'; g.fillRect(ex + 1, ey, 1, 1);

  addOutline(cvs, g, cfg.outline || OUTLINE);
  return cvs;
}

function buildTail(cfg) {
  const bw = cfg.bw, bh = cfg.bh;
  const TW = Math.max(4, Math.round(bw * cfg.tailLen));
  const maxH = bh * cfg.tailH;
  const W = TW + 2, H = Math.ceil(maxH) + 2, midY = (H - 1) / 2;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d');

  for (let i = 0; i < TW; i++) {
    const t = 1 - i / Math.max(1, TW - 1);       // 1 = outer (wide), 0 = attach
    const spread = Math.max(1, (maxH / 2) * (0.35 + 0.65 * t));
    for (let y = Math.round(midY - spread); y <= Math.round(midY + spread); y++) {
      const rely = (y - midY) / spread;
      const color = Math.abs(rely) > 0.6 ? shade(cfg.tailColor, -0.14) : cfg.tailColor;
      g.fillStyle = color;
      g.fillRect(i + 1, y, 1, 1);
    }
  }
  addOutline(cvs, g, cfg.outline || OUTLINE);
  return cvs;
}

function buildFishGraphics(cfg) {
  return { body: buildDetailedFish(cfg), tail: buildTail(cfg) };
}

// Every fish species. `water` is 'fresh' or 'salt' (the tank won't mix them).
const FISH_SPECIES = {
  // ---------- freshwater ----------
  tetra: {
    label: 'Neon Tetra', water: 'fresh', minLen: 12, maxLen: 16, bhRatio: 0.5,
    base: ['#5fc7e0', '#4fb0d8', '#6ad0c0'], accent: '#e8433f', pattern: 'rear',
    tailLen: 0.3, tailH: 0.6, dorsal: 0.28, ventral: 0.22,
    finColor: 'light', tailColor: 'light', speedMin: 26, speedMax: 40,
  },
  goldfish: {
    label: 'Goldfish', water: 'fresh', minLen: 16, maxLen: 20, bhRatio: 0.62,
    base: '#ff8a3d', accent: '#ffd23f', pattern: 'belly',
    tailLen: 0.45, tailH: 1.0, dorsal: 0.42, ventral: 0.28,
    finColor: 'light', tailColor: 'base', speedMin: 18, speedMax: 26,
  },
  angelfish: {
    label: 'Angelfish', water: 'fresh', minLen: 15, maxLen: 19, bhRatio: 0.95,
    base: ['#f2f2f2', '#ffd23f', '#f0c27a'], accent: '#2b2b2b', pattern: 'stripes',
    tailLen: 0.34, tailH: 0.8, dorsal: 0.9, ventral: 0.9,
    finColor: 'light', tailColor: 'light', speedMin: 15, speedMax: 23,
  },
  betta: {
    label: 'Betta', water: 'fresh', minLen: 13, maxLen: 17, bhRatio: 0.6,
    base: ['#c0392b', '#7d3cc0', '#2670c0', '#c0398f'], accent: 'shade', pattern: 'solid',
    tailLen: 0.62, tailH: 1.15, dorsal: 0.6, ventral: 0.6,
    finColor: 'light', tailColor: 'base', speedMin: 15, speedMax: 23,
  },
  guppy: {
    label: 'Guppy', water: 'fresh', minLen: 10, maxLen: 14, bhRatio: 0.55,
    base: ['#ffd23f', '#ff7bd0', '#7bffb0', '#ff9e3d', '#8ad0ff'], accent: 'shade', pattern: 'spot',
    tailLen: 0.55, tailH: 1.0, dorsal: 0.3, ventral: 0.24,
    finColor: 'light', tailColor: 'base', speedMin: 24, speedMax: 34,
  },
  discus: {
    label: 'Discus', water: 'fresh', minLen: 16, maxLen: 20, bhRatio: 0.98,
    base: ['#e8622a', '#3aa0c0', '#d0a23a'], accent: 'shade', pattern: 'stripes',
    tailLen: 0.3, tailH: 0.55, dorsal: 0.5, ventral: 0.5,
    finColor: 'light', tailColor: 'base', speedMin: 14, speedMax: 20,
  },
  molly: {
    label: 'Molly', water: 'fresh', minLen: 12, maxLen: 16, bhRatio: 0.56,
    base: ['#2b2b2b', '#d0d0d0', '#f0b03a'], accent: 'shade', pattern: 'solid',
    tailLen: 0.4, tailH: 0.8, dorsal: 0.3, ventral: 0.2,
    finColor: 'light', tailColor: 'base', speedMin: 18, speedMax: 26,
  },
  barb: {
    label: 'Tiger Barb', water: 'fresh', minLen: 13, maxLen: 17, bhRatio: 0.62,
    base: '#e8a53a', accent: '#2b2b2b', pattern: 'stripes',
    tailLen: 0.38, tailH: 0.8, dorsal: 0.3, ventral: 0.22,
    finColor: '#e8622a', tailColor: '#e8622a', speedMin: 22, speedMax: 32,
  },
  gourami: {
    label: 'Gourami', water: 'fresh', minLen: 15, maxLen: 19, bhRatio: 0.64,
    base: ['#6fb0d0', '#c0a0d0', '#e0b060'], accent: 'light', pattern: 'spot',
    tailLen: 0.4, tailH: 0.85, dorsal: 0.35, ventral: 0.3,
    finColor: 'light', tailColor: 'base', speedMin: 16, speedMax: 24,
  },
  platy: {
    label: 'Platy', water: 'fresh', minLen: 11, maxLen: 14, bhRatio: 0.58,
    base: ['#ff6a3d', '#ffb03d', '#e8433f'], accent: 'shade', pattern: 'solid',
    tailLen: 0.36, tailH: 0.75, dorsal: 0.28, ventral: 0.2,
    finColor: 'light', tailColor: 'base', speedMin: 20, speedMax: 30,
  },

  // ---------- saltwater ----------
  clownfish: {
    label: 'Clownfish', water: 'salt', minLen: 13, maxLen: 17, bhRatio: 0.6,
    base: '#ff7b3d', accent: '#f6f2e9', pattern: 'bands',
    tailLen: 0.36, tailH: 0.8, dorsal: 0.32, ventral: 0.24,
    finColor: '#ff7b3d', tailColor: '#ff7b3d', speedMin: 18, speedMax: 26,
  },
  blue_tang: {
    label: 'Blue Tang', water: 'salt', minLen: 15, maxLen: 19, bhRatio: 0.68,
    base: '#2a6fd0', accent: '#141b26', pattern: 'top',
    tailLen: 0.36, tailH: 0.8, dorsal: 0.4, ventral: 0.3,
    finColor: '#2a6fd0', tailColor: '#ffd23f', speedMin: 18, speedMax: 26,
  },
  yellow_tang: {
    label: 'Yellow Tang', water: 'salt', minLen: 15, maxLen: 19, bhRatio: 0.85,
    base: '#ffd23f', accent: 'shade', pattern: 'solid',
    tailLen: 0.34, tailH: 0.7, dorsal: 0.55, ventral: 0.55,
    finColor: 'light', tailColor: 'base', speedMin: 16, speedMax: 24,
  },
  damsel: {
    label: 'Damselfish', water: 'salt', minLen: 11, maxLen: 15, bhRatio: 0.58,
    base: ['#2a86c4', '#3a5fd0'], accent: 'light', pattern: 'solid',
    tailLen: 0.36, tailH: 0.75, dorsal: 0.3, ventral: 0.22,
    finColor: 'light', tailColor: 'base', speedMin: 24, speedMax: 34,
  },
  royal_gramma: {
    label: 'Royal Gramma', water: 'salt', minLen: 12, maxLen: 16, bhRatio: 0.56,
    base: '#ffd23f', accent: '#8e44ad', pattern: 'front',
    tailLen: 0.36, tailH: 0.75, dorsal: 0.3, ventral: 0.24,
    finColor: 'light', tailColor: 'base', speedMin: 20, speedMax: 28,
  },
  butterflyfish: {
    label: 'Butterflyfish', water: 'salt', minLen: 14, maxLen: 18, bhRatio: 0.82,
    base: '#f6f2e9', accent: '#ffd23f', pattern: 'stripes',
    tailLen: 0.32, tailH: 0.7, dorsal: 0.45, ventral: 0.45,
    finColor: '#ffd23f', tailColor: '#ffd23f', speedMin: 16, speedMax: 24,
  },
  puffer: {
    label: 'Pufferfish', water: 'salt', minLen: 14, maxLen: 18, bhRatio: 0.8,
    base: '#d9b06a', accent: '#7a5a2a', pattern: 'spot',
    tailLen: 0.3, tailH: 0.6, dorsal: 0.3, ventral: 0.28,
    finColor: 'light', tailColor: 'base', speedMin: 12, speedMax: 18,
  },
  lionfish: {
    label: 'Lionfish', water: 'salt', minLen: 14, maxLen: 18, bhRatio: 0.66,
    base: '#c0392b', accent: '#f6f2e9', pattern: 'stripes',
    tailLen: 0.4, tailH: 0.9, dorsal: 0.85, ventral: 0.7,
    finColor: '#e8d0c0', tailColor: '#d9b0a0', speedMin: 13, speedMax: 20,
  },
  wrasse: {
    label: 'Wrasse', water: 'salt', minLen: 13, maxLen: 17, bhRatio: 0.5,
    base: '#2aa06a', accent: '#ffd23f', pattern: 'rear',
    tailLen: 0.36, tailH: 0.7, dorsal: 0.28, ventral: 0.2,
    finColor: 'light', tailColor: 'base', speedMin: 24, speedMax: 34,
  },
};

// resolve a color token ('base'/'light'/'dark') against the rolled base color
function finToken(tok, base) {
  if (tok === 'base') return base;
  if (tok === 'light') return shade(base, 0.3);
  if (tok === 'dark') return shade(base, -0.3);
  return tok;
}

class FinFish extends Fish {
  constructor(species, x, y) {
    super(x, y);
    const s = FISH_SPECIES[species];
    this.type = species;
    const bw = randInt(s.minLen, s.maxLen);
    const bh = Math.round(bw * s.bhRatio);
    const base = Array.isArray(s.base) ? pick(s.base) : s.base;
    const accent = s.accent === 'shade' ? shade(base, -0.4)
      : (Array.isArray(s.accent) ? pick(s.accent) : s.accent);
    const cfg = {
      bw, bh, base, accent, pattern: s.pattern,
      dorsal: s.dorsal, ventral: s.ventral,
      finColor: finToken(s.finColor, base), tailColor: finToken(s.tailColor, base),
      tailLen: s.tailLen, tailH: s.tailH, outline: OUTLINE,
    };
    const gfx = buildFishGraphics(cfg);
    this.bodyCvs = gfx.body; this.tailCvs = gfx.tail;
    this.bw = bw; this.bh = bh; this.baseColor = base;
    this.radius = bw * 0.45;
    this.maxSpeed = rand(s.speedMin, s.speedMax);
    this.tailLen = s.tailLen; this.dorsal = s.dorsal; this.ventral = s.ventral;
  }
}
