// main.js — app state + UI: title screen (water type + starting lineup),
// a searchable species library shared by the title and tank, the tank
// toolbar, crowding cap indicator, and toasts.

let tank;
let selectedWater = 'fresh';   // title choice
let libContext = 'title';      // 'title' | 'tank'
let libWater = 'fresh';        // which tab the library is showing
const startCounts = {};        // type -> starting count

const FRESH_DEFAULTS = { koi: 2, tetra: 4, guppy: 2, goldfish: 1, shrimp: 1, snail: 1, plant: 2 };
const SALT_DEFAULTS = { clownfish: 3, blue_tang: 1, damsel: 2, shrimp: 1, snail: 1, plant: 1 };

function $(id) { return document.getElementById(id); }
function labelOf(type) { return (SPECIES_BY_TYPE[type] || {}).label || type; }

// ---------- pixel sprite icons ----------
function makeSpriteIcon(type) {
  const W = 40, H = 28;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  cvs.className = 'icon-canvas';
  const ctx = cvs.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const cx = W / 2, cy = H / 2;
  let c;
  if (type === 'koi') c = new Koi(cx, cy);
  else if (FISH_SPECIES[type]) c = new FinFish(type, cx, cy);
  else if (type === 'shrimp') c = new Shrimp(cx, cy);
  else if (type === 'snail') c = new Snail(cx, cy + 3, cy + 3);
  else if (type === 'crab') c = new Crab(cx, cy + 4, cy + 4);
  else if (type === 'lobster') c = new Lobster(cx, cy + 2, cy + 2);
  else if (type === 'octopus') c = new Octopus(cx, cy - 2);
  else if (type === 'plant') { c = new Plant(cx, H - 1); c.height = 0.82; }
  c.dir = 1; c.animT = 0;
  if (c.isFish) {
    const ew = c.bw * (1 + c.tailLen) + 2;
    const eh = c.bh * (1 + c.dorsal + c.ventral) + 3;
    c.scale = Math.min(1, (W * 0.9) / ew, (H * 0.9) / eh);
  }
  if (type === 'plant') c.draw(ctx, { H });
  else c.draw(ctx);
  return cvs;
}

function waterBadge(water) {
  const b = document.createElement('span');
  b.className = `badge badge-${water}`;
  b.textContent = water === 'both' ? 'BOTH' : water === 'salt' ? 'SALT' : 'FRESH';
  return b;
}

// ---------- gravel swatches ----------
function buildGravelSwatches(container, onPick) {
  container.innerHTML = '';
  GRAVEL_COLORS.forEach((col) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = col;
    b.title = 'Gravel color';
    b.addEventListener('click', () => {
      [...container.children].forEach((c) => c.classList.remove('sel'));
      b.classList.add('sel');
      onPick(col);
    });
    container.appendChild(b);
  });
  container.firstChild.classList.add('sel');
}

// ---------- title: water + lineup ----------
function setTitleWater(w) {
  selectedWater = w; libWater = w;
  [...$('water-select').children].forEach((b) => b.classList.toggle('sel', b.dataset.water === w));
  // reset the starting lineup to that water's defaults
  for (const k of Object.keys(startCounts)) delete startCounts[k];
  Object.assign(startCounts, w === 'fresh' ? FRESH_DEFAULTS : SALT_DEFAULTS);
  renderLineup();
  if (!$('library').classList.contains('hidden')) renderLibrary();
}

function adjustCount(type, delta) {
  const next = Math.max(0, Math.min(30, (startCounts[type] || 0) + delta));
  if (next === 0) delete startCounts[type]; else startCounts[type] = next;
  renderLineup();
  if (!$('library').classList.contains('hidden')) renderLibrary();
}

function stepperEl(type) {
  const wrap = document.createElement('div');
  wrap.className = 'stepper';
  const minus = document.createElement('button'); minus.className = 'minus'; minus.textContent = '-';
  const count = document.createElement('span'); count.className = 'count'; count.textContent = startCounts[type] || 0;
  const plus = document.createElement('button'); plus.className = 'plus'; plus.textContent = '+';
  minus.addEventListener('click', (e) => { e.stopPropagation(); adjustCount(type, -1); });
  plus.addEventListener('click', (e) => { e.stopPropagation(); adjustCount(type, +1); });
  wrap.append(minus, count, plus);
  return wrap;
}

function renderLineup() {
  const lineup = $('lineup');
  lineup.innerHTML = '';
  const chosen = Object.keys(startCounts).filter((t) => startCounts[t] > 0);
  if (chosen.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'no fish yet — browse the library';
    lineup.appendChild(p);
    return;
  }
  chosen.forEach((type) => {
    const card = document.createElement('div');
    card.className = 'pick';
    const icon = document.createElement('div'); icon.className = 'pick-icon';
    icon.appendChild(makeSpriteIcon(type));
    const label = document.createElement('div'); label.className = 'pick-label'; label.textContent = labelOf(type);
    card.append(icon, label, stepperEl(type));
    lineup.appendChild(card);
  });
}

// ---------- library overlay ----------
function openLibrary(context) {
  libContext = context;
  if (context === 'tank') libWater = tank.waterType || libWater;
  else libWater = selectedWater;
  $('lib-search').value = '';
  $('library').classList.remove('hidden');
  gsap.fromTo('#library .lib-panel', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25 });
  renderLibrary();
  $('lib-search').focus();
}

function closeLibrary() {
  $('library').classList.add('hidden');
}

function libLocked() {
  // in the tank, the water tabs lock to whatever the tank already contains
  return libContext === 'tank' && !!tank.waterType;
}

function renderLibrary() {
  // tab state
  const tabs = $('lib-tabs');
  [...tabs.children].forEach((b) => {
    b.classList.toggle('sel', b.dataset.water === libWater);
    b.disabled = libLocked() && b.dataset.water !== libWater;
  });

  const q = $('lib-search').value.trim().toLowerCase();
  const grid = $('lib-grid');
  grid.innerHTML = '';
  const list = speciesForWater(libWater).filter((s) => s.label.toLowerCase().includes(q));
  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-note">no matches</p>';
    return;
  }
  list.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'lib-card';
    const icon = document.createElement('div'); icon.className = 'lib-icon';
    icon.appendChild(makeSpriteIcon(s.type));
    const name = document.createElement('div'); name.className = 'lib-name'; name.textContent = s.label;
    const badge = waterBadge(s.water);
    card.append(icon, name, badge);

    if (libContext === 'title') {
      card.appendChild(stepperEl(s.type));
      card.classList.toggle('active', (startCounts[s.type] || 0) > 0);
    } else {
      const inTank = tank.creatures.filter((c) => c.type === s.type).length +
        (s.type === 'plant' ? tank.plants.length : 0);
      const add = document.createElement('button');
      add.className = 'lib-add';
      add.textContent = inTank ? `+ ADD (${inTank})` : '+ ADD';
      add.addEventListener('click', () => addFromLibrary(s.type));
      card.appendChild(add);
    }
    grid.appendChild(card);
  });
}

function addFromLibrary(type) {
  const r = tank.trySpawn(type);
  if (!r.ok) {
    toast(r.reason === 'full' ? 'TANK IS FULL' : 'WRONG WATER TYPE');
    return;
  }
  updateCap();
  renderLibrary(); // refresh counts / lock the water tabs after the first typed fish
}

// ---------- toast ----------
let toastTween;
function toast(msg, ok) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('toast-ok', !!ok);
  el.classList.remove('hidden');
  if (toastTween) toastTween.kill();
  gsap.killTweensOf(el);
  toastTween = gsap.fromTo(el, { autoAlpha: 0, y: 8 },
    { autoAlpha: 1, y: 0, duration: 0.2, onComplete: () => {
      gsap.to(el, { autoAlpha: 0, delay: 1.3, duration: 0.4, onComplete: () => el.classList.add('hidden') });
    } });
}

function updateCap() {
  const el = $('cap');
  if (el) el.textContent = `${tank.creatures.length}/${tank.maxCreatures}`;
}

// ---------- surprise / random stock ----------
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Title: randomize the starting lineup for the chosen water type.
function surpriseTitle() {
  for (const k of Object.keys(startCounts)) delete startCounts[k];
  const pool = speciesForWater(selectedWater);
  const fish = shuffled(pool.filter((s) => s.group === 'fish'));
  const other = shuffled(pool.filter((s) => s.group !== 'fish'));
  fish.slice(0, randInt(3, 5)).forEach((s) => { startCounts[s.type] = randInt(1, 4); });
  other.slice(0, randInt(1, 3)).forEach((s) => { startCounts[s.type] = randInt(1, 3); });
  renderLineup();
  if (!$('library').classList.contains('hidden')) renderLibrary();
}

// Tank: stock a random assortment of compatible creatures (respects cap).
function surpriseTank() {
  if (!tank.waterType) tank.waterType = Math.random() < 0.5 ? 'fresh' : 'salt';
  const pool = speciesForWater(tank.waterType).filter((s) => s.group !== 'plant');
  const target = Math.min(tank.maxCreatures, tank.creatures.length + randInt(6, 10));
  let guard = 0;
  while (tank.creatures.length < target && guard++ < 300) {
    tank.trySpawn(pick(pool).type);
  }
  for (let i = 0; i < randInt(1, 3); i++) tank.trySpawn('plant');
  updateCap();
  if (!$('library').classList.contains('hidden')) renderLibrary();
  toast('STOCKED!', true);
}

// ---------- screens ----------
function transition(fromId, toId, onMid) {
  const from = $(fromId), to = $(toId);
  gsap.to(from, {
    autoAlpha: 0, duration: 0.25, ease: 'power1.in',
    onComplete: () => {
      from.classList.add('hidden');
      gsap.set(from, { clearProps: 'opacity,visibility' });
      to.classList.remove('hidden');
      if (onMid) onMid();
      gsap.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' });
    },
  });
}

function applyPseudoFullscreen(active) {
  const targets = [document.documentElement, document.body, $('app')].filter(Boolean);
  targets.forEach((el) => el.classList.toggle('pseudo-fullscreen', active));
  window.scrollTo(0, 0);
  if (tank) {
    setTimeout(() => { tank.resize(); updateCap(); }, 50);
  }
}

function requestFullscreen() {
  applyPseudoFullscreen(true);
  const elem = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
    try {
      const req = elem.requestFullscreen ||
                  elem.webkitRequestFullscreen ||
                  elem.webkitRequestFullScreen ||
                  elem.mozRequestFullScreen ||
                  elem.msRequestFullscreen;
      if (req) {
        const res = req.call(elem);
        if (res && res.catch) res.catch(() => {});
      }
    } catch (e) {
      // Ignored: fallback pseudo-fullscreen is already applied
    }
  }
}

function exitFullscreen() {
  applyPseudoFullscreen(false);
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
      const exit = document.exitFullscreen ||
                   document.webkitExitFullscreen ||
                   document.mozCancelFullScreen ||
                   document.msExitFullscreen;
      if (exit) {
        const res = exit.call(document);
        if (res && res.catch) res.catch(() => {});
      }
    }
  } catch (e) {}
}

function toggleFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.body.classList.contains('pseudo-fullscreen'));
  if (!isFs) {
    requestFullscreen();
  } else {
    exitFullscreen();
  }
}

function startGame() {
  requestFullscreen();
  closeLibrary();
  transition('title-screen', 'tank-screen', () => {
    tank.clear();
    tank.waterType = selectedWater;
    tank.resize();
    Object.keys(startCounts).forEach((type) => {
      for (let i = 0; i < startCounts[type]; i++) tank.trySpawn(type);
    });
    if (tank.creatures.length === 0 && tank.plants.length === 0) {
      tank.trySpawn(selectedWater === 'fresh' ? 'koi' : 'clownfish');
      tank.trySpawn(selectedWater === 'fresh' ? 'tetra' : 'damsel');
    }
    updateCap();
    tank.start();
  });
}

// ---------- init ----------
function init() {
  tank = new Tank($('tank'));
  tank.onSelect = (obj) => { $('delete-btn').disabled = !obj; };
  tank.onChange = updateCap;

  // water selector
  $('water-select').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => setTitleWater(b.dataset.water));
  });
  setTitleWater('fresh');

  buildGravelSwatches($('title-gravel'), (col) => { tank.gravelColor = col; });
  buildGravelSwatches($('tank-gravel'), (col) => { tank.gravelColor = col; });

  $('browse-btn').addEventListener('click', () => openLibrary('title'));
  $('surprise-btn').addEventListener('click', surpriseTitle);
  $('start-btn').addEventListener('click', startGame);
  $('add-btn').addEventListener('click', () => openLibrary('tank'));
  $('surprise-btn2').addEventListener('click', surpriseTank);
  $('delete-btn').addEventListener('click', () => { tank.deleteSelected(); });
  $('delete-btn').disabled = true;
  const fsBtn = $('fullscreen-btn');
  if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
  $('menu-btn').addEventListener('click', () => {
    closeLibrary();
    exitFullscreen();
    transition('tank-screen', 'title-screen', () => tank.stop());
  });

  // library controls
  $('lib-close').addEventListener('click', closeLibrary);
  $('lib-search').addEventListener('input', renderLibrary);
  $('lib-tabs').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      if (libLocked()) return;
      if (libContext === 'title') setTitleWater(b.dataset.water);
      else { libWater = b.dataset.water; renderLibrary(); }
    });
  });
  $('library').addEventListener('click', (e) => { if (e.target.id === 'library') closeLibrary(); });

  animateTitleIn();

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { tank.resize(); updateCap(); }, 120);
  });
}

function animateTitleIn() {
  const tl = gsap.timeline();
  tl.from('.game-title', { y: -34, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.7)' })
    .from('.subtitle', { autoAlpha: 0, duration: 0.4 }, '-=0.2')
    .from('#water-select', { autoAlpha: 0, y: 10, duration: 0.3 }, '-=0.1')
    .from('#lineup .pick', { y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.05 }, '-=0.1')
    .from('#browse-btn', { autoAlpha: 0, duration: 0.3 }, '-=0.1')
    .from('.start-btn', { scale: 0, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.1');
}

window.addEventListener('DOMContentLoaded', init);
