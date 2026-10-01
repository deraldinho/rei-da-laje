/**
 * Gerenciador de Áudio Web Audio API (Sintetizador Procedural de Sons)
 * Zero dependência de arquivos externos que podem quebrar em live
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ttsEnabled = true;
    this.ttsVoice = null;
    this.lastSpokenAt = 0;
    this.lastCutPhraseIndex = -1;
    this.boomboxEnabled = true;
    this.boomboxTimer = null;
    this.boomboxStep = 0;
    this.initAudioContext();
    this.initTTS();
  }

  initAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
      try {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.boomboxGain = this.ctx.createGain();
        this.boomboxGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        this.boomboxGain.connect(this.masterGain);
      } catch (_) {}
    }
  }

  get dest() {
    return this.sfxGain || this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  setMasterVolume(vol) {
    const v = Math.min(1, Math.max(0, Number(vol) || 0));
    this.masterVolume = v;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  setTTS(enabled, volume) {
    if (enabled !== undefined) {
      this.ttsEnabled = Boolean(enabled);
      if (!this.ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
    }
    if (volume !== undefined) {
      this.ttsVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    }
  }

  setSFX(enabled, volume) {
    if (enabled !== undefined) {
      this.sfxEnabled = Boolean(enabled);
    }
    if (volume !== undefined) {
      this.sfxVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    }
    if (this.ctx && this.sfxGain) {
      const targetGain = (this.sfxEnabled !== false) ? (this.sfxVolume ?? 0.85) : 0;
      this.sfxGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
  }

  setBoombox(enabled) {
    this.boomboxEnabled = Boolean(enabled);
    if (this.ctx && this.boomboxGain) {
      const targetGain = (this.boomboxEnabled && !this.isMuted) ? 0.12 : 0;
      this.boomboxGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    if (this.boomboxEnabled) {
      this.startBoombox();
    } else {
      this.stopBoombox();
    }
  }

  startBoombox() {
    if (!this.ctx || !this.boomboxEnabled || this.boomboxTimer) return;
    this.boomboxStep = 0;
    this.boomboxTimer = setInterval(() => {
      if (!this.ctx || !this.boomboxEnabled || this.isMuted) return;
      this.triggerBoomboxStep(this.boomboxStep);
      this.boomboxStep = (this.boomboxStep + 1) % 8;
    }, 240);
    if (this.boomboxTimer && typeof this.boomboxTimer.unref === 'function') {
      this.boomboxTimer.unref();
    }
  }

  stopBoombox() {
    if (this.boomboxTimer) {
      clearInterval(this.boomboxTimer);
      this.boomboxTimer = null;
    }
  }

  triggerBoomboxStep(step) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const dest = this.boomboxGain || this.dest;
    if (!dest) return;

    // Passo 0, 4, 6: Bumbo grave característico da laje
    if (step === 0 || step === 4 || step === 6) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const startFreq = step === 0 ? 130 : 100;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (_) {}
    }

    // Passo 2, 6: Toque sincopado agudo (tamborim/agulha)
    if (step === 2 || step === 6) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(step === 2 ? 820 : 960, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.05);
      } catch (_) {}
    }

    // Passo 4: Estalo de caixa no contratempo
    if (step === 4) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (_) {}
    }
  }

  initTTS() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const pickVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices() || [];
        // Prioriza pt-BR, ou qualquer voz em português
        this.ttsVoice = voices.find(v => v.lang === 'pt-BR') ||
                        voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt')) ||
                        voices[0] || null;
      } catch (_) {
        this.ttsVoice = null;
      }
    };
    pickVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume?.();
      if (this.boomboxEnabled && !this.boomboxTimer) {
        this.startBoombox();
      }
    } else if (this.ctx && this.boomboxEnabled && !this.boomboxTimer) {
      this.startBoombox();
    }
  }

  /**
   * Alterna narração de voz da live (TTS)
   * @returns {boolean} Novo estado ativado/desativado
   */
  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    if (!this.ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    return this.ttsEnabled;
  }

  /**
   * Fala uma frase com o sintetizador de voz nativo do navegador
   * @param {string} text Frase a ser narrada
   * @param {boolean} priority Se verdadeiro, cancela a fila anterior e fala imediatamente
   */
  speak(text, priority = false) {
    if (!this.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || typeof text !== 'string') return;

    const now = Date.now();
    // Throttle para frases comuns de corte (evita sobreposição frenética)
    if (!priority && now - this.lastSpokenAt < 1900) {
      return;
    }

    try {
      if (priority) {
        window.speechSynthesis.cancel();
      } else if (window.speechSynthesis.speaking) {
        return; // não encavala falas normais
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.ttsVoice) utterance.voice = this.ttsVoice;
      utterance.lang = this.ttsVoice?.lang || 'pt-BR';
      utterance.rate = 1.15; // Ritmo ágil de locutor esportivo
      utterance.pitch = 1.05;
      utterance.volume = this.ttsVolume !== undefined ? this.ttsVolume : 0.95;

      utterance.onend = () => {
        this.lastSpokenAt = Date.now();
      };
      utterance.onerror = () => {
        this.lastSpokenAt = Date.now();
      };

      this.lastSpokenAt = now;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      // Falha silenciosa de sintetizador de voz nativo não interrompe a live
    }
  }

  /**
   * Narra o corte de linha com variações autênticas da cultura de pipa
   */
  announceCut(winnerNick, loserNick) {
    const winner = String(winnerNick || 'Jogador').slice(0, 24);
    const loser = String(loserNick || 'adversário').slice(0, 24);

    const phrases = [
      `Tlec! ${winner} cortou no retão a pipa de ${loser}!`,
      `${winner} mandou um mergulho e cortou a pipa de ${loser}!`,
      `${winner} cortou bonito a pipa de ${loser} na despicada!`,
      `${winner} levou a melhor no relo lateral contra ${loser}!`,
      `Pipa avoadora! ${winner} mandou a pipa de ${loser} pro chão!`
    ];

    let index = Math.floor(Math.random() * phrases.length);
    if (index === this.lastCutPhraseIndex) {
      index = (index + 1) % phrases.length;
    }
    this.lastCutPhraseIndex = index;
    this.speak(phrases[index], false);
  }

  /**
   * Narra presentes épicos com voz entusiasta e gíria paulista
   */
  announceGift(nickname, giftName, lineType) {
    const nick = String(nickname || 'Alguém').slice(0, 24);
    const gift = String(giftName || '').toLowerCase();

    if (gift.includes('leão') || gift.includes('leao') || lineType === 'mestre_do_ceu') {
      this.speak(`Atenção live! ${nick} mandou um Leão! O Mestre do Céu chegou na disputa!`, true);
    } else if (gift.includes('donut') || lineType === 'chile') {
      this.speak(`${nick} mandou um Donut! Linha Chilena e mergulho veloz no céu!`, false);
    } else if (gift.includes('rosa') || lineType === 'cerol') {
      this.speak(`${nick} mandou uma Rosa! Cerol afiado no retão pra cortar quem passar na frente!`, false);
    } else if (gift.includes('capivara') || lineType === 'kevlar') {
      this.speak(`${nick} mandou Capivara! Relo lateral blindado com escudo!`, false);
    } else if (gift.includes('perfume') || lineType === 'tornado') {
      this.speak(`${nick} mandou Perfume! Despicada no vento e tornado no ar!`, false);
    } else if (giftName) {
      this.speak(`${nick} mandou ${giftName} e fortaleceu a disputa!`, false);
    }
  }

  /**
   * Narra a coroação do novo Rei da Laje
   */
  announceKing(nickname) {
    const nick = String(nickname || 'Jogador').slice(0, 24);
    this.speak(`Atenção geral! ${nick} assumiu o trono e é o novo Rei da Laje!`, true);
  }

  /**
   * Som de Corte de Linha ("Tlec!")
   * Transiente ultrarrápido com queda de frequência e estalo metálico
   */
  playCutSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Frequência despenca de 850Hz para 45Hz em 45ms (estalo nítido de nylon)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.045);

    // Envelope de ganho percussivo
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.dest);

    osc.start(now);
    osc.stop(now + 0.05);

    // Camada de ruído para simular o atrito do cerol
    this.playNoiseSnap(now);
  }

  getNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;
    if (!this.ctx) return null;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.05));
    this._noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this._noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return this._noiseBuffer;
  }

  playNoiseSnap(now) {
    if (!this.ctx) return;
    const buffer = this.getNoiseBuffer();
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest);

    noise.start(now);
    noise.stop(now + 0.03);
  }

  /**
   * Presente Rosa: Cerol Afiado
   * Timbre cristalino, corte afiado de vidro com zunido de alta frequência
   */
  playRoseCerolSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1900, now);
    osc1.frequency.exponentialRampToValueAtTime(550, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2600, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.14);
    osc2.stop(now + 0.14);
  }

  /**
   * Presente Donut: Linha Chilena
   * Timbre cortante agressivo e metálico com raspagem ácida
   */
  playDonutChileSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Presente Capivara: Escudo de Kevlar
   * Blindagem metálica ressonante e harmônica dourada ("Clang sagrado")
   */
  playShieldEquipSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const freqs = [520, 1040, 1560]; // Frequências de gongo / sino de blindagem

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.dest);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  /**
   * Presente Perfume: Tornado / Turbilhão
   * Som de vórtice de ar giratório com sweep de passagem de vento
   */
  playTornadoSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.45)); // 450ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.linearRampToValueAtTime(1100, now + 0.22);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.45);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest);

    noise.start(now);
    noise.stop(now + 0.45);
  }

  /**
   * Presente Épico Leão: Rugido do Mestre do Céu
   * Rugido sintético encorpado e imponente em baixa frequência + fanfarra divina
   */
  playLionRoarSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;

    // 1. Modulador FM grave para criar a textura gutural de rugido
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrier = this.ctx.createOscillator();
    const mainGain = this.ctx.createGain();

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(38, now);
    mod.frequency.linearRampToValueAtTime(18, now + 0.65);

    modGain.gain.setValueAtTime(65, now);
    modGain.gain.linearRampToValueAtTime(20, now + 0.65);

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(110, now);
    carrier.frequency.exponentialRampToValueAtTime(45, now + 0.7);

    mainGain.gain.setValueAtTime(0.45, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(mainGain);
    mainGain.connect(this.dest);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.75);
    carrier.stop(now + 0.75);

    // 2. Acorde de trombetas celestiais de fundo
    [146.83, 220.00, 293.66].forEach((noteFreq) => { // D3, A3, D4
      const horn = this.ctx.createOscillator();
      const hornGain = this.ctx.createGain();

      horn.type = 'triangle';
      horn.frequency.setValueAtTime(noteFreq, now + 0.05);

      hornGain.gain.setValueAtTime(0, now + 0.05);
      hornGain.gain.linearRampToValueAtTime(0.2, now + 0.15);
      hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      horn.connect(hornGain);
      hornGain.connect(this.dest);

      horn.start(now + 0.05);
      horn.stop(now + 0.8);
    });
  }

  /**
   * Som de Subida / Decolagem de Pipa (Spawn / #subir)
   * Whoosh aerodinâmico ascendente veloz
   */
  playLaunchSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.dest);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Som de Faísca / Fricção de Linhas Cruzando (Trançado)
   */
  playSparksSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200 + Math.random() * 800, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.dest);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Fanfarra do Rei da Laje (Streak de 5 cortes)
   */
  playVictoryFanfare() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + (i * 0.09);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.dest);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  /**
   * Som de Resgate de Pipa (#pegar)
   */
  playCatchSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.dest);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  destroy() {
    this.stopBoombox();
    this.isMuted = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    if (this.ctx && typeof this.ctx.close === 'function' && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch (_) {}
    }
    this.ctx = null;
    this._noiseBuffer = null;
  }
}

