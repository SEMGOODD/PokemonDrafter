import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';
import { CombatApiService } from '../../../core/api/combat-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { Battle } from '../../../shared/types/combat.types';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { BattleCreateComponent } from './battle-create.component';

const minimalBattle: Battle = {
  battleId: 'battle-1',
  mode: 'DRAFT',
  status: 'DRAFT_PHASE',
  redPlayerId: 'me',
  bluePlayerId: 'opp',
  redTeam: [],
  blueTeam: [],
  draftPool: [],
  draftTurnIndex: 0,
  redActivePokemon: null,
  blueActivePokemon: null,
  redAction: null,
  blueAction: null,
  turnNumber: 0,
  turnDeadline: null,
  winnerId: null,
  turnHistory: []
};

describe('BattleCreateComponent', () => {
  const searchByUsernameSpy = vi.fn();
  const createBattleSpy = vi.fn();

  beforeEach(async () => {
    searchByUsernameSpy.mockReset();
    createBattleSpy.mockReset();
    searchByUsernameSpy.mockReturnValue(of({ id: 'u2', username: 'opp' }));
    createBattleSpy.mockReturnValue(of(minimalBattle));
    await TestBed.configureTestingModule({
      imports: [BattleCreateComponent],
      providers: [
        provideRouter([]),
        { provide: APP_ENV, useValue: createColorAppEnv('red') },
        { provide: AuthService, useValue: { getPlayerId: (): string => 'me' } },
        {
          provide: UserApiService,
          useValue: {
            searchByUsername: searchByUsernameSpy
          }
        },
        {
          provide: CombatApiService,
          useValue: {
            createBattle: createBattleSpy
          }
        }
      ]
    }).compileComponents();
  });

  // Verifie que le formulaire de creation de combat se monte avec les services injectes.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(BattleCreateComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que la recherche d adversaire vide ne declenche pas d appel reseau (garde-fou).
  it('ne devrait pas appeler searchByUsername si le nom est vide', () => {
    const fixture = TestBed.createComponent(BattleCreateComponent);
    fixture.componentInstance.opponentUsername = '   ';
    fixture.componentInstance.searchOpponent();
    expect(searchByUsernameSpy).not.toHaveBeenCalled();
  });

  // Verifie qu une creation reussi redirige vers la page du combat (navigation nominale).
  it('devrait naviguer vers la route du combat apres creation', () => {
    const fixture = TestBed.createComponent(BattleCreateComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const component = fixture.componentInstance;
    component.opponentUsername = 'opp';
    component.searchOpponent();
    component.createBattle();
    expect(navigateSpy).toHaveBeenCalledWith(['/combat/battle', 'battle-1']);
  });
});
