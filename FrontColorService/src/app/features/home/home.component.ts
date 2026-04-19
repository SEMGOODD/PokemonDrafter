import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
        </div>
      </div>
    </app-page-frame>
  `,
  styles: [`
    .home {
      max-width: 480px;
      margin: 80px auto 0;
      text-align: center;
    }
    .home__title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }
    .home__subtitle {
      color: #666;
      margin: 0 0 32px;
    }
    .home__cta {
      display: inline-block;
      padding: 14px 28px;
      background: #111;
      color: #fff;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
    }
    .home__cta:hover { background: #333; }
  `]
})
export class HomeComponent {}
