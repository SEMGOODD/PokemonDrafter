import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

@Component({
    selector: 'app-contacts',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageFrameComponent, RouterLink],
    template: `
    <app-page-frame>
      <div class="legal">
        <nav class="legal__nav">
          <a routerLink="/" class="legal__back">← Accueil</a>
        </nav>
        <h1 class="legal__title">Contacts</h1>

        <section class="legal__section">
          <h2>Équipe de développement</h2>
          <p>Pokemon Drafter est une application de simulation de duels Pokémon à but éducatif, développée dans le cadre du module ICC par Ayoub SEMGAT, Simon Charrier, Lucas Fernandes et Ethan Orsolle.</p>
        </section>

        <section class="legal__section">
          <h2>Support technique</h2>
          <p>Pour tout problème technique, veuillez contacter l'équipe via le dépôt Git du projet.</p>
        </section>

        <section class="legal__section">
          <h2>Responsable pédagogique</h2>
          <p>Raphaël Lalanne — ICC 2026</p>
        </section>

        <section class="legal__section">
          <h2>API utilisée</h2>
          <p>Les données Pokémon proviennent de <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> — API gratuite et open source.</p>
        </section>
      </div>
    </app-page-frame>
  `,
    styles: [`
    .legal {
      max-width: 48rem;
      margin: 2rem auto 0;
      padding: 0 1rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .legal__nav { display: flex; gap: 1rem; }
    .legal__back {
      color: #666;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .legal__back:hover { color: #111; }
    .legal__title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0;
    }
    .legal__section { display: flex; flex-direction: column; gap: 0.5rem; }
    .legal__section h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
    }
    .legal__section p {
      color: #444;
      line-height: 1.7;
      margin: 0;
    }
    .legal__section a { color: #111; }
  `]
})
export class ContactsComponent { }