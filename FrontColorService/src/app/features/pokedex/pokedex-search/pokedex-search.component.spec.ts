import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_ENV } from '../../../core/env/app-env';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { PokedexSearchComponent } from './pokedex-search.component';

const MOCK_GATEWAY = 'http://gateway.test';
const NAME_DEBOUNCE_WAIT_MS = 350;

describe('PokedexSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokedexSearchComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: createColorAppEnv('red') }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Verifie que la recherche initiale part apres debounce et que la reponse remplit results (flux liste).
  it('devrait declencher la recherche puis exposer les resultats', async () => {
    const fixture = TestBed.createComponent(PokedexSearchComponent);
    fixture.detectChanges();
    await new Promise<void>(resolve => {
      setTimeout(resolve, NAME_DEBOUNCE_WAIT_MS);
    });
    const request = httpMock.expectOne(
      req => req.url.startsWith(`${MOCK_GATEWAY}/api/pokemon/search`) && req.method === 'GET'
    );
    request.flush([{ id: 1, name: 'bulb', types: ['grass'], sprite: '' }]);
    await fixture.whenStable();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.componentInstance.results().length).toBe(1);
  });
});
