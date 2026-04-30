import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { TeamCompleteComponent } from './team-complete.component';

const MOCK_GATEWAY = 'http://gateway.test';

describe('TeamCompleteComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TeamCompleteComponent],
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
        const fixture = TestBed.createComponent(TeamCompleteComponent);
        fixture.detectChanges();
        httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([]);
        expect(fixture.componentInstance).toBeTruthy();
    });
});