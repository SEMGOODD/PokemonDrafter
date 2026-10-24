import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { APP_ENV } from '../../../core/env/app-env';
import { Pokemon } from '../../../shared/types/pokemon.types';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { PokedexDetailComponent } from './pokedex-detail.component';

const MOCK_GATEWAY = 'http://gateway.test';

const samplePokemon: Pokemon = {
  id: 7,
  name: 'squirtle',
  types: ['water'],
  height: 5,
  weight: 90,
  stats: {
    hp: 44,
    attack: 48,
    defense: 65,
    specialAttack: 50,
    specialDefense: 64,
    speed: 43
  },
  description: 'Test',
  habitat: 'waters-edge',
  sprite: 'https://example.com/s.png'
};

describe('PokedexDetailComponent', () => {
  let httpMock: HttpTestingController;
  const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '7' }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokedexDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: createColorAppEnv('red') },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMapSubject.asObservable() }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Verifie que le composant se cree et que la reponse HTTP alimente le signal pokemon (flux detail).
  it('devrait charger le pokemon depuis l API puis exposer le nom', async () => {
    const fixture = TestBed.createComponent(PokedexDetailComponent);
    fixture.detectChanges();
    const request = httpMock.expectOne(`${MOCK_GATEWAY}/api/pokemon/7`);
    expect(request.request.method).toBe('GET');
    request.flush(samplePokemon);
    httpMock.expectOne(`${MOCK_GATEWAY}/api/teams`).flush([]);
    await fixture.whenStable();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.componentInstance.pokemon()?.name).toBe('squirtle');
  });
});
