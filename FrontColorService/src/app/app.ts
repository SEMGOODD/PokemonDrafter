import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const returnPath = params.get('returnPath');
    if (returnPath) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('returnPath');
      window.history.replaceState({}, '', clean.toString());
      Promise.resolve().then(() => this.router.navigateByUrl(returnPath));
    }
  }
}
