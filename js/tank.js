// tank.js — the aquarium engine: responsive low-res canvas, water + gravel
// rendering, the animation loop, creature/plant/bubble management, the
// boids-style anti-overlap separation, pointer tracking + curiosity, and
// hit-testing for selection.

const TARGET_H = 200; // logical pixels tall; width follows the aspect ratio

class Tank {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.creatures = [];
    this.plants = [];
    this.bubbles = [];
    this.selected = null;

    this.gravelColor = GRAVEL_COLORS[0];
    this.pebbles = [];

    this.pointer = { x: 0, y: 0, active: false };
    this.curiosityT = rand(3, 7);

    this.waterType = null;      // 'fresh' | 'salt' | null (set by inhabitants)
    this.maxCreatures = 30;     // recomputed on resize from tank size

    this.W = 320; this.H = TARGET_H;
    this.waterTop = 0; this.gravelTop = 0; this.wallL = 4; this.wallR = 316;

    this.last = 0;
    this.running = false;

    // GSAP-driven pulse shared by every selection ring
    window.SELPULSE = { v: 0 };
    gsap.to(window.SELPULSE, { v: 1, duration: 0.65, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    this._bindPointer();
    this.resize();
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const cw = wrap.clientWidth || window.innerWidth;
    const ch = wrap.clientHeight || window.innerHeight;
    this.H = TARGET_H;
    this.W = Math.max(160, Math.round(TARGET_H * (cw / ch)));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx.imageSmoothingEnabled = false;

    this.gravelHeight = Math.max(24, Math.round(this.H * 0.16));
    this.gravelTop = this.H - this.gravelHeight;
    this.waterTop = 2;
    this.wallL = 4;
    this.wallR = this.W - 4;

    // keep floor dwellers / plants on the (possibly moved) gravel line
    for (const c of this.creatures) {
      if (c.onFloor) { c.floorY = this.gravelTop; c.y = this.gravelTop; }
      c.x = Math.min(Math.max(c.x, this.wallL), this.wallR);
    }
    for (const p of this.plants) p.floorY = this.gravelTop;

    // crowding cap scales with the tank's swimmable area
    const area = this.W * (this.gravelTop - this.waterTop);
    this.maxCreatures = Math.max(8, Math.min(60, Math.round(area / 750)));

    this._buildPebbles();
  }

  _buildPebbles() {
    this.pebbles = [];
    const count = Math.round((this.W * this.gravelHeight) / 22);
    for (let i = 0; i < count; i++) {
      this.pebbles.push({
        x: Math.random() * this.W,
        y: this.gravelTop + 2 + Math.random() * (this.gravelHeight - 2),
        s: Math.random() < 0.5 ? 1 : 2,
        d: rand(-0.22, 0.22),
      });
    }
  }

  isSwimmable(x, y) {
    return x > this.wallL && x < this.wallR &&
           y > this.waterTop + 4 && y < this.gravelTop - 3;
  }

  // ---- population ----

  // Is a species allowed right now? Returns { ok } or { ok:false, reason }.
  canSpawn(type) {
    const meta = SPECIES_BY_TYPE[type];
    if (meta && meta.water !== 'both' && this.waterType && this.waterType !== meta.water) {
      return { ok: false, reason: 'water' };
    }
    if (type !== 'plant' && this.creatures.length >= this.maxCreatures) {
      return { ok: false, reason: 'full' };
    }
    return { ok: true };
  }

  // Spawn if allowed, applying water-type + crowding rules.
  trySpawn(type) {
    const check = this.canSpawn(type);
    if (!check.ok) return check;
    const meta = SPECIES_BY_TYPE[type];
    if (meta && meta.water !== 'both' && !this.waterType) this.waterType = meta.water;
    return { ok: true, creature: this.spawn(type) };
  }

  // The tank's water type is whatever its typed (non-'both') inhabitants are.
  refreshWaterType() {
    const typed = this.creatures.find((c) => c.water && c.water !== 'both');
    this.waterType = typed ? typed.water : null;
  }

  spawn(type) {
    let c;
    const x = rand(this.wallL + 10, this.wallR - 10);
    if (type === 'koi') c = new Koi(x, rand(this.waterTop + 20, this.gravelTop - 20));
    else if (FISH_SPECIES[type]) c = new FinFish(type, x, rand(this.waterTop + 18, this.gravelTop - 18));
    else if (type === 'shrimp') c = new Shrimp(x, rand(this.H * 0.4, this.gravelTop - 8));
    else if (type === 'snail') c = new Snail(x, 0, this.gravelTop);
    else if (type === 'crab') c = new Crab(x, 0, this.gravelTop);
    else if (type === 'lobster') c = new Lobster(x, 0, this.gravelTop);
    else if (type === 'octopus') c = new Octopus(x, rand(this.H * 0.55, this.gravelTop - 10));
    else if (type === 'plant') { c = new Plant(x, this.gravelTop); this.plants.push(c); }
    if (c) {
      const meta = SPECIES_BY_TYPE[type];
      c.water = meta ? meta.water : 'both';
      if (c.type !== 'plant') this.creatures.push(c);
      // GSAP spawn pop-in
      c.scale = 0;
      gsap.to(c, { scale: 1, duration: 0.5, ease: 'back.out(2.2)' });
      if (this.onChange) this.onChange();
    }
    return c;
  }

  addBubble(x, y) {
    this.bubbles.push({ x, y, r: rand(0.8, 1.8), vy: rand(14, 26), wob: rand(0, 6) });
  }

  deleteSelected() {
    if (!this.selected) return;
    const t = this.selected;
    this._select(null);
    // GSAP shrink-out, then remove from the sim
    gsap.killTweensOf(t);
    gsap.to(t, {
      scale: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onComplete: () => {
        this.creatures = this.creatures.filter((c) => c !== t);
        this.plants = this.plants.filter((p) => p !== t);
        this.refreshWaterType();
        if (this.onSelect) this.onSelect(null);
      },
    });
  }

  selectAt(x, y) {
    // topmost creature first, then plants
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      if (this.creatures[i].hit(x, y)) return this._select(this.creatures[i]);
    }
    for (let i = this.plants.length - 1; i >= 0; i--) {
      if (this.plants[i].hit(x, y)) return this._select(this.plants[i]);
    }
    this._select(null);
    return null;
  }

  _select(obj) {
    if (this.selected) this.selected.selected = false;
    this.selected = obj;
    if (obj) obj.selected = true;
    if (this.onSelect) this.onSelect(obj);
    return obj;
  }

  // ---- pointer ----
  _bindPointer() {
    const toLogical = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * this.W,
        y: ((e.clientY - r.top) / r.height) * this.H,
      };
    };
    this.canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e);
      this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.active = true;
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.active = true;
      this.selectAt(p.x, p.y);
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') this.pointer.active = false;
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointer.active = false; });
    this.canvas.addEventListener('pointercancel', () => { this.pointer.active = false; });
  }

  // ---- simulation ----
  _separate() {
    const arr = this.creatures;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.radius + b.radius;
        let d = Math.hypot(dx, dy);
        if (d < min && d > 0.001) {
          const push = ((min - d) / min) * 60;
          let nx = dx / d, ny = dy / d;
          if (a.onFloor || b.onFloor) ny = 0; // keep floor dwellers grounded
          a.force(-nx * push, -ny * push);
          b.force(nx * push, ny * push);
        }
      }
    }
  }

  _pickCuriosity(dt) {
    this.curiosityT -= dt;
    if (this.curiosityT > 0) return;
    this.curiosityT = rand(4, 9);
    if (!this.pointer.active || !this.isSwimmable(this.pointer.x, this.pointer.y)) return;
    const fish = this.creatures.filter((c) => c.isFish && c.curious <= 0);
    const n = Math.min(fish.length, randInt(1, 2));
    for (let i = 0; i < n; i++) {
      const k = fish.splice(randInt(0, fish.length - 1), 1)[0];
      if (k) {
        k.curious = rand(3, 6);
        // GSAP "notice" bounce
        gsap.fromTo(k, { scale: 1.3 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      }
    }
  }

  step(dt) {
    this._pickCuriosity(dt);
    for (const c of this.creatures) c.steer(dt, this);
    this._separate();
    for (const c of this.creatures) c.integrate(dt, this);
    for (const p of this.plants) p.update(dt);

    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin((this.last + b.wob) * 2) * 0.15;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > this.waterTop + 2);
  }

  // ---- rendering ----
  draw() {
    const ctx = this.ctx;
    // water
    const grad = ctx.createLinearGradient(0, 0, 0, this.gravelTop);
    grad.addColorStop(0, PALETTE.waterTop);
    grad.addColorStop(1, PALETTE.waterBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.gravelTop);

    // faint light shafts
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 3; i++) {
      const x = ((i + 0.5) / 3) * this.W + Math.sin(this.last * 0.3 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 8, 0); ctx.lineTo(x + 8, 0);
      ctx.lineTo(x + 2, this.gravelTop); ctx.lineTo(x - 2, this.gravelTop);
      ctx.closePath(); ctx.fill();
    }

    this._drawGravel();

    // plants behind fish
    for (const p of this.plants) p.draw(ctx, this);
    // bubbles
    for (const b of this.bubbles) {
      ctx.fillStyle = PALETTE.bubble;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // creatures
    for (const c of this.creatures) c.draw(ctx, this);
  }

  _drawGravel() {
    const ctx = this.ctx;
    ctx.fillStyle = this.gravelColor;
    ctx.fillRect(0, this.gravelTop, this.W, this.gravelHeight);
    // bumpy top edge
    ctx.fillStyle = shade(this.gravelColor, 0.12);
    for (let x = 0; x < this.W; x += 3) {
      const h = 1 + ((x * 7) % 3);
      ctx.fillRect(x, this.gravelTop - (h > 2 ? 1 : 0), 3, 2);
    }
    // pebbles
    for (const p of this.pebbles) {
      ctx.fillStyle = shade(this.gravelColor, p.d);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
  }

  // ---- loop ----
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    const frame = (now) => {
      if (!this.running) return;
      const t = now / 1000;
      let dt = t - this.last;
      this.last = t;
      if (dt > MAX_DT) dt = MAX_DT;
      this.step(dt);
      this.draw();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() { this.running = false; }

  clear() {
    this.creatures = []; this.plants = []; this.bubbles = [];
    this.waterType = null;
    this._select(null);
  }
}
