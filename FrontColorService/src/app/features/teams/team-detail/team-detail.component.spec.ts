import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { TeamDetailComponent } from './team-detail.component';

const MOCK_GATEWAY = 'http://gateway.test';

describe('TeamDetailComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TeamDetailComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: APP_ENV, useValue: createColorAppEnv('red') },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ teamId: 't1' }) } } }
            ]
        }).compileComponents();
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('devrait instancier le composant', () => {
        const fixture = TestBed.createComponent(TeamDetailComponent);
        fixture.detectChanges();
        httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([
            { teamId: 't1', name: 'Team A', playerId: 'me', pokemons: [] }
        ]);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('devrait retourner false pour isFull si equipe incomplete', () => {
        const fixture = TestBed.createComponent(TeamDetailComponent);
        fixture.detectChanges();
        httpMock.match(() => true).forEach(r => r.flush([]));
        expect(fixture.componentInstance.isFull()).toBe(false);
    });
});