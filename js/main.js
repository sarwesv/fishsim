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

function startGame() {
  tank.clear();
  CREATURES.forEach((c) => {
    for (let i = 0; i < startCounts[c.type]; i++) tank.spawn(c.type);
  });
  if (tank.creatures.length === 0 && tank.plants.length === 0) {
    tank.spawn('koi'); tank.spawn('koi');
  }
  $('title-screen').classList.add('hidden');
  $('tank-screen').classList.remove('hidden');
  tank.resize();
  tank.start();
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
    tank.stop();
    $('tank-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
  });
}

function init() {
  tank = new Tank($('tank'));
  buildTitle();
  buildToolbar();
  $('start-btn').addEventListener('click', startGame);

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => tank.resize(), 120);
  });
}

window.addEventListener('DOMContentLoaded', init);
