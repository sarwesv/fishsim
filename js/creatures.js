// creatures.js — base Creature + Shrimp / Snail / Crab.
// Koi lives in koi.js (it extends Creature). Plants live in plants.js.
//
// Motion model: each frame we accumulate forces (ax,ay) from steering +
// separation, then integrate into velocity/position. Rendering is chunky
// because the whole canvas backing store is low-res and upscaled.

const MAX_DT = 0.05;

class Creature {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.ax = 0; this.ay = 0;
    this.radius = 6;
    this.maxSpeed = 30;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.animT = Math.random() * 10;
    this.scale = 1;                     // GSAP animates this for spawn/delete pops
    this.selected = false;
    this.onFloor = false;
    this.type = 'creature';
    this.tx = x; this.ty = y;          // wander target
    this.retarget = 0;
  }

  force(fx, fy) { this.ax += fx; this.ay += fy; }

  // Steer toward a point, boids-style (desired - velocity).
  seek(px, py, weight) {
    const dx = px - this.x, dy = py - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const dvx = (dx / d) * this.maxSpeed;
    const dvy = (dy / d) * this.maxSpeed;
    this.force((dvx - this.vx) * weight, (dvy - this.vy) * weight);
  }

  wander(dt, tank) {
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = rand(1.5, 4);
      this.tx = rand(tank.wallL, tank.wallR);
      this.ty = rand(tank.waterTop, tank.gravelTop - 4);
    }
    this.seek(this.tx, this.ty, 0.6);
  }

  // Keep swimmers away from the walls / surface / gravel.
  avoidBounds(tank) {
    const m = 14;
    if (this.x < tank.wallL + m) this.force((tank.wallL + m - this.x) * 1.5, 0);
    if (this.x > tank.wallR - m) this.force((tank.wallR - m - this.x) * 1.5, 0);
    if (this.y < tank.waterTop + m) this.force(0, (tank.waterTop + m - this.y) * 1.5);
    if (this.y > tank.gravelTop - m) this.force(0, (tank.gravelTop - m - this.y) * 1.5);
  }

  integrate(dt, tank) {
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > this.maxSpeed) {
      this.vx = (this.vx / sp) * this.maxSpeed;
      this.vy = (this.vy / sp) * this.maxSpeed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.onFloor) {
      this.y = this.floorY;
      this.vy = 0;
      if (this.x < tank.wallL) { this.x = tank.wallL; this.vx = Math.abs(this.vx); }
      if (this.x > tank.wallR) { this.x = tank.wallR; this.vx = -Math.abs(this.vx); }
    } else {
      // soft clamp inside water
      if (this.x < tank.wallL) { this.x = tank.wallL; this.vx *= -0.4; }
      if (this.x > tank.wallR) { this.x = tank.wallR; this.vx *= -0.4; }
      if (this.y < tank.waterTop) { this.y = tank.waterTop; this.vy *= -0.4; }
      if (this.y > tank.gravelTop - 2) { this.y = tank.gravelTop - 2; this.vy *= -0.4; }
    }

    if (Math.abs(this.vx) > 1) this.dir = this.vx > 0 ? 1 : -1;
    this.animT += dt;
    this.ax = 0; this.ay = 0;
  }

  hit(px, py) {
    return Math.hypot(px - this.x, py - this.y) <= this.radius + 3;
  }

  drawSelection(ctx) {
    if (!this.selected) return;
    const pulse = (window.SELPULSE && window.SELPULSE.v) || 0;
    ctx.strokeStyle = '#ffe066';
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 3 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ---- Shrimp: quick little darts in mid/low water ----
class Shrimp extends Creature {
  constructor(x, y) {
    super(x, y);
    this.type = 'shrimp';
    this.radius = 5;
    this.maxSpeed = 46;
    this.dartT = 0;
  }
  steer(dt, tank) {
    this.dartT -= dt;
    if (this.dartT <= 0) {
      this.dartT = rand(0.8, 2.2);
      const ang = rand(0, Math.PI * 2);
      const power = rand(20, 40);
      this.force(Math.cos(ang) * power * 8, (Math.sin(ang) * power - 10) * 8);
    }
    this.vx *= 0.96; this.vy *= 0.96; // drag between darts
    this.avoidBounds(tank);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * this.scale, this.scale);
    const bob = Math.sin(this.animT * 12) * 0.6;
    ctx.fillStyle = PALETTE.shrimpBody;
    // curved body
    ctx.beginPath();
    ctx.ellipse(0, bob, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // tail fan
    ctx.fillStyle = PALETTE.shrimpDark;
    ctx.beginPath();
    ctx.moveTo(-4, bob);
    ctx.lineTo(-8, bob - 3);
    ctx.lineTo(-8, bob + 3);
    ctx.closePath();
    ctx.fill();
    // eye + antennae
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(3, bob - 2, 1, 1);
    ctx.strokeStyle = PALETTE.shrimpDark;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(4, bob - 1); ctx.lineTo(9, bob - 4 + Math.sin(this.animT * 6));
    ctx.stroke();
    ctx.restore();
    this.drawSelection(ctx);
  }
}

// ---- Snail: crawls slowly along the gravel ----
class Snail extends Creature {
  constructor(x, y, floorY) {
    super(x, floorY);
    this.type = 'snail';
    this.onFloor = true;
    this.floorY = floorY;
    this.radius = 5;
    this.maxSpeed = 6;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.turnT = rand(4, 9);
  }
  steer(dt, tank) {
    this.turnT -= dt;
    if (this.turnT <= 0) { this.turnT = rand(4, 9); this.dir *= -1; }
    this.force(this.dir * 40, 0);
    this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 2);
    ctx.scale(this.dir * this.scale, this.scale);
    // foot
    ctx.fillStyle = PALETTE.snailBody;
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // head + eyestalks
    const wob = Math.sin(this.animT * 4) * 0.5;
    ctx.beginPath();
    ctx.ellipse(5, 1, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.snailBody;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(7 + wob, -3);
    ctx.stroke();
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(7 + wob - 0.5, -3.5, 1, 1);
    // shell (spiral)
    ctx.fillStyle = PALETTE.snailShell;
    ctx.beginPath();
    ctx.arc(-1, -1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.snailShellDark;
    ctx.beginPath();
    ctx.arc(-1, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.snailShell;
    ctx.beginPath();
    ctx.arc(-1, -1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawSelection(ctx);
  }
}

// ---- Crab: scuttles sideways along the floor ----
class Crab extends Creature {
  constructor(x, y, floorY) {
    super(x, floorY);
    this.type = 'crab';
    this.onFloor = true;
    this.floorY = floorY;
    this.radius = 6;
    this.maxSpeed = 20;
    this.moveDir = Math.random() < 0.5 ? 1 : -1;
    this.turnT = rand(2, 5);
  }
  steer(dt, tank) {
    this.turnT -= dt;
    if (this.turnT <= 0) { this.turnT = rand(2, 5); this.moveDir *= -1; }
    this.force(this.moveDir * 120, 0);
    this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 3);
    ctx.scale(this.scale, this.scale);
    const step = Math.sin(this.animT * 10);
    // legs
    ctx.strokeStyle = PALETTE.crabDark;
    ctx.lineWidth = 0.9;
    for (let i = -1; i <= 1; i++) {
      const lx = i * 3;
      ctx.beginPath();
      ctx.moveTo(lx, 1);
      ctx.lineTo(lx - 4, 3 + (i % 2 ? step : -step));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, 1);
      ctx.lineTo(lx + 4, 3 + (i % 2 ? -step : step));
      ctx.stroke();
    }
    // body
    ctx.fillStyle = PALETTE.crabBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.crabLight;
    ctx.beginPath();
    ctx.ellipse(0, -1, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // claws
    ctx.fillStyle = PALETTE.crabBody;
    ctx.beginPath(); ctx.ellipse(-7, 0, 2.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, 0, 2.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = '#20232a';
    ctx.fillRect(-2, -3, 1, 1);
    ctx.fillRect(1, -3, 1, 1);
    ctx.restore();
    this.drawSelection(ctx);
  }
}
