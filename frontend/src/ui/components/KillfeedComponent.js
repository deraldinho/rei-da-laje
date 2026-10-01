/**
 * KillfeedComponent.js
 * Gerenciador do Feed Tático de Combate e Eventos da Arena
 * 
 * Responsabilidades:
 * - Notificações de cortes (feed-cut com tesoura ✂)
 * - Notificações de aparadas (feed-parry com escudo 🛡️)
 * - Notificações de novos participantes e presentes
 * - Transições de mapas e cenários 3D (feed-map-change)
 * - Safe Zone: posicionado rigorosamente fora da área de botões nativos do TikTok Live
 */

export class KillfeedComponent {
  constructor() {
    this.container = document.getElementById('killfeedContainer');
  }

  showJoin(nickname) {
    if (!this.container) return;
    const item = document.createElement('div');
    item.className = 'killfeed-item feed-join';

    const icon = document.createElement('span');
    icon.className = 'feed-icon';
    icon.textContent = '🪁';

    const user = document.createElement('strong');
    user.textContent = String(nickname || 'Jogador').slice(0, 16);

    const label = document.createElement('span');
    label.textContent = ' subiu na laje';

    item.append(icon, user, label);
    this._enqueueItem(item, 2800);
  }

  showGift(nickname, giftName) {
    if (!this.container) return;
    const item = document.createElement('div');
    item.className = 'killfeed-item feed-gift';

    const icon = document.createElement('span');
    icon.className = 'feed-icon';
    icon.textContent = '🎁';

    const user = document.createElement('strong');
    user.textContent = nickname;

    const label = document.createElement('span');
    label.textContent = ' · ' + giftName;

    item.append(icon, user, label);
    this._enqueueItem(item, 3200);
  }

  addKillfeedItem(winnerNick, loserNick, lineType) {
    if (!this.container) return;
    const item = document.createElement('div');
    const isParry = lineType === 'APAROU';
    item.className = 'killfeed-item ' + (isParry ? 'feed-parry' : 'feed-cut');

    const icon = document.createElement('span');
    icon.className = 'feed-icon';
    icon.textContent = isParry ? '🛡️' : '✂';

    const winner = document.createElement('strong');
    winner.textContent = winnerNick;

    const action = document.createElement('span');
    action.textContent = isParry ? ' aparou ' : ' cortou ';

    const loser = document.createElement('strong');
    loser.textContent = loserNick;

    item.append(icon, winner, action, loser);
    this._enqueueItem(item, 3200);
  }

  showStateMapToast(theme) {
    if (!theme || !this.container) return;
    const item = document.createElement('div');
    item.className = 'feed-item feed-map-change';
    const accentHex = '#' + (theme.accent || 0xf59e0b).toString(16).padStart(6, '0');
    item.style.borderColor = accentHex;
    item.style.boxShadow = `0 0 12px ${accentHex}40`;
    item.innerHTML = `<span style="color:${accentHex};font-weight:900;">📍 MAPA 3D:</span> <strong>${(theme.name || 'Brasil').toUpperCase()}</strong> <small style="opacity:0.85">(${(theme.region || '').toUpperCase()})</small>`;
    
    this._enqueueItem(item, 4500);
  }

  clear() {
    if (this.container) {
      this.container.replaceChildren();
    }
  }

  _enqueueItem(item, displayDuration = 3000) {
    while (this.container.children.length >= 3) {
      this.container.firstElementChild.remove();
    }
    this.container.append(item);

    setTimeout(() => {
      item.classList.add('feed-fade-out');
      setTimeout(() => item.remove(), 250);
    }, displayDuration);
  }
}
