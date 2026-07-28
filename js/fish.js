// fish.js — shared Fish base (swim + bubbles + pointer curiosity) plus a
// config-driven FinFish used for every non-koi species. Koi (koi.js) also
// extends Fish so all fish share the same behavior and can be curious.

class Fish extends Creature {
  constructor(x, y) {
    super(x, y);
    this.isFish = true;
    this.curious = 0;          // seconds of remaining curiosity
    this.bubbleT = rand(2, 7);
    // sensible fin defaults; species/koi override
    this.tailLen = 0.3; this.tailH = 0.5;
    this.dorsal = 0; this.ventral = 0;
    this.finColor = 'rgba(255,255,255,0.35)';
    this.tailColor = null;
  }

  steer(dt, tank) {
    // Occasionally follow the pointer, but only if it's swimmable water.
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

  // Generic fish rendering: wagging tail, dorsal/ventral fins, cached body.
  draw(ctx) {
    const bw = this.bw, bh = this.bh;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * this.scale, this.scale);

    const wag = Math.sin(this.animT * 7) * (bh * 0.5);
    const tx = -bw / 2;
    const tl = bw * this.tailLen, th = bh * this.tailH;

    // tail
    ctx.fillStyle = this.tailColor || this.finColor;
    ctx.beginPath();
    ctx.moveTo(tx + 1, 0);
    ctx.lineTo(tx - tl, -th + wag);
    ctx.lineTo(tx - tl, th + wag);
    ctx.closePath();
    ctx.fill();

    // dorsal fin (top)
    if (this.dorsal > 0) {
      const dh = bh * this.dorsal;
      ctx.fillStyle = this.finColor;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.22, -bh * 0.45);
      ctx.lineTo(bw * 0.04, -bh * 0.45 - dh);
      ctx.lineTo(bw * 0.22, -bh * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    // ventral fin (bottom)
    if (this.ventral > 0) {
      const vh = bh * this.ventral;
      ctx.fillStyle = this.finColor;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.22, bh * 0.45);
      ctx.lineTo(bw * 0.04, bh * 0.45 + vh);
      ctx.lineTo(bw * 0.22, bh * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    ctx.drawImage(this.body, -bw / 2, -bh / 2);
    ctx.restore();

    if (this.selected) {
      const pulse = (window.SELPULSE && window.SELPULSE.v) || 0;
      ctx.strokeStyle = '#ffe066';
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, bw * 0.7 + pulse * 2, bh * 0.9 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// Paint a fish body (ellipse silhouette + pattern) once onto an offscreen
// canvas. Crisp 1px cells, same technique as the koi.
function buildFishBody(cfg) {
  const { bw, bh, base, accent, pattern } = cfg;
  const cvs = document.createElement('canvas');
  cvs.width = bw; cvs.height = bh;
  const g = cvs.getContext('2d');
  const midY = (bh - 1) / 2;
  const half = bw / 2;
  const stripeGap = Math.max(3, Math.round(bw / 4));

  for (let x = 0; x < bw; x++) {
    const nx = (x - (bw - 1) / 2) / half;
    const hy = (bh / 2) * Math.sqrt(Math.max(0, 1 - nx * nx));
    const top = Math.round(midY - hy);
    const bot = Math.round(midY + hy);
    for (let y = top; y <= bot; y++) {
      let color = base;
      switch (pattern) {
        case 'belly': if (y - midY > hy * 0.15) color = accent; break;
        case 'stripes': if (x % stripeGap < 2) color = accent; break;
        case 'rear': if (x < bw * 0.42) color = accent; break;
        case 'spot': if (Math.hypot(x - bw * 0.3, y - midY) <= bh * 0.26) color = accent; break;
      }
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  }
  // eye near the front (right side)
  const ex = Math.round(bw - 3.5);
  g.fillStyle = isLight(base) ? '#20232a' : '#f6f2e9';
  g.fillRect(ex, Math.round(midY - 1), 1, 1);
  return cvs;
}

const FISH_SPECIES = {
  tetra: {
    label: 'Tetra', minLen: 12, maxLen: 16, bhRatio: 0.5,
    base: ['#5fc7e0', '#4fb0d8', '#6ad0c0'], accent: '#e8433f', pattern: 'rear',
    tailLen: 0.28, tailH: 0.55, dorsal: 0.15, ventral: 0.12,
    finColor: 'rgba(220,240,255,0.5)', tailColor: 'rgba(220,240,255,0.6)',
    speedMin: 26, speedMax: 40,
  },
  goldfish: {
    label: 'Goldfish', minLen: 16, maxLen: 20, bhRatio: 0.62,
    base: '#ff8a3d', accent: '#ffd23f', pattern: 'belly',
    tailLen: 0.42, tailH: 0.95, dorsal: 0.3, ventral: 0.2,
    finColor: 'rgba(255,150,80,0.7)', tailColor: 'base',
    speedMin: 18, speedMax: 26,
  },
  angelfish: {
    label: 'Angelfish', minLen: 15, maxLen: 19, bhRatio: 0.95,
    base: ['#f2f2f2', '#ffd23f', '#f0c27a'], accent: '#2b2b2b', pattern: 'stripes',
    tailLen: 0.32, tailH: 0.7, dorsal: 0.85, ventral: 0.85,
    finColor: 'rgba(245,245,245,0.55)', tailColor: 'rgba(245,245,245,0.55)',
    speedMin: 15, speedMax: 23,
  },
  betta: {
    label: 'Betta', minLen: 13, maxLen: 17, bhRatio: 0.6,
    base: ['#c0392b', '#7d3cc0', '#2670c0', '#c0398f'], accent: 'shade', pattern: 'solid',
    tailLen: 0.6, tailH: 1.05, dorsal: 0.5, ventral: 0.5,
    finColor: 'base', tailColor: 'base',
    speedMin: 15, speedMax: 23,
  },
  guppy: {
    label: 'Guppy', minLen: 10, maxLen: 14, bhRatio: 0.55,
    base: ['#ffd23f', '#ff7bd0', '#7bffb0', '#ff9e3d', '#8ad0ff'], accent: 'shade', pattern: 'spot',
    tailLen: 0.5, tailH: 0.9, dorsal: 0.2, ventral: 0.15,
    finColor: 'rgba(255,255,255,0.5)', tailColor: 'base',
    speedMin: 24, speedMax: 34,
  },
};

class FinFish extends Fish {
  constructor(species, x, y) {
    super(x, y);
    const s = FISH_SPECIES[species];
    this.type = species;
    const bw = randInt(s.minLen, s.maxLen);
    const bh = Math.round(bw * s.bhRatio);
    const base = Array.isArray(s.base) ? pick(s.base) : s.base;
    const accent = s.accent === 'shade' ? shade(base, -0.35)
      : (Array.isArray(s.accent) ? pick(s.accent) : s.accent);
    this.body = buildFishBody({ bw, bh, base, accent, pattern: s.pattern });
    this.bw = bw; this.bh = bh;
    this.baseColor = base;
    this.radius = bw * 0.45;
    this.maxSpeed = rand(s.speedMin, s.speedMax);
    this.tailLen = s.tailLen; this.tailH = s.tailH;
    this.dorsal = s.dorsal; this.ventral = s.ventral;
    this.finColor = s.finColor === 'base' ? base : s.finColor;
    this.tailColor = s.tailColor === 'base' ? base : s.tailColor;
  }
}
