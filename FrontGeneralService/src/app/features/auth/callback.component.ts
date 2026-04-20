import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

const DASHBOARD_ROUTE = '/dashboard';
const AUTH_ROUTE = '/auth';
const OAUTH_CODE_PARAM = 'code';

@Component({
  selector: 'app-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent],
  template: `
    <app-page-frame>
      <section class="callback">
        <p class="callback__message">Authentification en cours…</p>
      </section>
    </app-page-frame>
  `,
  styles: [`
    .callback {
      max-width: 28rem;
      margin: 5rem auto 0;
      text-align: center;
    }
    .callback__message {
      color: #666666;
      font-size: 1rem;
    }
  `]
})
export class CallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get(OAUTH_CODE_PARAM);
    if (!code) {
      this.router.navigate([AUTH_ROUTE]);
      return;
    }
    this.authService.handleCallback(code).subscribe({
      next: res => {
        this.authService.saveToken(res.access_token, res.refresh_token);
        this.router.navigate([DASHBOARD_ROUTE]);
      },
      error: () => {
        this.router.navigate([AUTH_ROUTE]);
      }
    });
  }
}
