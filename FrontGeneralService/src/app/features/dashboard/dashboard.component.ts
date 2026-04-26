import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { APP_ENV, TeamColor } from '../../core/env/app-env';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

const TOKEN_PAYLOAD_INDEX = 1;
const JWT_MIN_SEGMENTS = 3;
const ROLE_RED_PLAYER = 'red_player';
const ROLE_BLUE_PLAYER = 'blue_player';
const DEFAULT_DISPLAY_NAME = 'joueur';
const BASE64_URL_MINUS = /-/g;
const BASE64_URL_UNDERSCORE = /_/g;

interface JwtPayload {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent],
  template: `
    <app-page-frame>
      <section class="dashboard">
        <h1 class="dashboard__title">Bienvenue {{ displayName() }} !</h1>
        @if (teamColor(); as color) {
          <p class="dashboard__subtitle">
            Tu fais partie de l'équipe
            <span
              class="dashboard__team"
              [class.dashboard__team--red]="color === 'red'"
              [class.dashboard__team--blue]="color === 'blue'"
            >
              {{ color === 'red' ? 'Rouge' : 'Bleue' }}
            </span>.
          </p>
        } @else {
          <p class="dashboard__subtitle">Aucune équipe détectée dans ton profil.</p>
        }

        <div class="dashboard__actions">
          @if (colorFrontUrl(); as url) {
            <a class="dashboard__cta" [href]="url">Accéder à l'espace de jeu</a>
          }
          <button type="button" class="dashboard__logout" (click)="onLogout()">Se déconnecter</button>
        </div>
      </section>
    </app-page-frame>
  `,
  styles: [`
    .dashboard {
      max-width: 32rem;
      margin: 3rem auto 0;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .dashboard__title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .dashboard__subtitle {
      color: #555555;
      margin: 0;
      font-size: 1.05rem;
    }
    .dashboard__team {
      font-weight: 700;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      color: #ffffff;
    }
    .dashboard__team--red { background: #ff0000; }
    .dashboard__team--blue { background: #1a80c4; }
    .dashboard__actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      margin-top: 1rem;
    }
    .dashboard__cta {
      padding: 0.75rem 1.5rem;
      background: #111111;
      color: #ffffff;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 600;
      transition: background 120ms ease, transform 120ms ease;
    }
    .dashboard__cta:hover {
      background: #000000;
      transform: translateY(-1px);
    }
    .dashboard__logout {
      background: transparent;
      border: none;
      color: #666666;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .dashboard__logout:hover { color: #111111; }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly env = inject(APP_ENV);
  private readonly themeService = inject(ThemeService);
  private readonly route = inject(ActivatedRoute);

  private returnPath: string | null = null;

  constructor() {
    effect(() => this.themeService.setUserColor(this.teamColor()));
  }

  ngOnInit(): void {
    this.returnPath = this.route.snapshot.queryParamMap.get('returnPath');
  }

  private readonly payload = computed<JwtPayload | null>(() => {
    const token = this.authService.getToken();
    if (!token) return null;
    return decodeJwtPayload(token);
  });

  readonly displayName = computed(() => this.payload()?.preferred_username ?? DEFAULT_DISPLAY_NAME);

  readonly teamColor = computed<TeamColor | null>(() => {
    const roles = this.payload()?.realm_access?.roles ?? [];
    if (roles.includes(ROLE_RED_PLAYER)) return 'red';
    if (roles.includes(ROLE_BLUE_PLAYER)) return 'blue';
    return null;
  });

  readonly colorFrontUrl = computed(() => {
    const color = this.teamColor();
    const token = this.authService.getToken();
    if (!color || !token) return null;

    const baseUrl = color === 'red' ? this.env.FRONT_RED_URL : this.env.FRONT_BLUE_URL;
    const encodedToken = encodeURIComponent(token);

    if (this.returnPath) {
      return `${baseUrl}?token=${encodedToken}&returnPath=${encodeURIComponent(this.returnPath)}`;
    }
    return `${baseUrl}?token=${encodedToken}`;
  });

  onLogout(): void {
    this.authService.logout();
  }
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < JWT_MIN_SEGMENTS) {
    return null;
  }
  try {
    const payload = parts[TOKEN_PAYLOAD_INDEX];
    const normalised = payload
      .replace(BASE64_URL_MINUS, '+')
      .replace(BASE64_URL_UNDERSCORE, '/');
    const bytes = Uint8Array.from(atob(normalised), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}
