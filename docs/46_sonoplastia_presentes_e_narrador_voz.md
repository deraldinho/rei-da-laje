> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 46 · Sonoplastia Procedural dos Presentes Épicos & Narração de Cortes por Voz (TTS)

**Data de Implementação**: 28/09/2026  
**Status**: Implementado e Testado (141/141 testes unitários aprovados)  
**Módulos Alterados**: 
- `frontend/src/engine/AudioManager.js`
- `frontend/src/engine/App.js`
- `frontend/index.html`
- `frontend/src/ui/game.css`
- `tests/audio-announcer.test.cjs`

---

## 1. Visão Geral e Motivação

Durante transmissões ao vivo no TikTok, o engajamento dos espectadores depende fortemente de recompensas sensoriais imediatas ao enviar presentes e de celebrações vibrantes a cada corte.

Para garantir funcionamento ininterrupto sem risco de quedas por bloqueio de CORS, problemas de conexão ou latência de carregamento de arquivos externos `.mp3`, a sonoplastia foi desenvolvida com **sintetizadores procedurais de alta fidelidade via Web Audio API nativa** somada a um **módulo de narração ao vivo por voz (Web Speech API / SpeechSynthesis)** em português do Brasil (`pt-BR`).

```mermaid
flowchart LR
    subgraph Eventos da Live
        CUT[Corte de Linha / Relinho]
        GIFT[Presente TikTok / Buff]
        KING[Novo Rei da Laje]
        SPAWN[Decolagem / #subir]
    end

    subgraph AudioManager
        direction TB
        subgraph Web Audio API
            S1[playCutSound - Tlec!]
            S2[playRoseCerolSound - Navalha Vidro]
            S3[playDonutChileSound - Rasgo Metálico]
            S4[playShieldEquipSound - Clang Dourado]
            S5[playTornadoSound - Vórtice Vento]
            S6[playLionRoarSound - Rugido Épico]
            S7[playLaunchSound - Whoosh Subida]
        end
        subgraph Web Speech API (pt-BR)
            T1[announceCut - Rotação de Bordões]
            T2[announceGift - Alerta Entusiasmado]
            T3[announceKing - Fanfarra & Prioridade Máxima]
        end
    end

    CUT --> S1 & T1
    GIFT --> S2 & S3 & S4 & S5 & S6 & T2
    KING --> T3
    SPAWN --> S7
```

---

## 2. Detalhamento da Sonoplastia Procedural dos Presentes

Todos os sons utilizam modulações e envelopes construídos em tempo real sem latência (< 5ms):

1. **Rosa / Linha Cerol (`playRoseCerolSound`)**:
   - **Timbre**: Cristalino e cortante com sensação de navalha de vidro em alta rotação.
   - **Arquitetura**: Dois osciladores combinados (senoidal em 1900 Hz -> 550 Hz e triangular em 2600 Hz -> 800 Hz) com envelope ultrarrápido (140 ms) e decay cintilante.

2. **Donut / Linha Chilena (`playDonutChileSound`)**:
   - **Timbre**: Agressivo, metálico, rasgo ácido e cortante.
   - **Arquitetura**: Onda dente de serra (*sawtooth*) varrendo de 1400 Hz para 280 Hz combinada a um filtro passa-faixa ressonante (*bandpass* em 2400 Hz com Q=5), gerando a assinatura acústica de carbeto de silício sob tração extrema.

3. **Capivara / Escudo de Kevlar (`playShieldEquipSound`)**:
   - **Timbre**: Blindagem sagrada, sino/gongo metálico dourado de proteção mística.
   - **Arquitetura**: Tríade harmônica ressonante (520 Hz, 1040 Hz e 1560 Hz) com decaimento exponencial de 350 ms, acompanhado de elevação de volume com sensação de campo de força ativado.

4. **Perfume / Tornado (`playTornadoSound`)**:
   - **Timbre**: Vórtice de ar giratório e voraz, sensação de redemoinho sugando o céu.
   - **Arquitetura**: Gerador de ruído aleatório processado por filtro *bandpass* cujo centro de frequência varre de 260 Hz até 1100 Hz e retorna a 180 Hz em 450 ms, com envelope dinâmico de rajada.

5. **Leão / Mestre do Céu (`playLionRoarSound`)**:
   - **Timbre**: Rugido gutural e imponente em baixa frequência somado a acordes de fanfarra celestial triunfal.
   - **Arquitetura**: Modulação em frequência (FM) com oscilador modulador de 38 Hz varrendo para 18 Hz que ataca a frequência da portadora (110 Hz -> 45 Hz), acrescida de um trio de trombetas nos tons D3 (146.83 Hz), A3 (220.00 Hz) e D4 (293.66 Hz) com sustain de 800 ms.

6. **Decolagem / Subida de Pipa (`playLaunchSound`)**:
   - **Timbre**: *Whoosh* aerodinâmico ascendente.
   - **Arquitetura**: Onda senoidal de 180 Hz subindo para 620 Hz em 180 ms ao ser lançada da laje.

---

## 3. Sistema de Narração ao Vivo por Voz (TTS / Web Speech API)

1. **Voz Nativa em Português (`pt-BR`)**:
   - Detecção dinâmica de vozes do sistema operacional e navegador (Chrome, Edge, OBS Studio) priorizando `pt-BR`.
   - Ritmo calibrado (`rate = 1.15`, `pitch = 1.05`) para dinâmica de locutor ágil e entusiasmado de relinho.

2. **Controle de Fila Inteligente e Debounce**:
   - Anúncios comuns de corte respeitam throttle de 1.900 ms para não encavalar o áudio se múltiplas pipas forem cortadas em rajada.
   - Anúncios épicos (Leão e Coroação do Rei da Laje) usam `priority: true`, interrompendo falas em andamento com `speechSynthesis.cancel()` para que a live vibre imediatamente com o momento histórico.

3. **Repertório de Bordões do Relinho**:
   - *"Tlec! {winner} cortou a pipa de {loser}!"*
   - *"{winner} passou o cerol em {loser}!"*
   - *"Pipa avoadora! {winner} cortou {loser}!"*
   - *"{winner} levou a melhor no relinho contra {loser}!"*
   - *"{winner} mandou a pipa de {loser} pro chão!"*

4. **Controle Independente no Cabeçalho**:
   - Botão `#btnVoice` ("🎙️ Narrador ON" / "🎙️ Narrador OFF") adicionado no `<nav class="game-controls">`.
   - O streamer pode ativar ou silenciar a narração de voz a qualquer instante sem desativar os efeitos sonoros das pipas e vice-versa.

---

## 4. Validação e Qualidade

- **Testes Unitários Automatizados**: `tests/audio-announcer.test.cjs` criado com sucesso.
- **Suíte de Testes**: **141 de 141 testes aprovados** com 100% de sucesso (`npm test` executado em 860 ms).
