import { TestBed } from '@angular/core/testing';

import { APP_ENV } from '../../../core/env/app-env';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { ChatComponent } from './chat.component';

class MockWebSocket {
  static lastUrl = '';
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.lastUrl = url;
    queueMicrotask(() => this.onopen?.());
  }

  send(): void {}

  close(): void {}
}

describe('ChatComponent', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(async () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [{ provide: APP_ENV, useValue: createColorAppEnv('red') }]
    }).compileComponents();
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  // Verifie que le widget chat se cree avec les entrees obligatoires combatId, myColor et userId.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.componentRef.setInput('combatId', 'c1');
    fixture.componentRef.setInput('myColor', 'red');
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que l ouverture WebSocket passe connected a true une fois onopen appele (liaison etat connexion).
  it('devrait marquer connected a true apres ouverture du socket', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.componentRef.setInput('combatId', 'c1');
    fixture.componentRef.setInput('myColor', 'red');
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.connected()).toBe(true);
  });
});
