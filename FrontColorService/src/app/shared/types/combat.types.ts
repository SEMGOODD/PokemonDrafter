export type BattleMode = 'DRAFT' | 'BUILT' | 'RANDOM';
export type BattleStatus = 'DRAFT_PHASE' | 'IN_PROGRESS' | 'FINISHED';
export type ActionType = 'STAY' | 'SWITCH';

export interface BattlePokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  ko: boolean;
}

export interface TurnResult {
  turnNumber: number;
  redActionType: ActionType;
  blueActionType: ActionType;
  redPokemonName: string;
  bluePokemonName: string;
  redScore: number;
  blueScore: number;
  winnerId: string | null;
  redKo: boolean;
  blueKo: boolean;
}

export interface PlayerAction {
  playerId: string;
  actionType: ActionType;
  pokemonId: number | null;
}

export interface Battle {
  battleId: string;
  mode: BattleMode;
  status: BattleStatus;
  redPlayerId: string;
  bluePlayerId: string;
  redTeam: BattlePokemon[];
  blueTeam: BattlePokemon[];
  draftPool: BattlePokemon[];
  draftTurnIndex: number;
  redActivePokemon: BattlePokemon | null;
  blueActivePokemon: BattlePokemon | null;
  redAction: PlayerAction | null;
  blueAction: PlayerAction | null;
  turnNumber: number;
  turnDeadline: string | null;
  winnerId: string | null;
  turnHistory: TurnResult[];
}

export interface CreateBattleRequest {
  redPlayerId: string;
  bluePlayerId: string;
  mode: BattleMode;
  redTeam: number[];
  blueTeam: number[];
}

export interface DraftPickRequest {
  playerId: string;
  pokemonIds: number[];
}

export interface PlayerActionRequest {
  playerId: string;
  actionType: ActionType;
  pokemonId: number | null;
}

export interface ForfeitRequest {
  playerId: string;
}
