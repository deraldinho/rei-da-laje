/**
 * HeaderComponent.js
 * Gerenciador da Barra de Cabeçalho e Telemetria de Conexão
 * 
 * Responsabilidades:
 * - Identidade visual da marca "REI DA LAJE"
 * - Status de conexão da Arena e do TikTok Live
 * - Contagem populacional de pipas no céu e fila de espera
 * - Controles de transmissão (Áudio, Narrador TTS, Alternância de Cenário 3D)
 */

export class HeaderComponent {
  constructor() {
    this.eyebrow = document.getElementById('brandEyebrow');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.tiktokLiveStatus = document.getElementById('tiktokLiveStatus');
    this.kiteCounter = document.getElementById('kiteCounter');
    this.queueCounter = document.getElementById('queueCounter');
    this.btnSound = document.getElementById('btnSound');
    this.btnVoice = document.getElementById('btnVoice');
    this.btnToggleScene = document.getElementById('btnToggleScene');
    this.emptyState = document.getElementById('emptyState');
  }

  setBrandEyebrow(text) {
    if (this.eyebrow) {
      this.eyebrow.textContent = text;
    }
  }

  updateKiteCount(count) {
    const formatted = String(count).padStart(2, '0');
    if (this.kiteCounter && this.kiteCounter.textContent !== formatted) {
      this.kiteCounter.textContent = formatted;
    }
    if (this.emptyState) {
      this.emptyState.hidden = count > 0;
    }
  }

  updateQueue(length) {
    if (this.queueCounter) {
      this.queueCounter.textContent = length > 0 ? `${length} NA FILA · COMENTE PARA PARTICIPAR` : '';
    }
  }

  setConnection(connected) {
    if (!this.connectionStatus) return;
    const label = connected ? 'Arena conectada' : 'Arena reconectando';
    this.connectionStatus.textContent = '';
    this.connectionStatus.setAttribute('aria-label', label);
    this.connectionStatus.title = label;
    this.connectionStatus.classList.toggle('offline', !connected);
    this.connectionStatus.classList.toggle('disconnected', !connected);
  }

  setLiveStatus(status) {
    if (!this.tiktokLiveStatus) return;
    const connected = Boolean(status?.connected);
    const reconnecting = Boolean(status?.transportReconnecting || status?.phase === 'reconnecting' || status?.retrying);
    const active = connected && !reconnecting && (
      Boolean(status?.eventsActive) ||
      status?.phase === 'events_active' ||
      status?.phase === 'transport_restored' ||
      status?.phase === 'room_found'
    );
    const label = reconnecting
      ? 'TikTok reconectando'
      : active
        ? (status?.eventsActive ? 'TikTok conectado · eventos ativos' : 'TikTok conectado · aguardando comentários')
        : connected
          ? 'TikTok sala localizada'
          : 'TikTok desconectado';

    this.tiktokLiveStatus.textContent = '';
    this.tiktokLiveStatus.setAttribute('aria-label', label);
    this.tiktokLiveStatus.classList.toggle('offline', !active);
    this.tiktokLiveStatus.classList.toggle('disconnected', !connected && !reconnecting);
    this.tiktokLiveStatus.title = status?.lastEventAt
      ? `${label} · último evento às ${new Date(status.lastEventAt).toLocaleTimeString()}`
      : label;
  }
}
