// palette.js — cohesive retro color palette + tiny color helpers.
// Everything in the game draws from these so it reads as one 8-bit scene.

const PALETTE = {
  // Koi body base colors
  koiBase: ['#f6f2e9', '#ff7b3d', '#ffd23f', '#2b2b2b', '#e34b4b', '#e8e8e8'],
  // Spot colors used on top of the base
  koiSpot: ['#ff7b3d', '#e34b4b', '#2b2b2b', '#ffd23f', '#f6f2e9'],
  finLight: 'rgba(255,255,255,0.35)',

  shrimpBody: '#ff9e80',
  shrimpDark: '#e57373',

  snailShell: '#c98a4b',
  snailShellDark: '#9c6b34',
  snailBody: '#e6d3b3',

  crabBody: '#e2523b',
  crabDark: '#a83218',
  crabLight: '#ff7a5c',

  plant: ['#3fa34d', '#2e7d32', '#57b85f', '#1f7a3d'],

  bubble: 'rgba(230,245,255,0.75)',

  // Water gradient (top -> bottom)
  waterTop: '#2a86c4',
  waterBottom: '#0c3c6e',
};

// Gravel color choices offered to the player
const GRAVEL_COLORS = [
  '#c2b280', // sand
  '#8d6e63', // brown
  '#7e8aa2', // slate
  '#5d4037', // dark earth
  '#9ccc65', // moss
  '#b0bec5', // gray
  '#d98cae', // pink
  '#20232a', // near-black
];

// Shift a hex color lighter (+) or darker (-). amt in [-1,1].
function shade(hex, amt) {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

// deterministic-ish tiny rng helper
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
