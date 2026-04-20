export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  height: number;
  weight: number;
  stats: PokemonStats;
  description: string;
  habitat: string;
  sprite: string;
}

export interface PokemonSummary {
  id: number;
  name: string;
  types: string[];
  sprite: string;
}

export interface PokemonSearchRequest {
  name?: string;
  type1?: string;
  type2?: string;
  page: number;
  pageSize: number;
}
