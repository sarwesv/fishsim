// koi.js — procedurally generated koi. Every koi rolls random traits at
// birth (base color, pattern, spots, size, fins) and its body is painted
// once onto a cached offscreen canvas. The tail wags live each frame.

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
    // solid
    base = pick(PALETTE.koiBase);
  } else if (styleRoll < 0.55) {
    // kohaku two-tone
    base = '#f6f2e9';
    addBlobs(randInt(2, 3), bh * 0.28, bh * 0.42, ['#ff7b3d', '#e34b4b']);
  } else if (styleRoll < 0.8) {
    // calico
    base = '#f6f2e9';
    addBlobs(randInt(3, 5), bh * 0.18, bh * 0.34, ['#ff7b3d', '#2b2b2b', '#e34b4b']);
  } else {
    // speckled
    base = pick(['#ff7b3d', '#ffd23f', '#f6f2e9']);
    addBlobs(randInt(8, 14), 0.8, 1.8, spotColorsFor(base));
  }
  return { base, spots, bw, bh, finColor: PALETTE.finLight };
}

function buildKoiBody(p) {
  const cvs = document.createElement('canvas');
  cvs.width = p.bw; cvs.height = p.bh;
  const g = cvs.getContext('2d');
  const midY = (p.bh - 1) / 2;
  const halfLen = p.bw / 2;

  for (let x = 0; x < p.bw; x++) {
    const nx = (x - (p.bw - 1) / 2) / halfLen; // -1..1
    const hy = (p.bh / 2) * Math.sqrt(Math.max(0, 1 - nx * nx));
    const top = Math.round(midY - hy);
    const bot = Math.round(midY + hy);
    for (let y = top; y <= bot; y++) {
      let color = p.base;
      for (const s of p.spots) {
        if (Math.hypot(x - s.cx, y - s.cy) <= s.r) color = s.color;
      }
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  }
  // eye near the front (right side)
  const ex = p.bw - 4;
  g.fillStyle = isLight(p.base) ? '#2b2b2b' : '#f6f2e9';
  g.fillRect(ex, Math.round(midY - 1), 1, 1);
  return cvs;
}

// Koi extends Fish so it shares swimming, bubbles and pointer curiosity;
// it only overrides construction (procedural pattern) and drawing.
class Koi extends Fish {
  constructor(x, y) {
    super(x, y);
    this.type = 'koi';
    this.pattern = makeKoiPattern();
    this.body = buildKoiBody(this.pattern);
    this.bw = this.pattern.bw;
    this.bh = this.pattern.bh;
    this.radius = this.bw * 0.45;
    this.maxSpeed = rand(22, 34);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * this.scale, this.scale);

    // animated tail at the back (left in local space)
    const wag = Math.sin(this.animT * 7) * (this.bh * 0.5);
    const tx = -this.bw / 2;
    ctx.fillStyle = this.pattern.base;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx - this.bw * 0.32, -this.bh * 0.5 + wag);
    ctx.lineTo(tx - this.bw * 0.32, this.bh * 0.5 + wag);
    ctx.closePath();
    ctx.fill();

    // top + bottom fins (subtle)
    ctx.fillStyle = this.pattern.finColor;
    const fw = Math.sin(this.animT * 5) * 1;
    ctx.beginPath();
    ctx.moveTo(-1, -this.bh / 2);
    ctx.lineTo(3, -this.bh / 2 - 2 - fw);
    ctx.lineTo(5, -this.bh / 2);
    ctx.closePath();
    ctx.fill();

    ctx.drawImage(this.body, -this.bw / 2, -this.bh / 2);
    ctx.restore();

    if (this.selected) {
      const pulse = (window.SELPULSE && window.SELPULSE.v) || 0;
      ctx.strokeStyle = '#ffe066';
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.bw * 0.7 + pulse * 2, this.bh * 0.9 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
