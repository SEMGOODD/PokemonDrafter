import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

@Component({
  selector: 'app-cgu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  template: `
    <app-page-frame>
      <div class="legal">
        <nav class="legal__nav">
          <a routerLink="/" class="legal__back">← Accueil</a>
        </nav>
        <h1 class="legal__title">Conditions Générales d'Utilisation</h1>
        <p class="legal__date">Dernière mise à jour : avril 2026</p>

        <section class="legal__section">
          <h2>1. Objet</h2>
          <p>Pokemon Drafter est une application de simulation de duels Pokémon à but éducatif, développée dans le cadre du module ICC par Ayoub SEMGAT, Simon Charrier, Lucas Fernandes et Ethan Orsolle.</p>
        </section>

        <section class="legal__section">
          <h2>2. Accès au service</h2>
          <p>L'accès nécessite un compte créé via le formulaire d'inscription. Chaque utilisateur appartient à une équipe Rouge ou Bleue.</p>
        </section>

        <section class="legal__section">
          <h2>3. Données personnelles</h2>
          <p>Les données collectées (pseudo, email, historique des parties) sont utilisées uniquement dans le cadre de l'application. Aucune donnée n'est transmise à des tiers.</p>
        </section>

        <section class="legal__section">
          <h2>4. Règles de conduite</h2>
          <p>Les utilisateurs s'engagent à ne pas perturber le bon fonctionnement de l'application ni à adopter un comportement abusif envers les autres joueurs.</p>
        </section>

        <section class="legal__section">
          <h2>5. Propriété intellectuelle</h2>
          <p>Les données Pokémon proviennent de l'API publique PokéAPI. Les noms et images Pokémon sont la propriété de Nintendo / Game Freak.</p>
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
    .legal__date { color: #888; margin: 0; font-size: 0.9rem; }
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
  `]
})
export class CguComponent { }