import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { BattleListComponent } from './battle-list.component';

const MOCK_GATEWAY = 'http://gateway.test';

describe('BattleListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattleListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: createColorAppEnv('red') },
        { provide: AuthService, useValue: { getPlayerId: (): string => 'me' } }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Verifie que la liste des combats se monte et declenche les chargements HTTP initiaux.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(BattleListComponent);
    fixture.detectChanges();
    const requests = httpMock.match(req => req.url.startsWith(`${MOCK_GATEWAY}/api/combat`));
    expect(requests.length).toBeGreaterThanOrEqual(2);
    requests.forEach(r => r.flush([]));
    expect(fixture.componentInstance).toBeTruthy();
    fixture.destroy();
  });

  // Verifie que isWinner compare le gagnant au joueur courant (logique d affichage victoire).
  it('devrait retourner true si winnerId correspond au joueur courant', () => {
    const fixture = TestBed.createComponent(BattleListComponent);
    fixture.detectChanges();
    httpMock.match(() => true).forEach(r => r.flush([]));
    const battle = {
      battleId: 'b',
      mode: 'DRAFT' as const,
      status: 'FINISHED' as const,
      redPlayerId: 'me',
      bluePlayerId: 'x',
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
      winnerId: 'me',
      turnHistory: []
    };
    expect(fixture.componentInstance.isWinner(battle)).toBe(true);
  });
});
