// catalog.js — the full species library used by the browse/search UI and by
// the tank's freshwater/saltwater rules. `water` is 'fresh', 'salt' or
// 'both' (inverts/plants that live happily in either). `group` drives which
// section of the library a species shows in.

const NON_FISH = [
  { type: 'shrimp', label: 'Shrimp', water: 'both', group: 'invert' },
  { type: 'snail', label: 'Snail', water: 'both', group: 'invert' },
  { type: 'crab', label: 'Crab', water: 'both', group: 'invert' },
  { type: 'lobster', label: 'Lobster', water: 'salt', group: 'invert' },
  { type: 'octopus', label: 'Octopus', water: 'salt', group: 'invert' },
  { type: 'plant', label: 'Plant', water: 'both', group: 'plant' },
];

const SPECIES = [
  { type: 'koi', label: 'Koi', water: 'fresh', group: 'fish' },
  ...Object.keys(FISH_SPECIES).map((t) => ({
    type: t, label: FISH_SPECIES[t].label, water: FISH_SPECIES[t].water, group: 'fish',
  })),
  ...NON_FISH,
];

const SPECIES_BY_TYPE = Object.fromEntries(SPECIES.map((s) => [s.type, s]));

// Species usable in a given tank water type ('fresh'|'salt'|null=either).
function speciesForWater(water) {
  return SPECIES.filter((s) => s.water === 'both' || !water || s.water === water);
}
