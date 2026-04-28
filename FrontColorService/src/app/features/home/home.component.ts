import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_ENV } from '../../core/env/app-env';
import { AuthService } from '../../core/auth/auth.service';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  template: `
    <app-page-frame>
      <div class="home">
        <h1 class="home__title">Bienvenue !</h1>
        <p class="home__subtitle">Prêt à affronter l'équipe adverse ?</p>
        <div class="home__actions">
          <a routerLink="/pokedex" class="home__cta">Ouvrir le Pokédex</a>
          @if (loggedIn()) {
            <a routerLink="/combat" class="home__cta home__cta--secondary">Mes combats</a>
          } @else {
            <a [href]="accountUrl" class="home__cta home__cta--secondary">Se connecter</a>
          }
        </div>
        <a class="home__account" [href]="accountUrl">Mon compte</a>
      </div>
    </app-page-frame>
  `,
  styles: [`
    .home {
      max-width: 30rem;
      margin: 5rem auto 0;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .home__title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem;
    }
    .home__subtitle {
      color: #666666;
      margin: 0 0 2rem;
    }
    .home__actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .home__cta {
      display: inline-block;
      padding: 0.875rem 1.75rem;
      background: #111111;
      color: #ffffff;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
    }
    .home__cta:hover { background: #333333; }
    .home__cta--secondary {
      background: transparent;
      color: #111111;
      border: 2px solid #111111;
    }
    .home__cta--secondary:hover {
      background: #111111;
      color: #ffffff;
    }
    .home__account {
      display: inline-block;
      margin: 0 auto;
      color: #555555;
      font-size: 0.9rem;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .home__account:hover { color: #111111; }
  `]
})
export class HomeComponent implements OnInit {
  protected readonly env = inject(APP_ENV);
  protected readonly auth = inject(AuthService);
  readonly accountUrl = `${this.env.FRONT_GENERAL_URL}/dashboard`;
  readonly loggedIn = signal(false);

  ngOnInit(): void {
    // const token = localStorage.getItem('access_token');
    // if (token) {
    //   const payload = JSON.parse(atob(token.split('.')[1]));
    //   console.log('token expires:', new Date(payload.exp * 1000));
    //   console.log('now:', new Date());
    //   console.log('is expired:', Date.now() / 1000 > payload.exp);
    // } else {
    //   console.log('no token in localStorage');
    // }
    this.loggedIn.set(this.auth.isLoggedIn());
  }
}
