# 34. Cenário 3D Real com Three.js (WebGL Nativo)

## 1. Visão Geral

Atendendo à evolução visual do projeto ("*Vamos transformar o cenario em 3d*"), o cenário 2D vetorial foi substituído por uma **arena 3D nativa em WebGL** desenvolvida com **Three.js** (`three: ^0.186.1`).

A arquitetura preserva integralmente a física 2D de combate, linhas, laje de 40 bonequinhos, presentes e HUD no `#gameCanvas` (PixiJS), enquanto o fundo passa a ser renderizado por uma cena tridimensional com profundidade, luz solar direcional, sombras suaves (*PCF Soft Shadows*) e temática de morro/favela brasileira.

---

## 2. Arquitetura de Camadas (Dual Canvas)

```
+-------------------------------------------------------------+
| DOM HUD Layer (z-index: 10): Ranking TOP 5, Presentes, Vento|
+-------------------------------------------------------------+
| PixiJS Canvas #gameCanvas (z-index: 1, Fundo Transparente): |
| - 40 Bonequinhos na laje (âncoras de mão direita)           |
| - Pipas, Linhas, Tensão, Manobras e Faíscas                 |
| - Notificações de Corte, Coroa e Raios                      |
+-------------------------------------------------------------+
| Three.js Canvas #threeCanvas (z-index: 0, WebGL Nativo):    |
| - Domo celeste com gradiente dinâmico (RJ, SP, Salvador)    |
| - Luz Direcional com sombras e HemisphereLight              |
| - Morros laterais com casinhas 3D, lajes e caixas d'água    |
| - Laje frontal 3D com caixas d'água nas bordas              |
| - Nuvens volumétricas e pipas ao longe com deriva de vento  |
+-------------------------------------------------------------+
```

---

## 3. Elementos do Cenário 3D

### 3.1. Morros e Casinhas Procedurais
- **Laterais Enquadradas**: Dois morros poligonais ocupam as bordas esquerda e direita, deixando o **corredor central 100% desimpedido** para os combates de pipa e legibilidade da live.
- **Casas Tridimensionais**: Mais de 70 habitações com variação de escala e cores típicas brasileiras (tijolo aparente, azul pastel, amarelo, verde, terracota).
- **Detalhes Realistas**:
  - Lajes de concreto com beiral saliente.
  - Caixas d'água cilíndricas azuis no topo de cada casa.
  - Janelas com iluminação noturna/diurna.
  - Antenas metálicas no topo.

### 3.2. Laje Frontal 3D
- Plataforma horizontal de concreto e cerâmica na base do cenário, posicionada exatamente na altura calculada pela proporção da tela (`rooftopHeight` e `rooftopAnchorY`).
- Duas grandes caixas d'água 3D nas extremidades (esquerda e direita), criando sensação de profundidade e enquadramento natural para os bonequinhos.

### 3.3. Iluminação e Sombras
- **DirectionalLight**: Simula o sol tropical com sombras suaves projetadas pelas casas nos morros e pela mureta da laje.
- **HemisphereLight**: Iluminação de preenchimento ambiente, simulando a luz do céu e o reflexo do solo avermelhado.

### 3.4. Dinâmica e Vento
- **Nuvens Volumétricas**: Camadas de nuvens poligonais que derivam suavemente no céu.
- **Paralaxe com Vento Real**: A câmera e as nuvens reagem suavemente ao vetor de vento calculado por `Wind.sample(windTime)` no motor de física.
- **Pipas de Fundo**: Pipas decorativas navegando no horizonte em profundidade Z.

---

## 4. Integração com Modo Transparente (OBS Studio)

Para streamers que utilizam fundo chroma-key ou captura de janela com transparência nativa:
- O botão `#btnToggleScene` e o atalho de teclado `B` alternam entre:
  1. **Cenário 3D Ativo** (`#threeCanvas` visível, renderizando WebGL).
  2. **Modo Transparente OBS** (`#threeCanvas.style.display = 'none'`, `#gameCanvas` 100% transparente).
- Nenhum recurso de GPU é desperdiçado enquanto o modo transparente estiver ativo (render loop interrompido ou pulado).

---

## 5. Arquivos Envolvidos

- [frontend/src/ui/ThreeSkyScene.js](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/ThreeSkyScene.js): Classe principal que gerencia cena, câmera frustum-aware, meshes, iluminação, shaders e render loop.
- [frontend/index.html](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/index.html): Adição do elemento `<canvas id="threeCanvas" aria-hidden="true"></canvas>`.
- [frontend/src/ui/game.css](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/game.css): Estilização e empilhamento de z-index dos canvas.
- [frontend/src/ui/SkyScene.js](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/SkyScene.js): Adição do método `setMode3D(true)` para zerar camadas 2D redundantes.
- [frontend/src/engine/App.js](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js): Inicialização, resize responsivo e loop de vento sincronizado com Three.js.
- [package.json](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/package.json): Adição da dependência `"three": "^0.186.1"`.

---

## 6. Verificação e Testes

- **Testes Unitários**: `npm test` executou **129/129 testes com 100% de sucesso**.
- **Teste End-to-End de Navegador**: `node tests/browser-smoke.mjs` executou e validou:
  - Boot do canvas 3D e PixiJS em conjunto.
  - Simulação de 40 pipas simultâneas e combates com faíscas.
  - Registro de corte e liderança.
  - Alternância de visibilidade de cenário para overlay OBS.
  - Capturas de evidência salvas em `tests/evidence/`.
- **Build de Produção**: `npx vite build frontend --outDir dist-preview` gerou os bundles sem avisos ou erros.
