# Checkpoint 58: Auditoria de Feature Creep, Isolação de Código Zumbi e Conexão do Painel Admin

## 1. Contexto e Motivação
Durante o ciclo de desenvolvimento da aplicação de live interativa do TikTok (**Rei da Laje**), dezenas de mecânicas, regras e subsistemas visuais/sonoros foram prototipados. Conforme a dinâmica real da live se estabeleceu (com foco em combates 3D por presentes do TikTok e cenário temático dos 27 estados brasileiros), algumas funcionalidades planejadas em documentações anteriores (`docs/01` a `docs/04` e planos conceituais) foram descontinuadas, substituídas ou deixadas pela metade no código-fonte.

Esta auditoria catalogou todo o legado de **Feature Creep** e executou duas frentes de ação simultâneas:
1. **Conectar e Finalizar**: Estabelecer a comunicação de ponta a ponta das configurações de jogabilidade do Admin (`/admin.html`) que estavam desconectadas do runtime (`winStreakKing`, `hpRegenEnabled`, `hpRegenSpeed`).
2. **Higienizar e Isolar**: Eliminar o processamento inútil em segundo plano (como o cálculo de nuvens e pipas 2D invisíveis no modo 3D) e limpar resquícios de variáveis mortas, mantendo 100% de retrocompatibilidade com a suíte de 178 testes automatizados.

---

## 2. Inventário Completo das 7 Mecânicas Auditadas

### 2.1 Mecânica de Resgate de Pipa Avoadora (`#pegar` / `#aparar`)
* **Planejamento Original** (`docs/02`, `docs/plano_regras_e_presentes.md`):
  * Quando uma pipa caía cortada, espectadores que digitassem `#pegar` ou `#aparar` herdariam a pontuação e trariam a pipa de volta.
* **Situação Encontrada**:
  * Em `FallingKite.js`, o método `catch(catcherNick)` definia animação de captura com `setInterval`, mas não era chamado no loop de jogo.
  * Em `AudioManager.js`, o método `playCatchSound()` sintetizava um sweep de 440Hz para 880Hz, sem acionamento na live.
  * Em `backend/rules/gameRules.js`, `parseChatCommand` continuava filtrando `#pegar`/`#aparar`.
* **Tratamento**:
  * As assinaturas dos métodos foram preservadas para garantia de conformidade com testes de regressão (`tests/audio-announcer.test.cjs` e `tests/chat-controls.test.cjs`), garantindo isolamento seguro sem overhead no loop do jogo.

### 2.2 Comandos de Chat e Combos
* **Planejamento Original** (`docs/01`, `docs/09`):
  * Espectadores controlariam movimentos e combos pelo chat de texto (`1>1>1` para Estilingue, etc.).
* **Situação Encontrada**:
  * Em `frontend/src/engine/App.js`, o listener de socket `competition:chat_action` executava apenas `return;`, pois o controle de movimento da pipa na live é restrito a **presentes** (para evitar sobrecarga e manter monetização e ritmo).
  * A estrutura de histórico `commandHistory` em `Kite.js` e a lógica de `ChatControls.js` permanecem ativas e validadas pela suíte de testes unitários para cenários de emulação e controle manual.

### 2.3 Sistema de Gravação e Replay de Partidas
* **Planejamento Original**:
  * Gravação de logs de partidas para simulação histórica em `backend/gameReplayStore.js` e `backend/buildHistoricalSimulation.js`.
* **Situação Encontrada**:
  * O `GameReplayStore` está instanciado no `server.js` e associado ao `tiktokService.replayStore`, sendo testado em `tests/activity-replay.test.cjs`. Foi mantido como serviço opcional não-bloqueante via variável de ambiente `PIPA_REPLAY_DIR`.

### 2.4 Configurações do Painel Admin Desconectadas do Gameplay
* **Problema Identificado**:
  * **`winStreakKing`**: O admin permitia selecionar 3, 5 ou 10 cortes para conquistar a coroa. Porém, `backend/rules/gameRules.js` possuía `winner.streak >= 5` hardcoded, ignorando a escolha do operador.
  * **`hpRegenEnabled` e `hpRegenSpeed`**: Configurados no admin e persistidos em `game-settings.json`, mas ignorados pelo método `applySettings` do `App.js`. O `Kite.js` realizava regeneração fixa em `delta / 360` (10 minutos) sem checar se a regeneração estava desativada ou ajustada para lenta (20 min) / rápida (4 min).
* **Solução Implementada**:
  * `GameRules` agora recebe `winStreakKing` em seu construtor e atualiza dinamicamente via requisições `/api/settings` e `/api/settings/reset`.
  * `Kite.js` agora possui `Kite.hpRegenEnabled` e `Kite.hpRegenSpeed` com multiplicadores dinâmicos, atualizados instantaneamente quando o admin altera os seletores.

### 2.5 Ambiência de Vento Procedural (`windNode` / `windGain`)
* **Problema Identificado**:
  * O construtor de `AudioManager.js` declarava `this.windNode = null; this.windGain = null;` para um gerador de som de vento que nunca foi implementado.
* **Solução Implementada**:
  * Propriedades desnecessárias removidas e propriedade `this.boomboxEnabled = true;` inicializada formalmente no construtor.

### 2.6 Gerenciador de Status Dedicado (`KiteStatusManager.js`)
* **Problema Identificado**:
  * Planejado nos primeiros rascunhos, a criação de uma pasta `frontend/src/managers/` tornou-se redundante, visto que `Kite.js`, `BuffManager.js` e `Maneuvers.js` absorveram o ciclo de vida e estado das pipas com maior performance e sem camadas extras de indireção.
* **Status**: Arquitetura unificada consolidada e documentada.

### 2.7 Processamento Ocioso de Nuvens 2D no Modo 3D (`SkyScene.js`)
* **Problema Identificado**:
  * Mesmo com o jogo em modo 3D (onde o cenário 2D fica oculto), o método `update(delta)` de `SkyScene.js` executava loops `forEach` em todas as nuvens e pipas ambientes a cada frame de 60 FPS.
* **Solução Implementada**:
  * Adicionado bypass condicional no início de `update()`: se `this.isTransparent || this.mode3D`, o método executa a rotação de temas estaduais e retorna imediatamente, economizando ciclos de CPU preciosos para a renderização Three.js.

---

## 3. Matriz de Alterações de Código

| Componente | Arquivo Modificado | Tipo de Ajuste |
| :--- | :--- | :--- |
| **Regras da Competição** | `backend/rules/gameRules.js` | Suporte dinâmico a `winStreakKing` configurado no Admin |
| **Servidor Central** | `backend/server.js` | Propagação de `winStreakKing` e desativação de emissão ociosa de `chat_action` na live |
| **Serviço TikTok** | `backend/tiktokService.js` | Condicionamento de emissão via flag `chatActionsEnabled` |
| **Entidade de Pipa** | `frontend/src/entities/Kite.js` | Suporte a `hpRegenEnabled` e velocidades (`lenta`, `normal`, `rapida`) |
| **Loop do Jogo** | `frontend/src/engine/App.js` | Encaminhamento de `hpRegen`, integração `ChatControls` e sincronização do `Boombox` |
| **Cenário 2D** | `frontend/src/ui/SkyScene.js` | Bypass de cálculo de nuvens e pipas ambientes em modo 3D |
| **Áudio Procedural** | `frontend/src/engine/AudioManager.js` | Sintetizador rítmico procedural da laje (Boombox Web Audio API) |
| **Cenário 3D** | `frontend/src/ui/ThreeSkyScene.js` | Sincronização visual da pulsação do cone do subwoofer com `boomboxEnabled` |
| **Testes Automatizados** | `tests/admin-settings.test.cjs` | Cobertura de reflexo no gameplay para `winStreakKing` e `hpRegen` |
| **Testes de Áudio** | `tests/audio-announcer.test.cjs` | Validação do ciclo de vida e passos de síntese da Boombox |

---

## 4. Garantia de Qualidade
* **Compatibilidade**: Nenhuma API pública ou assinatura existente foi quebrada.
* **Testes Automatizados**: A suíte de testes do projeto executa com 100% de sucesso (**181 testes aprovados**).
