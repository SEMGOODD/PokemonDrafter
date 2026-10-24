import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { APP_ENV } from '../../../core/env/app-env';
import { AuthService } from '../../../core/auth/auth.service';

interface ChatMessage {
  type: 'chat' | 'system';
  sender?: string;
  color?: 'red' | 'blue';
  message: string;
  combat_id: string;
}

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @Input({ required: true }) combatId!: string;
  @Input({ required: true }) myColor!: 'red' | 'blue';
  @Input({ required: true }) userId!: string;

  @ViewChild('messagesEl') private messagesEl!: ElementRef<HTMLDivElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly env = inject(APP_ENV);
  private readonly auth = inject(AuthService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly connected = signal(false);

  draft = '';

  private ws: WebSocket | null = null;
  private shouldScrollBottom = false;

  ngOnInit(): void {
    this.openSocket();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['combatId'] && !changes['combatId'].firstChange) {
      this.closeSocket();
      this.messages.set([]);
      this.openSocket();
    }
  }

  ngOnDestroy(): void {
    this.closeSocket();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  private openSocket(): void {
    console.log('CHAT_WS_URL from env:', this.env.CHAT_WS_URL);
    console.log('full env:', this.env);
    const token = this.auth.getToken();
    if (!this.combatId || !this.userId || !this.myColor || !token) return;

    const base = this.env.CHAT_WS_URL ?? this.deriveWsBase();
    const url = `${base}/api/chat/${encodeURIComponent(this.combatId)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Le chat-service attend le jeton dans la premiere trame et deduit pseudo et couleur cote serveur.
      this.ws?.send(JSON.stringify({ type: 'auth', token }));
      this.connected.set(true);
      this.cdr.markForCheck();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: ChatMessage = JSON.parse(event.data as string);
        this.messages.update(prev => [...prev, msg]);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      } catch {
        // Ignorer silencieusement les erreurs de parsing
      }
    };

    this.ws.onclose = () => {
      this.connected.set(false);
      this.cdr.markForCheck();
    };

    this.ws.onerror = () => {
      this.connected.set(false);
      this.cdr.markForCheck();
    };
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({ message: text }));

    this.messages.update(prev => [
      ...prev,
      {
        type: 'chat',
        sender: this.userId,
        color: this.myColor,
        message: text,
        combat_id: this.combatId,
      }
    ]);

    this.draft = '';
    this.shouldScrollBottom = true;
    this.cdr.markForCheck();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }

  private deriveWsBase(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}`;
  }
}