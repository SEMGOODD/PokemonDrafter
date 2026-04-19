const HABITAT_LABELS_FR: Record<string, string> = {
  cave: 'Grotte',
  forest: 'Forêt',
  grassland: 'Prairie',
  mountain: 'Montagne',
  rare: 'Rare',
  'rough-terrain': 'Terrain accidenté',
  sea: 'Mer',
  urban: 'Urbain',
  'waters-edge': 'Bord d\'eau',
  unknown: 'Inconnu'
};

const HABITAT_DEFAULT_LABEL = 'Inconnu';

export function translateHabitat(habitat: string | null | undefined): string {
  if (!habitat) return HABITAT_DEFAULT_LABEL;
  return HABITAT_LABELS_FR[habitat] ?? capitalise(habitat);
}

function capitalise(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
