import type { ClientMessage, ServerMessage } from '@claudedeck/shared';
import { WS_RECONNECT_DELAY_MS, WS_MAX_RECONNECT_ATTEMPTS } from '@claudedeck/shared';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private intentionallyClosed = false;

  connect(): void {
    this.intentionallyClosed = false;
    this.createConnection();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[ws] Tried to send while disconnected');
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private createConnection(): void {
    const token = localStorage.getItem('cd_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws${token ? `?token=${token}` : ''}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.statusHandlers.forEach((h) => h(true));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        console.warn('[ws] Failed to parse message');
      }
    };

    this.ws.onclose = () => {
      this.statusHandlers.forEach((h) => h(false));
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      console.warn('[ws] Max reconnect attempts reached');
      return;
    }

    const delay = WS_RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }
}

export const wsClient = new WebSocketClient();
