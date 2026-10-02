> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 47 · Manobras Paulistas (Retão, Mergulho, Despicada, Relo Lateral), Movimento por Presentes e Controles de Teclado (1, 2, 3)

**Data de Implementação**: 28/09/2026  
**Status**: Implementado, Integrado e Testado (148/148 testes aprovados)  
**Módulos Alterados**:
- `frontend/src/engine/Maneuvers.js`
- `frontend/src/engine/ManeuverVisuals.js`
- `frontend/src/engine/App.js`
- `frontend/src/engine/AudioManager.js`
- `backend/rules/giftConfig.js`
- `backend/arenaLiveState.js`
- `tests/maneuvers-paulistas-controls.test.cjs`

---

## 1. Visão Geral e Filosofia

Atendendo à demanda de alinhamento com a **gíria paulista de pipa** e a dinâmica competitiva de live streaming:

1. **Movimentação Exclusiva por Presentes do TikTok**:
   - Comentários comuns de chat não movimentam a pipa dos jogadores no céu, mantendo a arena justa e o engajamento de monetização focado nos presentes.
   - Cada presente dispara a manobra física autêntica correspondente na pipa do presenteador:
     - 🌹 **Rosa** $\to$ **Retão**: A pipa mete um avanço veloz em linha reta cortando com força quem passar na frente dela.
     - 🍩 **Donut** $\to$ **Mergulho**: A pipa aponta o bico reto para o chão e desce em mergulho vertical cortando quem estiver embaixo.
     - 🦫 **Capivara** $\to$ **Relo Lateral**: Ataque no flanco lateral com a barriga da linha e escudo de proteção.
     - 🌪️ **Perfume** $\to$ **Despicada no Sentido do Vento**: A pipa despica no sentido que o vento carrega, alternando folga e retensionamento ágil.
     - 🦁 **Leão** $\to$ **Mestre do Céu**: Ataque cósmico supremo com varredura total e 3 escudos celestiais.

2. **Controles de Teclado no Computador da Live (Teclas 1, 2, 3)**:
   - Para o streamer pilotar ou testar localmente:
     - **Tecla 1**: **Puxar pipa** (subida rápida de ataque, linha com tensão máxima $\tau = 1.0$).
     - **Tecla 2**: **Soltar linha** (descarrega na carretilha, alivia tensão $\tau = 0.20$, ganha folga e deriva no vento).
     - **Tecla 3**: **Desbicada** (dar despicada na pipa no sentido do vento).
   - **Seleção de Pipa pelo Clique**: O streamer pode clicar com o mouse no canvas em qualquer pipa para selecioná-la (`🎯 Pipa Selecionada`). Se nenhuma for clicada, o teclado controla automaticamente o Rei da Laje, o Líder ou a primeira pipa ativa da arena.

---

## 2. Física e Cinemática das Manobras Paulistas

### A. Retão (Rosa)
- **Cinemática**: $\Delta x = \text{dir} \times 2.85 \times \text{step} \times \text{speed}$, tração ascendente $\Delta y = -0.38 \times \text{step}$.
- **Tensão da Linha**: Esticada no limite ($\tau = 1.0$, $\text{slack} = 0$).
- **Velocidade de Contato**: $\text{contactSpeed} = 18$, multiplicador de dano de $1.25$.
- **Comportamento**: A pipa aponta para o alvo mais próximo e atropela de frente.

### B. Mergulho (Donut)
- **Cinemática**: Aceleração vertical descendente $\Delta y = +3.4 \times \text{step} \times \text{speed}$, rotação com bico apontado para o solo ($\text{rotation} = +0.52$, $\text{pitch3D} = -0.75$).
- **Proteção de Solo**: Se atingir o terço inferior (perto da laje), a pipa ergue o bico e sobe cortando com pressão.
- **Velocidade de Contato**: $\text{contactSpeed} = 22$, dano de corte vertical $1.22$.

### C. Relo Lateral (Capivara)
- **Cinemática**: Avanço transversal no horizonte em direção à lateral da linha adversária mais próxima ($\Delta x = \text{dir} \times 2.4 \times \text{step}$), acompanhado de oscilação harmônica lateral.
- **Defesa Reforçada**: Multiplicador de defesa $0.60$ (absorve 40% do dano sofrido) somado a 2 escudos de Kevlar.

### D. Despicada no Sentido do Vento (Perfume / Tecla 3)
- **Cinemática**: Detecta o vetor de vento instantâneo $\text{sign}(W_x)$ e dispara naquela direção com ciclo de 3 fases:
  1. *Bicada seca* (aponta o bico na direção do vento);
  2. *Folga aerodinâmica* ($\text{slack} = 0.82$) sendo carregada pela rajada;
  3. *Retensionamento rápido* para cortar no contra-ataque.

---

## 3. Narração ao Vivo em Gíria Paulista (AudioManager)

O motor TTS foi adaptado para expressar o jargão autêntico dos festivais paulistas:
- *"Tlec! {winner} cortou no retão a pipa de {loser}!"*
- *"{winner} mandou um mergulho e cortou a pipa de {loser}!"*
- *"{winner} cortou bonito a pipa de {loser} na despicada!"*
- *"{winner} levou a melhor no relo lateral contra {loser}!"*
- *"{nick} mandou uma Rosa! Cerol afiado no retão pra cortar quem passar na frente!"*
- *"{nick} mandou um Donut! Linha Chilena e mergulho veloz no céu!"*

---

## 4. Validação e Qualidade

- **Suíte de Testes Unitários**: Criado [tests/maneuvers-paulistas-controls.test.cjs](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/tests/maneuvers-paulistas-controls.test.cjs).
- **Resultado do `npm test`**: **148 de 148 testes aprovados (100% de sucesso)** em 865 ms.
