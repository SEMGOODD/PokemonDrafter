import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_ENV } from '../../core/env/app-env';
import { AuthService } from '../../core/auth/auth.service';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
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