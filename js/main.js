// main.js — app state + UI wiring. Title screen lets you pick a starting
// lineup and gravel color; the tank view has a live toolbar to spawn,
// select+delete, and recolor the gravel.

const CREATURES = [
  { type: 'koi', label: 'Koi', emoji: '🐟' },
  { type: 'shrimp', label: 'Shrimp', emoji: '🦐' },
  { type: 'snail', label: 'Snail', emoji: '🐌' },
  { type: 'crab', label: 'Crab', emoji: '🦀' },
  { type: 'plant', label: 'Plant', emoji: '🌿' },
];

let tank;
const startCounts = { koi: 2, shrimp: 1, snail: 1, crab: 0, plant: 2 };

function $(id) { return document.getElementById(id); }

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

// ---------- Title screen ----------
function buildTitle() {
  const lineup = $('lineup');
  lineup.innerHTML = '';
  CREATURES.forEach((c) => {
    const wrap = document.createElement('div');
    wrap.className = 'pick';
    wrap.innerHTML =
      `<div class="pick-emoji">${c.emoji}</div>` +
      `<div class="pick-label">${c.label}</div>` +
      `<div class="stepper">` +
      `<button class="minus" aria-label="fewer ${c.label}">–</button>` +
      `<span class="count" id="cnt-${c.type}">${startCounts[c.type]}</span>` +
      `<button class="plus" aria-label="more ${c.label}">+</button></div>`;
    wrap.querySelector('.plus').addEventListener('click', () => {
      startCounts[c.type] = Math.min(30, startCounts[c.type] + 1);
      $(`cnt-${c.type}`).textContent = startCounts[c.type];
    });
    wrap.querySelector('.minus').addEventListener('click', () => {
      startCounts[c.type] = Math.max(0, startCounts[c.type] - 1);
      $(`cnt-${c.type}`).textContent = startCounts[c.type];
    });
    lineup.appendChild(wrap);
  });

  buildGravelSwatches($('title-gravel'), (col) => { tank.gravelColor = col; });
}

// GSAP cross-fade between the two screens; onMid runs while the incoming
// screen is laid out but before it fades in.
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

function startGame() {
  transition('title-screen', 'tank-screen', () => {
    tank.clear();
    tank.resize();
    CREATURES.forEach((c) => {
      for (let i = 0; i < startCounts[c.type]; i++) tank.spawn(c.type);
    });
    if (tank.creatures.length === 0 && tank.plants.length === 0) {
      tank.spawn('koi'); tank.spawn('koi');
    }
    tank.start();
  });
}

// ---------- Tank toolbar ----------
function buildToolbar() {
  const spawnRow = $('spawn-row');
  spawnRow.innerHTML = '';
  CREATURES.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'tool';
    b.innerHTML = `<span>${c.emoji}</span>`;
    b.title = `Add ${c.label}`;
    b.addEventListener('click', () => tank.spawn(c.type));
    spawnRow.appendChild(b);
  });

  buildGravelSwatches($('tank-gravel'), (col) => { tank.gravelColor = col; });

  const del = $('delete-btn');
  del.addEventListener('click', () => tank.deleteSelected());
  del.disabled = true;

  tank.onSelect = (obj) => { del.disabled = !obj; };

  $('menu-btn').addEventListener('click', () => {
    transition('tank-screen', 'title-screen', () => tank.stop());
  });
}

// GSAP entrance for the title screen
function animateTitleIn() {
  const tl = gsap.timeline();
  tl.from('.game-title', { y: -34, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.7)' })
    .from('.subtitle', { autoAlpha: 0, duration: 0.4 }, '-=0.2')
    .from('.section-label', { autoAlpha: 0, x: -12, duration: 0.3, stagger: 0.1 }, '-=0.1')
    .from('#lineup .pick', { y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.06 }, '-=0.2')
    .from('#title-gravel .swatch', { scale: 0, duration: 0.3, stagger: 0.03, ease: 'back.out(2)' }, '-=0.2')
    .from('.start-btn', { scale: 0, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.1')
    .from('.hint', { autoAlpha: 0, duration: 0.4 }, '-=0.2');
}

function init() {
  tank = new Tank($('tank'));
  buildTitle();
  buildToolbar();
  $('start-btn').addEventListener('click', startGame);
  animateTitleIn();

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => tank.resize(), 120);
  });
}

window.addEventListener('DOMContentLoaded', init);
