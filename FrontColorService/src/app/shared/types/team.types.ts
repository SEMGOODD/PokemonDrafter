export interface TeamPokemonResponse {
    slot: number;
    pokemonId: number;
    pokemonName: string;
}

export interface TeamResponse {
    teamId: string;
    name: string;
    playerId: string;
    pokemons: TeamPokemonResponse[];
}

export interface TeamRequest {
    name: string;
}

export interface TeamPokemonRequest {
    pokemonId: number;
    slot: number;
}

export interface PlayerResponse {
    playerId: string;
    color: string;
    score: number;
}

export interface ColorChangeRequest {
    color: string;
}