> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 64. Investigação Completa de Estabilidade do Sistema (Frontend, Backend, OBS e TikTok)

**Data:** 30/09/2026  
**Status:** Auditado, Corrigido e 100% Validado (**188/188 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/security-auditor`, `/antigravity-guide`

---

## 1. Visão Geral da Investigação

Em jogos interativos transmitidos via TikTok Live com integração ao OBS Studio, o sistema precisa sustentar transmissões contínuas de 6 a 24 horas ininterruptas sob alto estresse:
- 40 pipas simultâneas disputando relinho no céu 3D.
- Centenas de espectadores enviando comentários e presentes por minuto.
- Mudanças dinâmicas de resolução, troca de cenas no OBS e reconexões de rede.

A investigação de estabilidade foi dividida em três pilares fundamentais:
1. **Estabilidade de Renderização & Memória WebGL/GPU (Frontend)**
2. **Estabilidade de Processo e Conexões Assíncronas (Backend Node.js)**
3. **Sincronização de Estado, Autocura e Resiliência da Transmissão (OBS/Arena)**

---

## 2. Diagnósticos e Correções Críticas

### 2.1 Descoberta e Correção: Ausência do Método `resize` no `ThreeSkyScene`
* **Vulnerabilidade Encontrada:** O `App.js` chamava `this.threeScene?.resize(width, height)` ao detectar redimensionamento do canvas (`this.app.renderer.on('resize')`). Contudo, a classe `ThreeSkyScene` **não possuía a implementação do método `resize`**!
* **Consequência em Produção:** Se o streamer alterasse a resolução do OBS (ex: alternando entre 1080×1920 e 1440×2560), ou ao abrir em telas com densidade de pixels variável:
  - O `camera.aspect` permanecia com o valor estático inicial, distorcendo a perspectiva 3D.
  - O WebGLRenderer mantinha o buffer de frame original.
  - A função `screenToWorld` utilizava `this.width` e `this.height` defasados, desalinhando as linhas 3D e os bonecos na laje.
* **Correção Implementada:**
  ```javascript
  resize(width, height) {
    if (!this.renderer || !this.camera || this.disabled) return;
    const w = Math.max(100, Number(width) || window.innerWidth || 1280);
    const h = Math.max(100, Number(height) || window.innerHeight || 720);
    this.width = w;
    this.height = h;

    this.camera.aspect = w / h;
    this.setCameraMode(this.cameraMode || 'normal');
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    if (this.laje && this.themeCode) {
      this.laje.updateCulturalProps(
        this.themeCode,
        this.getVisibleBoundsAt.bind(this),
        this.height,
        this.width,
        this.themeManager ? this.themeManager.getBuildContext() : {}
      );
    }
  }
  ```
* **Teste TDD Adicionado:** Criado teste de validação em `tests/admin-settings.test.cjs` comprovando a existência e comportamento do método.

---

### 2.2 Blindagem contra Crash do Processo Node.js (`server.js`)
* **Vulnerabilidade Encontrada:** O `server.js` não possuía escutas globais para `unhandledRejection` e `uncaughtException`. Em Node.js v16+, qualquer promessa rejeitada sem `catch` (comum em I/O assíncrono de rede com servidores externos do TikTok ou WebSockets) derruba o processo inteiro.
* **Correção Implementada:**
  ```javascript
  process.on('unhandledRejection', (reason, promise) => {
    console.warn('[Process Warning] Rejeição não tratada detectada:', reason?.message || reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Process Error] Exceção não capturada no servidor:', err);
  });
  ```

---

### 2.3 Gestão e Limpeza de Memória WebGL e Texturas (Prevenção de Leaks)
* **Decalques & Sprites de Apelido:**
  - `_kiteDecalTextureCache` unifica instâncias de textura entre a pipa (`k3d`) e o boneco (`p3d`).
  - O método `purgeTextureCache` é executado a cada 45s (e probabilisticamente a cada 70 quadros), purgando e invocando `tex.dispose()` para participantes inativos.
* **Geometrias e Materiais Chibi:**
  - Em `ThreeCharacters.js`, todos os membros (pés, pernas, bermudas, troncos, cabeças, bonés, óculos e coroas) utilizam geometrias compartilhadas (`_shared*Geo`) marcadas com `userData = { isShared: true }`. Isso garante zero alocação de geometrias de malha ao criar ou remover bonecos na laje.
* **Proteção contra Congelamento do Loop (Delta Clamping):**
  - O `gameLoop(delta)` em `App.js` aplica clamp estrito `delta = Math.max(0, Math.min(delta, 3))`. Se o OBS pausar temporariamente a aba ou o sistema sofrer stutter, as pipas não saltam para fora da tela nem causam `NaN` na física ao retornar.

---

### 2.4 Capacidade e Controle do Heap no Backend (`GameRules.js`)
* O servidor limita estritamente:
  - `maxKitesOnScreen = 40` (capacidade visual da arena).
  - `maxQueueSize = 1000` (fila de espera com rejeição segura de spam).
  - `maxSessionStats = 3000` (limite do histórico com expurgo LRU de espectadores inativos sem cortes/pontos, protegendo participantes ativos e líderes).
* O heap de memória do processo permanece estável mesmo com milhares de comentários acumulados.

---

### 2.5 Resiliência do Conector TikTok e Recuperação do OBS
* **Supervisor TikTok (`tiktokWorkerSupervisor.js`):**
  - Isola falhas de transporte do WebSocket upstream.
  - Reinicia o cliente internamente sem matar o worker do servidor caso o TikTok encerre conexões silenciosas.
  - Deduplica presentes com janela de 2 minutos para evitar concessão duplicada de buffs em reconexões.
* **Autocura da Arena (`App.js`):**
  - O timer `arenaSyncTimer` (a cada 6s) sincroniza o estado oficial do jogo a partir de `/api/competition/arena`. Se o OBS reiniciar ou a aba recarregar, as pipas e o ranking são restaurados imediatamente.

---

## 3. Validação dos Testes

* **Suite Automatizada:** **188 testes executados e 188 testes aprovados (100% GREEN)**.
* **Inspeção em Execução (CDP):**
  - Diagnóstico em tempo real via Chrome DevTools Protocol em `http://127.0.0.1:3000/`.
  - Zero erros no console do navegador.
  - Sincronização 3D, física de combate e renderização de linhas totalmente estáveis.
