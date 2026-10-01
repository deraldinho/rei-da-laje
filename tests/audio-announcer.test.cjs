const test = require('node:test');
const assert = require('node:assert/strict');

// Simulação de ambiente Web Audio API e Web Speech API para testes Node.js
function createMockAudioContext() {
  const destination = {};
  const mockNode = {
    connect: () => destination,
    disconnect: () => {},
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    start: () => {},
    stop: () => {},
    gain: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {}
    },
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {}
    },
    Q: {
      setValueAtTime: () => {}
    }
  };

  return {
    state: 'running',
    currentTime: 1.0,
    sampleRate: 44100,
    destination,
    createOscillator: () => ({ ...mockNode }),
    createGain: () => ({ ...mockNode }),
    createBiquadFilter: () => ({ ...mockNode }),
    createBufferSource: () => ({ ...mockNode }),
    createBuffer: (channels, length, sampleRate) => ({
      getChannelData: () => new Float32Array(length)
    }),
    resume: async () => {}
  };
}

test('AudioManager possui sonoplastia procedural dos presentes e sistema TTS', async (t) => {
  // Configura mocks globais temporários
  const spokenList = [];
  global.window = {
    AudioContext: function() { return createMockAudioContext(); },
    speechSynthesis: {
      speaking: false,
      getVoices: () => [{ lang: 'pt-BR', name: 'Google Português' }],
      speak: (utterance) => spokenList.push(utterance.text),
      cancel: () => spokenList.push('[CANCEL]')
    }
  };
  global.SpeechSynthesisUtterance = function(text) {
    this.text = text;
    this.lang = 'pt-BR';
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
  };

  // Import dinâmico do módulo ES6
  const { AudioManager } = await import('../frontend/src/engine/AudioManager.js');
  const audio = new AudioManager();

  await t.test('instancia corretamente e inicializa contexto e TTS', () => {
    assert.ok(audio.ctx, 'AudioContext deve ser inicializado');
    assert.equal(audio.ttsEnabled, true, 'TTS deve iniciar ativo por padrão');
    assert.equal(audio.isMuted, false, 'Áudio não deve iniciar mutado por padrão');
  });

  await t.test('métodos de som procedural de presentes e manobras executam sem exceção', () => {
    assert.doesNotThrow(() => audio.playRoseCerolSound(), 'playRoseCerolSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playDonutChileSound(), 'playDonutChileSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playShieldEquipSound(), 'playShieldEquipSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playTornadoSound(), 'playTornadoSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playLionRoarSound(), 'playLionRoarSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playLaunchSound(), 'playLaunchSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playCutSound(), 'playCutSound não deve lançar erro');
    assert.doesNotThrow(() => audio.playVictoryFanfare(), 'playVictoryFanfare não deve lançar erro');
    assert.doesNotThrow(() => audio.playCatchSound(), 'playCatchSound não deve lançar erro');
  });

  await t.test('isMuted impede emissão sonora procedural', () => {
    audio.isMuted = true;
    assert.doesNotThrow(() => audio.playRoseCerolSound());
    assert.doesNotThrow(() => audio.playLionRoarSound());
    audio.isMuted = false;
  });

  await t.test('sistema TTS narra cortes com rotação de frases', () => {
    spokenList.length = 0;
    audio.announceCut('Pedrinho', 'Juninho');
    assert.equal(spokenList.length, 1);
    assert.match(spokenList[0], /Pedrinho/);
    assert.match(spokenList[0], /Juninho/);
  });

  await t.test('anúncio de presentes épicos gera falas apropriadas', () => {
    spokenList.length = 0;
    // Rosa
    audio.lastSpokenAt = 0;
    audio.announceGift('Ana', 'Rosa', 'cerol');
    assert.match(spokenList[spokenList.length - 1], /Ana.*Rosa.*Cerol/i);

    // Donut
    audio.lastSpokenAt = 0;
    audio.announceGift('Beto', 'Donut', 'chile');
    assert.match(spokenList[spokenList.length - 1], /Beto.*Donut.*Chilena/i);

    // Capivara
    audio.lastSpokenAt = 0;
    audio.announceGift('Carla', 'Capivara', 'kevlar');
    assert.match(spokenList[spokenList.length - 1], /Carla.*Capivara.*Escudo/i);

    // Leão (prioritário, cancela fila)
    audio.announceGift('Mestre', 'Leão', 'mestre_do_ceu');
    assert.ok(spokenList.includes('[CANCEL]'));
    assert.match(spokenList[spokenList.length - 1], /Mestre.*Leão.*Mestre do Céu/i);
  });

  await t.test('anúncio do Rei da Laje tem prioridade máxima', () => {
    spokenList.length = 0;
    audio.announceKing('Zezinho');
    assert.ok(spokenList.includes('[CANCEL]'));
    assert.match(spokenList[spokenList.length - 1], /Zezinho.*Rei da Laje/i);
  });

  await t.test('toggleTTS liga e desliga narrador corretamente', () => {
    assert.equal(audio.toggleTTS(), false);
    assert.equal(audio.ttsEnabled, false);
    spokenList.length = 0;
    audio.announceKing('Ignorado');
    assert.equal(spokenList.length, 0, 'Com TTS desligado nenhuma fala deve ser emitida');

    assert.equal(audio.toggleTTS(), true);
    assert.equal(audio.ttsEnabled, true);
  });

  await t.test('Boombox da laje inicia, para e executa passos procedurais sem erro', () => {
    assert.doesNotThrow(() => audio.setBoombox(true));
    assert.equal(audio.boomboxEnabled, true);
    assert.doesNotThrow(() => audio.triggerBoomboxStep(0));
    assert.doesNotThrow(() => audio.triggerBoomboxStep(2));
    assert.doesNotThrow(() => audio.triggerBoomboxStep(4));
    assert.doesNotThrow(() => audio.triggerBoomboxStep(6));
    assert.doesNotThrow(() => audio.setBoombox(false));
    assert.equal(audio.boomboxEnabled, false);
    assert.equal(audio.boomboxTimer, null);
  });

  // Limpeza de globais
  delete global.window;
  delete global.SpeechSynthesisUtterance;
});
