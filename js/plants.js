// plants.js — anchored aquatic plants that sway with the current.
// Not part of collision separation; selectable + deletable like creatures.

class Plant {
  constructor(x, floorY) {
    this.type = 'plant';
    this.x = x;
    this.floorY = floorY;
    this.color = pick(PALETTE.plant);
    this.color2 = shade(this.color, 0.15);
    this.height = rand(0.22, 0.4);   // fraction of tank height, set on build
    this.segs = randInt(4, 7);
    this.phase = rand(0, Math.PI * 2);
    this.width = rand(2.5, 4);
    this.blades = randInt(2, 3);
    this.selected = false;
    this.scale = 1;                 // GSAP animates this for spawn/delete pops
    this.animT = 0;
  }

  update(dt) { this.animT += dt; }

  hit(px, py) {
    const h = this.pxHeight || 40;
    return px > this.x - 8 && px < this.x + 8 && py > this.floorY - h && py < this.floorY + 3;
  }

  draw(ctx, tank) {
    const h = (this.pxHeight = tank.H * this.height * this.scale);
    for (let b = 0; b < this.blades; b++) {
      const off = (b - (this.blades - 1) / 2) * 3;
      ctx.strokeStyle = b % 2 ? this.color2 : this.color;
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let px = this.x + off;
      let py = this.floorY;
      ctx.moveTo(px, py);
      for (let s = 1; s <= this.segs; s++) {
        const t = s / this.segs;
        const sway = Math.sin(this.animT * 1.6 + this.phase + s * 0.6) * (4 * t) + off * (1 - t) * 0.2;
        px = this.x + sway + off * (1 - t);
        py = this.floorY - h * t;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (this.selected) {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 7, this.floorY - h, 14, h + 3);
    }
  }
}
