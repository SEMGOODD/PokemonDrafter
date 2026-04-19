import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-callback',
    standalone: true,
    template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
      <p style="color:#888;">Authenticating, please wait...</p>
    </div>
  `
})
export class CallbackComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const code = this.route.snapshot.queryParamMap.get('code');
        if (!code) {
            this.router.navigate(['/auth']);
            return;
        }

        this.authService.handleCallback(code).subscribe({
            next: (res) => {
                this.authService.saveToken(res.access_token);
                if (res.refresh_token) {
                    localStorage.setItem('refresh_token', res.refresh_token);
                }
                this.router.navigate(['/dashboard']);
            },
            error: () => {
                this.router.navigate(['/auth']);
            }
        });
    }
}