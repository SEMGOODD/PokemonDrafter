import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';
import { Battle } from '../../../shared/types/combat.types';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { createAuthServiceStub } from '../../../../testing/auth-service.stub';
import { BattleViewComponent } from './battle-view.component';

const MOCK_GATEWAY = 'http://gateway.test';

const finishedBattle: Battle = {
  battleId: 'b99',
  mode: 'DRAFT',
  status: 'FINISHED',
  redPlayerId: 'me',
  bluePlayerId: 'other',
  redTeam: [],
  blueTeam: [],
  draftPool: [],
  draftTurnIndex: 0,
  redActivePokemon: null,
  blueActivePokemon: null,
  redAction: null,
  blueAction: null,
  turnNumber: 1,
  turnDeadline: null,
  winnerId: 'me',
  turnHistory: []
};

describe('BattleViewComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattleViewComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: createColorAppEnv('red') },
        { provide: AuthService, useValue: createAuthServiceStub('me') },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'b99' }) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Verifie que la vue combat se monte et demande le detail du combat via l API.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(BattleViewComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${MOCK_GATEWAY}/api/combat/battle/b99`).flush(finishedBattle);
    httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le combat charge met a jour le signal battle (donnees affichables).
  it('devrait stocker le combat retourne par getBattle', () => {
    const fixture = TestBed.createComponent(BattleViewComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${MOCK_GATEWAY}/api/combat/battle/b99`).flush(finishedBattle);
    httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.battle()?.battleId).toBe('b99');
  });
});
