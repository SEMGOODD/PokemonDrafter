import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { createAuthServiceStub } from '../../../../testing/auth-service.stub';
import { TeamListComponent } from './team-list.component';

const MOCK_GATEWAY = 'http://gateway.test';

describe('TeamListComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TeamListComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: APP_ENV, useValue: createColorAppEnv('red') },
                { provide: AuthService, useValue: createAuthServiceStub('me') }
            ]
        }).compileComponents();
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('devrait instancier le composant', () => {
        const fixture = TestBed.createComponent(TeamListComponent);
        fixture.detectChanges();
        httpMock.expectOne(`${MOCK_GATEWAY}/api/players/me`).flush({ playerId: 'me', color: 'red', score: 0 });
        httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([]);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('devrait afficher les equipes chargees', () => {
        const fixture = TestBed.createComponent(TeamListComponent);
        fixture.detectChanges();
        httpMock.expectOne(`${MOCK_GATEWAY}/api/players/me`).flush({ playerId: 'me', color: 'red', score: 10 });
        httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([
            { teamId: 't1', name: 'Team A', playerId: 'me', pokemons: [] }
        ]);
        fixture.detectChanges();
        expect(fixture.componentInstance.teams().length).toBe(1);
    });
});