/**
 * LeaderboardComponent.js
 * Gerenciador do Placar de Líderes, Pódio e Hall da Fama
 * 
 * Responsabilidades:
 * - Renderização segura do TOP 5 (DOM puro, sem innerHTML vulnerável)
 * - Animações de subida de rank (rank-up com highlight tátil)
 * - Exibição do Rei Ativo com coroa dourada
 * - Estatísticas de recordes da live e Hall da Fama
 */

export class LeaderboardComponent {
  constructor(options = {}) {
    this.leaderboardList = document.getElementById('leaderboardList');
    this.sessionRecord = document.getElementById('sessionRecord');
    this.hallOfFame = document.getElementById('hallOfFame');
    this.activeKing = document.getElementById('activeKing');
    this.card = document.querySelector('.leaderboard-card');
    this.onRankRise = options.onRankRise || (() => {});

    this.previousRanks = new Map();
    this.rankInitialized = false;
    this.competitionRankEnabled = false;
    this.currentLeaderId = null;
    this._combatCompact = false;
    this._expandedUntil = 0;
  }

  setCombatCompact(active) {
    if (!this.card) this.card = document.querySelector('.leaderboard-card');
    if (!this.card) return;
    const now = Date.now();
    if (this._expandedUntil && now >= this._expandedUntil) {
      this._expandedUntil = 0;
      this.card.classList.remove('spotlight-expanded');
    }
    this._combatCompact = Boolean(active);
    this.card.classList.toggle('combat-compact', this._combatCompact);
  }

  expandTemporarily(durationMs = 2200) {
    if (!this.card) this.card = document.querySelector('.leaderboard-card');
    if (!this.card) return;
    this._expandedUntil = Date.now() + Math.max(300, Number(durationMs) || 2200);
    this.card.classList.add('spotlight-expanded');
  }

  setTop5Scale(scale) {
    const val = Number(scale);
    if (!Number.isFinite(val) || val <= 0) return;
    if (!this.card) this.card = document.querySelector('.leaderboard-card');
    if (this.card) {
      this.card.style.setProperty('--top5-scale', String(val));
      this.card.style.transform = `scale(${val})`;
      this.card.style.transformOrigin = 'top left';
    }
  }

  setTop5Style(style) {
    const s = String(style || 'glass').trim().toLowerCase();
    if (!this.card) this.card = document.querySelector('.leaderboard-card');
    if (this.card) {
      this.card.classList.remove('theme-glass', 'theme-cyberpunk', 'theme-gold', 'theme-minimal');
      this.card.classList.add(`theme-${s}`);
    }
  }

  setTop5ShowExtras(show) {
    if (!this.card) this.card = document.querySelector('.leaderboard-card');
    if (this.card) {
      this.card.classList.toggle('hide-extras', !Boolean(show));
    }
  }

  updateSessionRecord(top) {
    if (!this.sessionRecord) return;
    const record = Array.isArray(top) ? top[0] : null;
    this.sessionRecord.textContent = record?.cuts > 0
      ? `RECORDE DA LIVE: ${String(record.nickname || 'Jogador').slice(0, 28)} · ${record.cuts} CORTES`
      : 'RECORDE DA LIVE: aguardando cortes';
  }

  updateCompetitionRanking(top, highlights, currentLeader, currentKing = null) {
    if (!this.leaderboardList) return;
    const leaders = Array.isArray(top) ? top.slice(0, 5) : [];
    this.competitionRankEnabled = true;
    let bestClimb = null;

    this.leaderboardList.replaceChildren();

    for (const [index, player] of leaders.entries()) {
      const row = document.createElement('div');
      row.className = 'leader-row competition-rank rank-' + (index + 1);

      const priorRank = this.previousRanks.get(String(player.userId));
      if (this.rankInitialized && (priorRank === undefined || priorRank > index)) {
        row.classList.add('rank-up');
        if (index < 5 && (priorRank !== undefined || player.cuts > 0) && !bestClimb) {
          bestClimb = { nickname: player.nickname, rank: index + 1 };
        }
      }

      if (currentLeader?.userId === player.userId) {
        row.classList.add('leader-current');
      }

      const place = document.createElement('span');
      place.className = 'leader-rank';
      place.textContent = ['🥇', '🥈', '🥉', '04', '05'][index];

      const avatar = document.createElement('span');
      avatar.className = 'leader-avatar';
      avatar.textContent = String(player.nickname || '?').slice(0, 1).toUpperCase();

      if (/^https:\/\/[^\s]+$/i.test(player.profilePictureUrl || '')) {
        const picture = document.createElement('img');
        picture.src = player.profilePictureUrl;
        picture.alt = '';
        picture.referrerPolicy = 'no-referrer';
        picture.onerror = () => picture.remove();
        avatar.append(picture);
      }

      const name = document.createElement('span');
      name.className = 'leader-name';
      name.textContent = String(player.nickname || 'Jogador').slice(0, 36);

      const values = document.createElement('span');
      values.className = 'rank-values';

      const cuts = document.createElement('strong');
      cuts.className = 'leader-cuts';
      cuts.textContent = String(player.cuts || 0) + ' ✂';

      const streak = document.createElement('small');
      streak.textContent = '🔥 ' + (player.bestStreak || 0) + ' sequência';

      values.append(cuts, streak);
      row.append(place, avatar, name, values);
      this.leaderboardList.append(row);
    }

    if (!leaders.length) {
      const empty = document.createElement('p');
      empty.className = 'ranking-empty';
      empty.textContent = 'Comente e conquiste o primeiro corte!';
      this.leaderboardList.append(empty);
    }

    this.previousRanks = new Map(leaders.map((p, i) => [String(p.userId), i]));
    this.rankInitialized = true;

    if (bestClimb) {
      this.onRankRise(bestClimb.nickname, bestClimb.rank);
    }

    if (this.hallOfFame) {
      this.hallOfFame.replaceChildren();
      const categories = [
        ['🔥 MAIOR SEQUÊNCIA', 'streak', 'bestStreak'],
        ['👑 REIS DERRUBADOS', 'kingCuts', 'kingCuts'],
        ['🎁 MAIS PRESENTES', 'gifts', 'gifts']
      ];

      for (const [label, field, suffix] of categories) {
        const record = highlights?.[field];
        const line = document.createElement('div');
        line.className = 'hall-row';

        const tag = document.createElement('span');
        tag.textContent = label;

        const value = document.createElement('strong');
        value.textContent = record
          ? String(record.nickname || 'Jogador').slice(0, 18) + ' · ' + (record[suffix] || 0)
          : 'EM DISPUTA';

        line.append(tag, value);
        this.hallOfFame.append(line);
      }
    }

    if (this.activeKing) {
      this.activeKing.textContent = currentKing?.userId
        ? '👑 REI DA LAJE · ' + String(currentKing.nickname || 'Jogador').slice(0, 28) + ' · ' + (currentKing.score || 0) + ' CORTES'
        : (currentLeader?.userId
            ? '👑 LÍDER ATUAL · ' + String(currentLeader.nickname || 'Jogador').slice(0, 28) + ' · ' + (currentLeader.score || 0) + ' CORTES'
            : '👑 COROA EM DISPUTA');
    }

    this.updateSessionRecord(top);
  }

  updateLeaderboard(kites) {
    if (this.competitionRankEnabled || !this.leaderboardList) return;
    this.leaderboardList.replaceChildren();
    const leaders = [...kites].sort((a, b) => b.score - a.score || b.streak - a.streak).slice(0, 5);

    if (!leaders.length) {
      const empty = document.createElement('p');
      empty.className = 'ranking-empty';
      empty.textContent = 'O próximo Rei da Laje pode ser você.';
      this.leaderboardList.append(empty);
      return;
    }

    leaders.forEach((kite, index) => {
      const row = document.createElement('div');
      row.className = 'leader-row';

      const rank = document.createElement('span');
      rank.className = 'leader-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const avatar = document.createElement('span');
      avatar.className = 'leader-avatar';
      avatar.textContent = kite.isKing ? '♛' : kite.nickname.slice(0, 1).toUpperCase();

      if (/^https?:\/\//i.test(kite.profilePictureUrl || '')) {
        const img = document.createElement('img');
        img.src = kite.profilePictureUrl;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => img.remove();
        avatar.append(img);
      }

      const name = document.createElement('span');
      name.className = 'leader-name';
      name.textContent = kite.nickname;

      const score = document.createElement('strong');
      score.className = 'leader-cuts';
      score.textContent = kite.score;

      if (kite.userId === this.currentLeaderId) {
        row.classList.add('leader-current');
      }

      row.append(rank, avatar, name, score);
      this.leaderboardList.append(row);
    });
  }
}
