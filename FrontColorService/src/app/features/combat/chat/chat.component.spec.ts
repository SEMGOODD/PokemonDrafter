import { TestBed } from '@angular/core/testing';

import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { createAuthServiceStub, STUB_ACCESS_TOKEN } from '../../../../testing/auth-service.stub';
import { ChatComponent } from './chat.component';

class MockWebSocket {
  static lastUrl = '';
  static sentFrames: string[] = [];
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

  send(frame: string): void {
    MockWebSocket.sentFrames.push(frame);
  }

  close(): void {}
}

describe('ChatComponent', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(async () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    MockWebSocket.sentFrames = [];
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        { provide: APP_ENV, useValue: createColorAppEnv('red') },
        { provide: AuthService, useValue: createAuthServiceStub('user-1') }
      ]
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

  // Verifie que le jeton part dans la premiere trame et que l URL ne transporte ni pseudo ni couleur.
  it('devrait envoyer le jeton dans la premiere trame sans identite dans l URL', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.componentRef.setInput('combatId', 'c1');
    fixture.componentRef.setInput('myColor', 'red');
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(MockWebSocket.lastUrl).toBe('ws://chat.test/api/chat/c1');
    expect(JSON.parse(MockWebSocket.sentFrames[0])).toEqual({ type: 'auth', token: STUB_ACCESS_TOKEN });
  });
});
