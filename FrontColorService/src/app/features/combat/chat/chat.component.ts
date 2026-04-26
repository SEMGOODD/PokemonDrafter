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
    template: `
    <div class="chat">
      <div class="chat__header">
        <span class="chat__title">Chat</span>
        <span class="chat__dot" [class.chat__dot--on]="connected()"></span>
      </div>

      <div class="chat__messages" #messagesEl>
        @for (msg of messages(); track $index) {
          @if (msg.type === 'system') {
            <div class="chat__system">{{ msg.message }}</div>
          } @else {
            <div
              class="chat__bubble"
              [class.chat__bubble--mine]="msg.color === myColor"
              [class.chat__bubble--red]="msg.color === 'red'"
              [class.chat__bubble--blue]="msg.color === 'blue'"
            >
              <span class="chat__bubble-text">{{ msg.message }}</span>
            </div>
          }
        }

        @if (messages().length === 0) {
          <p class="chat__empty">Aucun message pour l'instant…</p>
        }
      </div>

      <div class="chat__input-row">
        <input
          class="chat__input"
          type="text"
          placeholder="Envoyer un message…"
          [(ngModel)]="draft"
          [disabled]="!connected()"
          (keydown.enter)="send()"
          maxlength="300"
        />
        <button
          class="chat__send"
          (click)="send()"
          [disabled]="!connected() || !draft.trim()"
          aria-label="Envoyer"
        >
          ↑
        </button>
      </div>
    </div>
  `,
    styles: [`
    .chat {
      display: flex;
      flex-direction: column;
      border: 1px solid #e5e5e5;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #fff;
      margin-top: 1.5rem;
    }

    /* Header */
    .chat__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: #f8f8f8;
      border-bottom: 1px solid #e5e5e5;
    }
    .chat__title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #555;
    }
    .chat__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d1d5db;
      transition: background 300ms;
    }
    .chat__dot--on { background: #16a34a; }

    /* Message list */
    .chat__messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.75rem 1rem;
      height: 14rem;
      overflow-y: auto;
      scroll-behavior: smooth;
    }

    .chat__empty {
      margin: auto;
      color: #bbb;
      font-size: 0.85rem;
      font-style: italic;
    }

    .chat__system {
      text-align: center;
      font-size: 0.75rem;
      color: #aaa;
      font-style: italic;
      padding: 0.15rem 0;
    }

    .chat__bubble {
      display: flex;
      max-width: 80%;
    }
    .chat__bubble--mine { align-self: flex-end; }
    .chat__bubble:not(.chat__bubble--mine) { align-self: flex-start; }

    .chat__bubble-text {
      padding: 0.4rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.9rem;
      line-height: 1.4;
      word-break: break-word;
      background: #f0f0f0;
      color: #111;
    }

    /* Red player bubble */
    .chat__bubble--red.chat__bubble--mine .chat__bubble-text {
      background: #dc2626;
      color: #fff;
    }
    /* Blue player bubble */
    .chat__bubble--blue.chat__bubble--mine .chat__bubble-text {
      background: #2563eb;
      color: #fff;
    }

    /* Input row */
    .chat__input-row {
      display: flex;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border-top: 1px solid #e5e5e5;
      background: #fafafa;
    }

    .chat__input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 999px;
      font-size: 0.9rem;
      font-family: inherit;
      background: #fff;
      outline: none;
      transition: border-color 120ms;
    }
    .chat__input:focus { border-color: #111; }
    .chat__input:disabled { background: #f5f5f5; color: #aaa; }

    .chat__send {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      border: none;
      background: #111;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 120ms;
      flex-shrink: 0;
    }
    .chat__send:hover:not(:disabled) { background: #333; }
    .chat__send:disabled { background: #ccc; cursor: not-allowed; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
    @Input({ required: true }) combatId!: string;
    @Input({ required: true }) myColor!: 'red' | 'blue';
    @Input({ required: true }) userId!: string;

    @ViewChild('messagesEl') private messagesEl!: ElementRef<HTMLDivElement>;

    private readonly cdr = inject(ChangeDetectorRef);

    readonly messages = signal<ChatMessage[]>([]);
    readonly connected = signal(false);
    private readonly env = inject(APP_ENV);


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
        if (!this.combatId || !this.userId || !this.myColor) return;

        const base = this.env.CHAT_WS_URL ?? this.deriveWsBase();
        const url = `${base}/api/chat/${encodeURIComponent(this.combatId)}` +
            `?userId=${encodeURIComponent(this.userId)}` +
            `&color=${encodeURIComponent(this.myColor)}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
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