/**
 * BannerSystem.js
 * Sistema de Pílulas e Banners Centrais com Auto-Dismiss
 * 
 * Responsabilidades:
 * - Notificação de Novo Líder da Arena (leadershipBanner, 2.5s)
 * - Avisos de Competição, Queda do Rei e Sequências Épicas (competitionNotice)
 * - Toasts de Manobras e Golpes Especiais (maneuverToast, 2.7s)
 * - Celebração cinematográfica de Presentes (giftCelebration) com fila inteligente
 * - Preservação da Área Protegida de Voo (10% a 75% da altura livre de sobreposições permanentes)
 */

export class BannerSystem {
  constructor(options = {}) {
    this.leadershipBanner = document.getElementById('leadershipBanner');
    this.competitionNotice = document.getElementById('competitionNotice');
    this.maneuverToast = document.getElementById('maneuverToast');
    this.giftCelebration = document.getElementById('giftCelebration');
    this.onGiftHighlighted = options.onGiftHighlighted || (() => {});

    this.giftQueue = [];
    this.giftQueueBusy = false;
    this.noticeTimer = null;
    this.maneuverToastTimer = null;
    this.leadershipTimer = null;
    this.giftTimer = null;
  }

  announceLeader(data) {
    if (!data?.userId || !this.leadershipBanner) return;
    const nameEl = document.getElementById('leadershipName');
    const scoreEl = document.getElementById('leadershipScore');
    if (nameEl) nameEl.textContent = String(data.nickname || 'Jogador').slice(0, 60);
    if (scoreEl) scoreEl.textContent = `${Number(data.score) || 0} cortes · 1º lugar`;

    this.leadershipBanner.hidden = false;
    this.leadershipBanner.classList.remove('leadership-arrive');
    void this.leadershipBanner.offsetWidth;
    this.leadershipBanner.classList.add('leadership-arrive');

    clearTimeout(this.leadershipTimer);
    this.leadershipTimer = setTimeout(() => {
      this.leadershipBanner.hidden = true;
    }, 2500);
  }

  showNotice(message, duration = 3500) {
    if (!this.competitionNotice) return;
    this.competitionNotice.textContent = message;
    this.competitionNotice.hidden = false;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.competitionNotice.hidden = true;
    }, duration);
  }

  showManeuver(nickname, name) {
    this.onGiftHighlighted(name, 3.5);
    const labels = {
      retao: 'RETÃO',
      despicar: 'DESPICADA',
      perseguir: 'PERSEGUIÇÃO',
      aparar_retao: 'APARADA NO RETÃO',
      aparar_despicada: 'APARADA NA DESPICADA',
      tenteio: 'TENTEIO',
      largada: 'LARGADA',
      mergulho_parafuso: 'MERGULHO PARAFUSO',
      lacada: 'LAÇADA'
    };
    const message = `${String(nickname || 'Jogador').slice(0, 36)} · ${labels[name] || 'MANOBRA'}`;

    if (!this.maneuverToast) {
      this.showNotice(message);
      return;
    }

    this.maneuverToast.textContent = '⚡ ' + message;
    this.maneuverToast.hidden = false;
    this.maneuverToast.classList.remove('maneuver-toast-arrive');
    void this.maneuverToast.offsetWidth;
    this.maneuverToast.classList.add('maneuver-toast-arrive');

    clearTimeout(this.maneuverToastTimer);
    this.maneuverToastTimer = setTimeout(() => {
      this.maneuverToast.hidden = true;
    }, 2700);
  }

  showChampionCut(winner, loser) {
    this.showNotice(
      `👑 O REI CAIU! ${String(winner || 'Jogador').slice(0, 30)} cortou ${String(loser || 'o líder').slice(0, 30)}`,
      5000
    );
  }

  showMilestone(nickname, streak) {
    const name = String(nickname || 'Jogador').slice(0, 30);
    const tier = {
      2: 'TÁ ESQUENTANDO!',
      3: 'SEQUÊNCIA INSANA!',
      5: 'REI DA LAJE!',
      10: 'LENDA DA LIVE!'
    }[Number(streak)] || 'SEQUÊNCIA DE CORTES!';

    this.showNotice(`🔥 ${tier} ${name} · ${Number(streak) || 0} CORTES`, 4400);
  }

  showRankRise(nickname, rank) {
    this.showNotice(`🚀 ${String(nickname || 'Jogador').slice(0, 25)} SUBIU PARA O TOP ${rank}!`, 2600);
  }

  celebrateGift(theme) {
    if (!this.giftCelebration) return;
    this.giftQueue.push(theme);
    if (this.giftQueue.length > 8) this.giftQueue.shift();
    this._showNextGift();
  }

  _showNextGift() {
    if (this.giftQueueBusy || !this.giftQueue.length || !this.giftCelebration) return;
    this.giftQueueBusy = true;
    const theme = this.giftQueue.shift();

    const icon = document.getElementById('giftCelebrationIcon');
    const title = document.getElementById('giftCelebrationTitle');
    const detail = document.getElementById('giftCelebrationDetail');

    if (icon) {
      const safeIcon = /^https:\/\/[^\s]+$/i.test(theme.iconUrl || '') ? theme.iconUrl : '';
      icon.hidden = !safeIcon;
      if (safeIcon) {
        icon.src = safeIcon;
        icon.onerror = () => { icon.hidden = true; };
      } else {
        icon.removeAttribute('src');
      }
    }

    if (title) title.textContent = `${theme.symbol} ${theme.name.toUpperCase()} ×${theme.count}`;
    if (detail) detail.textContent = `${theme.nickname} · ${theme.label}`;

    this.giftCelebration.className = 'gift-celebration ' + theme.tier;
    this.giftCelebration.hidden = false;

    clearTimeout(this.giftTimer);
    this.giftTimer = setTimeout(() => {
      this.giftCelebration.hidden = true;
      this.giftQueueBusy = false;
      this._showNextGift();
    }, Math.min(3800, Math.max(1450, (theme.duration || 1) * 650)));
  }
}
