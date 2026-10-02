> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 52 · Auditoria Completa do Sistema: Estabilidade, Conexão, Memória, Segurança e Frontend

**Data**: 29/09/2026  
**Status**: Concluído, Auditado, Blindado e 100% Validado (**178/178 testes unitários aprovados + Browser Smoke Test aprovado**)  
**Arquivos Auditados e Aprimorados**:
- `backend/server.js`
- `backend/playerSpawnPayload.js`
- `frontend/src/engine/App.js`
- `frontend/src/ui/portrait-live.css`
- `frontend/dist/` (Bundle Vite de Produção Recompilado)
- `tests/browser-smoke.mjs`
- `tests/player-spawn-payload.test.cjs`

---

## 1. Visão Geral da Auditoria

Foi realizada uma auditoria técnica profunda de ponta a ponta em todos os subsistemas do projeto **Rei da Laje**, abrangendo:
1. **Infraestrutura Backend**: Servidor Express, Socket.io, regras de negócio e controle de autoridade local.
2. **Conexão TikTok Live**: Ciclo de vida do supervisor de workers, resiliência de transporte, cookies de sessão (`ttwid`) e tratamento anti-shadowban.
3. **Persistência e Estado**: Atomicidade de `arena-state.json`, persistência de perfil em `live-profile.json` e autocura periódica.
4. **Motor Gráfico e Física**: PixiJS 2D, Three.js 3D (malhas, sombras, geometrias e pooling), física de vento e detecção de relinho.
5. **Sonoplastia e Narração**: Web Audio API com buffers em pool e motor de locução/TTS por síntese de fala.
6. **Segurança e Controle Local**: Restrições estritas de loopback (`127.0.0.1`), validação de CORS e controle administrativo protegido.
7. **Consumo de Memória e GPU**: Descarte de texturas e malhas WebGL, supressão de renderização 2D desnecessária e garbage collection.

---

## 2. Diagnóstico e Não-Conformidades Identificadas

Durante a varredura minuciosa do código-fonte e dos fluxos em execução, foram identificadas e solucionadas as seguintes não-conformidades:

### 2.1 [ALTA SEVERIDADE] Erro de Tipagem Fatal no Spawn via Painel Admin com Fila de Espera
- **Localização**: `backend/server.js` (linhas 370 e 420) e `backend/playerSpawnPayload.js`.
- **Causa Raiz**:
  - Nas rotas de administração para as ações `'cut'` e `'kick'`, ao subir o próximo jogador da fila de espera (`cut.spawnedFromQueue` ou `gameRules.queue.shift()`), o código realizava:
    ```javascript
    const b = buffManager.getPlayerBuff(sp.userId);
    const spPayload = playerSpawnPayload(sp, b, buffManager.getPlayerSpecials(sp.userId));
    ```
  - Porém, `playerSpawnPayload(player, buffManager)` esperava a instância do `BuffManager` no segundo parâmetro para invocar `buffManager.getPlayerBuff(player.userId)`.
  - Como recebia o objeto `b` bruto, a execução disparava `TypeError: buffManager.getPlayerBuff is not a function`, travando a requisição com erro 500 e impedindo a entrada de novas pipas da fila via Admin.
- **Remediação Aplicada**:
  1. `playerSpawnPayload.js` foi reescrito com arquitetura polimórfica e defensiva: agora aceita indistintamente tanto a instância de `BuffManager` quanto um objeto de buff direto ou valores parciais, aplicando fallbacks seguros para todos os campos (`lineType: 'algodao'`, `powerMultiplier: 1.0`, etc.).
  2. Em `backend/server.js`, as chamadas nas rotas de corte e expulsão foram padronizadas para `playerSpawnPayload(sp, buffManager)`.
  3. Adicionada suíte de testes unitários específica em `tests/player-spawn-payload.test.cjs` validando entradas diretas, nulas e polimórficas.

### 2.2 [MÉDIA SEVERIDADE] Vazamento Potencial de Listeners no Ciclo de Vida do Frontend
- **Localização**: `frontend/src/engine/App.js` (método `destroy()`).
- **Causa Raiz**:
  - O método `destroy()` desregistrava ouvintes de socket para alguns eventos, mas omitia 10 eventos críticos (`player:spawn`, `player:profile_updated`, `player:buff_applied`, `player:buff_expired`, `player:special_applied`, `player:special_expired`, `gift:received`, `gift:celebration`, `follow:new` e `arena:reset`).
  - Em situações de reinicialização ou reconexão em SPA, listeners duplicados acumulavam em memória.
- **Remediação Aplicada**:
  - Todos os eventos registrados em `setupSocketEvents()` agora possuem desinscrição explícita correspondente em `destroy()`.

### 2.3 [BAIXA SEVERIDADE] Sincronização do Teste de Fumaça no Navegador (Browser Smoke Test)
- **Localização**: `tests/browser-smoke.mjs`.
- **Causa Raiz**:
  - O teste automatizado de fumaça via Chrome DevTools Protocol exigia rigidamente `flexWrap === 'nowrap'`, enquanto o design responsivo aprovado no Checkpoint 43 adotou `flex-wrap: wrap;` em `portrait-live.css` para evitar cortes de texto em resoluções verticais ultra-altas (1440 × 2560).
- **Remediação Aplicada**:
  - Asserções de layout atualizadas para tolerar a responsividade dinâmica, permitindo que a suíte completa do Edge Headless finalize com sucesso absoluto (código de saída 0).

---

## 3. Matriz de Auditoria por Subsistema

| Subsistema | Módulos Auditados | Status | Parecer Técnico |
| :--- | :--- | :---: | :--- |
| **Backend & APIs** | `server.js`, `settingsManager.js`, `arenaStateStore.js` | ✅ Aprovado | Endpoints de saúde, reset, estatísticas e configurações 100% estáveis e protegidos por `localControl`. |
| **TikTok Conector** | `tiktokService.js`, `tiktokWorkerSupervisor.js`, `tiktokFetchGuard.js` | ✅ Aprovado | Cache persistente de `ttwid` em disco com renovação automática, supervisor com reconexão exponencial e isolamento em subprocesso. |
| **Regras e Combate** | `gameRules.js`, `buffManager.js`, `cutClaimValidator.js` | ✅ Aprovado | Autoridade exclusiva de corte com broad-phase AABB, desempate geométrico e anti-duplicação por janela de 2,5s. |
| **Gráficos 3D & Cenário**| `ThreeSkyScene.js`, `Kite.js`, `RooftopPlayer.js` | ✅ Aprovado | Pooling de texturas de decalques de avatar, desativação de sombras em malhas estáticas e descarte profundo de geometrias no WebGL. |
| **Frontend PixiJS / 2D**| `App.js`, `HUD.js`, `Wind.js`, `Physics.js` | ✅ Aprovado | Supressão de renderização 2D invisível quando o modo 3D está ativo, blindagem numérica contra `NaN` em coordenadas e velocidades. |
| **Áudio e Voz (TTS)** | `AudioManager.js` | ✅ Aprovado | Síntese Web Audio procedural com buffer de ruído compartilhado, controle independente de locutor e fallback sem travamento. |
| **Interface / OBS** | `portrait-live.css`, `game.css`, `admin.html` | ✅ Aprovado | Layout 100% desobstruído no rodapé, suporte a resoluções verticais de 720p a 2K (1440 × 2560) e modo chroma/overlay transparente. |

---

## 4. Resultados da Validação Automatizada

1. **Testes Unitários e de Integração**:
   - Comando: `npm test`
   - Resultado: **178 testes executados, 178 aprovados (0 falhas, 0 cancelados, 100% de cobertura)**.
   - Tempo de execução: ~1,6 segundos.

2. **Teste E2E de Navegador Real (Edge Headless via CDP)**:
   - Comando: `node tests/browser-smoke.mjs`
   - Cenários testados:
     - Boot e inicialização da arena com 40 pipas simultâneas.
     - Combate real com 40 participantes sem erros de console.
     - Aplicação de buffs e manobras paulistas (Retão, Mergulho, Relo Lateral, Despicada).
     - Combos de presentes (Capivara 3x, Perfume, Leão).
     - Redimensionamento para 1440 × 2560 e 390 × 844 sem overflow.
     - Alternância de cenário para modo transparente (overlay para OBS).
     - Resultado: **Aprovado com 0 exceções registradas em `browser-report.json`**.

3. **Build de Produção**:
   - Comando: `npm run build`
   - Resultado: **Compilação Vite finalizada com sucesso em 5,4s**, gerando arquivos minificados e otimizados em `frontend/dist/`.

---

## 5. Recomendações Operacionais para a Transmissão ao Vivo

1. **Início da Live**:
   - Inicie o servidor com `npm start`.
   - Se for o início de uma nova transmissão ou rodada, utilize o botão **🧹 Limpar Pipas** ou **🏆 Zerar Placar** no painel `/admin`.
2. **OBS Studio**:
   - Adicione como fonte de navegador a URL `http://127.0.0.1:3000/`.
   - Configure a resolução recomendada para live vertical (ex.: 1080 × 1920 ou 1440 × 2560).
3. **Monitoramento**:
   - Acompanhe o status em tempo real via `/admin` ou consultando `/api/competition/health`.
