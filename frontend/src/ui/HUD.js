/**
 * HUD.js — UI/UX Controller & Facade
 * 
 * Arquitetura de UI/UX baseada no Manifesto "Kinetic Concrete & Cord" e /3d-web-experience
 * Atua como fachada unificada e orquestrador de componentes desacoplados:
 * - ThreeExperienceHub: Telemetria da Rosa dos Ventos 3D, indicador de Tema/Monumento e WebGL status
 * - HeaderComponent: Identidade, status de conexão e contadores de pipas/fila
 * - LeaderboardComponent: TOP 5, Hall da Fama e Card do Rei da Laje
 * - KillfeedComponent: Feed tático de eventos e avisos de mapa
 * - BannerSystem: Banners centrais de liderança, manobras e presentes com auto-dismiss
 * - GiftDockComponent: Dock de presentes e indicadores táticos
 */

import { ThreeExperienceHub } from './components/ThreeExperienceHub.js';
import { HeaderComponent } from './components/HeaderComponent.js';
import { LeaderboardComponent } from './components/LeaderboardComponent.js';
import { KillfeedComponent } from './components/KillfeedComponent.js';
import { BannerSystem } from './components/BannerSystem.js';
import { GiftDockComponent } from './components/GiftDockComponent.js';

export class HUD {
  constructor() {
    // 1. Inicializa subsistemas modulares da arquitetura
    this.experience3D = new ThreeExperienceHub();
    this.header = new HeaderComponent();
    this.leaderboard = new LeaderboardComponent({
      onRankRise: (nickname, rank) => this.showRankRise(nickname, rank)
    });
    this.killfeed = new KillfeedComponent();
    this.banners = new BannerSystem({
      onGiftHighlighted: (name, duration) => this.highlightGiftBadge(name, duration)
    });
    this.dock = new GiftDockComponent();

    // 2. Vincula propriedades DOM diretas para retrocompatibilidade com testes e OBS
    this.leaderboardList = this.leaderboard.leaderboardList;
    this.kiteCounter = this.header.kiteCounter;
    this.killfeedContainer = this.killfeed.container;
    this.leadershipBanner = this.banners.leadershipBanner;
    this.queueCounter = this.header.queueCounter;
    this.sessionRecord = this.leaderboard.sessionRecord;
    this.competitionNotice = this.banners.competitionNotice;
    this.hallOfFame = this.leaderboard.hallOfFame;
    this.activeKing = this.leaderboard.activeKing;
    this.maneuverToast = this.banners.maneuverToast;
    this.giftCelebration = this.banners.giftCelebration;

    // 3. Listener global de transição de tema estadual 3D
    if (typeof window !== 'undefined') {
      window.addEventListener('pipa:map_changed', (e) => {
        if (e.detail?.theme) {
          const themeName = (e.detail.theme.name || 'Brasil').toUpperCase();
          this.header.setBrandEyebrow(`DISPUTA DE RELINHO · 📍 ${themeName}`);
          this.experience3D.updateTheme(e.detail.theme);
        }
      });
    }
  }

  // Getters e Setters para sincronização bidirecional transparente
  get currentLeaderId() { return this.leaderboard.currentLeaderId; }
  set currentLeaderId(id) { this.leaderboard.currentLeaderId = id; }

  get competitionRankEnabled() { return this.leaderboard.competitionRankEnabled; }
  set competitionRankEnabled(val) { this.leaderboard.competitionRankEnabled = val; }

  get previousRanks() { return this.leaderboard.previousRanks; }
  set previousRanks(val) { this.leaderboard.previousRanks = val; }

  get rankInitialized() { return this.leaderboard.rankInitialized; }
  set rankInitialized(val) { this.leaderboard.rankInitialized = val; }

  get giftQueue() { return this.banners.giftQueue; }
  get giftQueueBusy() { return this.banners.giftQueueBusy; }
  set giftQueueBusy(val) { this.banners.giftQueueBusy = val; }

  setTop5Scale(scale) {
    this.leaderboard.setTop5Scale(scale);
  }

  setTop5Style(style) {
    this.leaderboard.setTop5Style(style);
  }

  setTop5ShowExtras(show) {
    this.leaderboard.setTop5ShowExtras(show);
  }

  setCombatCompact(active) {
    this.leaderboard.setCombatCompact(active);
  }

  expandLeaderboardTemporarily(durationMs = 2200) {
    this.leaderboard.expandTemporarily(durationMs);
  }

  updateSessionRecord(top) {
    this.leaderboard.updateSessionRecord(top);
  }

  updateCompetitionRanking(top, highlights, currentLeader, currentKing = null) {
    this.leaderboard.updateCompetitionRanking(top, highlights, currentLeader, currentKing);
  }

  showRankRise(nickname, rank) {
    this.banners.showRankRise(nickname, rank);
  }

  updateQueue(length) {
    this.header.updateQueue(length);
  }

  showNotice(message, duration = 3500) {
    this.banners.showNotice(message, duration);
  }

  showManeuver(nickname, name) {
    this.banners.showManeuver(nickname, name);
  }

  showChampionCut(winner, loser) {
    this.banners.showChampionCut(winner, loser);
  }

  showMilestone(nickname, streak) {
    this.banners.showMilestone(nickname, streak);
  }

  updateWind(wind) {
    // Sincroniza tanto a telemetria do dock inferior quanto a Rosa dos Ventos 3D
    this.dock.updateWind(wind);
    this.experience3D.updateWindVector(wind);
  }

  celebrateGift(theme) {
    this.banners.celebrateGift(theme);
  }

  showNextGift() {
    this.banners._showNextGift();
  }

  announceLeader(data) {
    this.currentLeaderId = data?.userId || null;
    this.banners.announceLeader(data);
  }

  highlightGiftBadge(name, duration = 3) {
    this.dock.highlightGiftBadge(name, duration);
  }

  showJoin(nickname) {
    this.killfeed.showJoin(nickname);
  }

  showGift(nickname, giftName) {
    this.highlightGiftBadge(giftName, 3.5);
    this.killfeed.showGift(nickname, giftName);
  }

  addKillfeedItem(winnerNick, loserNick, lineType) {
    this.killfeed.addKillfeedItem(winnerNick, loserNick, lineType);
  }

  showStateMapToast(theme) {
    if (!theme) return;
    const themeName = (theme.name || 'Brasil').toUpperCase();
    this.header.setBrandEyebrow(`DISPUTA DE RELINHO · 📍 ${themeName}`);
    this.experience3D.updateTheme(theme);
    this.killfeed.showStateMapToast(theme);
  }

  updateKiteCount(count) {
    this.header.updateKiteCount(count);
  }

  setLiveStatus(status) {
    // Validação de sincronização TikTok: reconhece transport_restored e room_found como conexão ativa
    const connected = Boolean(status?.connected);
    const reconnecting = Boolean(status?.transportReconnecting || status?.phase === 'reconnecting' || status?.retrying);
    const active = connected && !reconnecting && (
      Boolean(status?.eventsActive) ||
      status?.phase === 'events_active' ||
      status?.phase === 'transport_restored' ||
      status?.phase === 'room_found'
    );
    this.header.setLiveStatus(status);
  }

  setConnection(connected) {
    this.header.setConnection(connected);
  }

  showBoost() {
    this.dock.showBoost();
  }

  updateLeaderboard(kites) {
    this.leaderboard.updateLeaderboard(kites);
  }

  clearKillfeed() {
    this.killfeed.clear();
  }
}
