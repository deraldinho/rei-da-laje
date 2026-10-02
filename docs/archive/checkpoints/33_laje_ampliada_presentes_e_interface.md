> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 33 — Laje Ampliada, Guia de Presentes Destacado e Interface Moderna

**Data:** 27/09/2026  
**Objetivo:** Atender à solicitação do usuário: "melhora essta interface, aumente a base onde fica os bonecos, aumente também os presentes."

---

## 1. Melhorias Realizadas

### 1.1 Base dos Bonecos (Laje do Rooftop Ampliada e Enriquecida)
- **Altura e Geometria da Laje:**
  - Em monitores verticais 2K (1440 × 2560): ampliada para **237.6 px** (ganho de 65% sobre a base anterior), com âncora vertical em `y = 2298.4`.
  - Em 1080 × 1920: altura calculada em **181.5 px**, com âncora vertical em `y = 1714.5`.
  - Em monitores horizontais (desktop): laje mantida em **58 px** com âncora em `y = 1018`.
- **Texturização e Cenografia em PixiJS (`SkyScene.js`):**
  - Adicionadas fiadas de tijolos aparentes com variação procedural de tons terracota e marrom avermelhado.
  - Beiral de concreto superior em tom cerâmico rústico com linha de destaque e contraste.
  - Caixas d'água cilíndricas azuis clássicas de polietileno nos dois cantos da laje com tampa e nervuras de reforço.
  - Muretas laterais e sombras de contato no piso para aterramento e estabilidade visual dos participantes.
- **Distribuição dos Bonecos (`RooftopLayout.js`):**
  - Espaçamento vertical entre as 2 fileiras ajustado para respeitar tanto a não-sobreposição das cabeças quanto os limites de segurança da arena (`playerBaseY` entre 88% e 96% da altura da tela, preservando folga livre de mais de 90 px acima da barra inferior).
  - Algoritmo `rooftopSlotOrder` garante ordenação idempotente por coordenada X da mão, eliminando embaralhamento de participantes em reloads.

### 1.2 Guia de Presentes Ampliado e Realçado (`game.css` e `portrait-live.css`)
- **Estilo dos Cartões de Presentes:**
  - Cartões com cantos arredondados, bordas translúcidas de alto contraste e gradientes temáticos com iluminação e glassmorphism:
    - 🌹 **ROSA (RETÃO):** Gradiente carmesim com brilho neon rosa.
    - 🍩 **DONUT (DESPICAR):** Gradiente âmbar quente com brilho dourado.
    - 🦫 **CAPIVARA (APARAR):** Gradiente esmeralda com brilho menta.
    - 🏆 **PERFUME (PERSEGUIR):** Gradiente roxo real com brilho lavanda.
    - 🦁 **LEÃO / ESCUDO (PROTEÇÃO):** Gradiente amarelo ouro com brilho radiante.
  - Emojis ampliados para 20–22 px (chegando a 34 px em 2K vertical).
  - Tipografia de alta legibilidade com títulos em `Outfit` e subtítulos explicativos de cada poder/manobra.
  - Microinterações de hover suaves (`scale(1.05)` e elevação) para interação responsiva.

### 1.3 Interface Geral (HUD Modernizado)
- **Tipografia:** Importação das fontes modernas Google Fonts (`Outfit` para títulos e números; `Inter` para leitura rápida).
- **Placar Top 5 / Hall da Fama:**
  - Card em glassmorphism fosco profundo (`#0c2131e6` a `#06131df2`) com borda suave dourada.
  - Medalhas de pódio com gradientes e indicadores destacados de cortes e sequências.
  - Título do líder e rei com brilho dourado e transições fluidas.
- **Empty State ("Sua pipa. Seu nome. Sua laje."):**
  - Pipa estilizada flutuando com animação procedural `kite-float`.
  - Tipografia refinada com degradê dourado metálico no texto "Sua laje."
  - Chamada visual clara para comentar e participar.
- **Responsividade e Redimensionamento Contínuo:**
  - Suporte completo a redimensionamento em tempo real (mesmo com ticker pausado para inspeção).
  - Preservação da barra inferior em linha única (`flex-wrap: nowrap`) em 1440 × 2560 e resoluções verticais padrão.

---

## 2. Validação e Qualidade

- **Testes Unitários:** `npm test` aprovado com **129/129 testes (100% de sucesso)**.
- **Teste End-to-End no Navegador:** `node tests/browser-smoke.mjs` aprovado com Edge headless (porta 3107) cobrindo:
  - Inicialização, spawn de 40 pipas simultâneas, integridade da árvore DOM.
  - Checkpoint e restauração sem perda ou embaralhamento de posições.
  - Combos de presentes, manobras de aparar, likes e rajadas visuais.
  - Alternância de resolução para 1440 × 2560 (2K) e 390 × 844 (mobile).
  - Faixa vertical estrita da laje e bonecos (`footerTop > playerBaseY + 25`, `playerBaseY` dentro de 88%–96%).
  - Modo transparente (overlay OBS) e simulação de combate a 60 FPS.
