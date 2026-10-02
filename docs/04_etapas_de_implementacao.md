> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 📅 04. Etapas Sequenciais de Implementação

## Cronograma de Desenvolvimento e Checkpoints (4 Etapas)

```mermaid
flowchart TD
    subgraph Etapa 1: Fundação & Backend
        E1[Setup Monorepo + Server Express + Socket.io + Painel /admin]
        D1[Checkpoint 1: Teste de Disparo de Eventos WebSocket no /admin]
    end

    subgraph Etapa 2: Motor Gráfico 60 FPS
        E2[Vite + PixiJS + Entidades Kite, Tail Verlet e Line]
        D2[Checkpoint 2: Pipas subindo na tela e flutuando no vento]
    end

    subgraph Etapa 3: Combate & Áudio
        E3[Física Híbrida 2D + Faíscas + Áudios Web Audio + Pipa Avoadora]
        D3[Checkpoint 3: Relinho funcional, som Tlec! e pipa caindo]
    end

    subgraph Etapa 4: Interface & OBS
        E4[HUD Top 5 + Killfeed + Modo Transparente vs Laje + Teste de Carga]
        D4[Checkpoint 4: Integração completa pronta para transmissão ao vivo]
    end

    E1 --> D1 --> E2 --> D2 --> E3 --> D3 --> E4 --> D4
```

## Matriz de Entregáveis por Etapa

| Etapa | Foco Principal | Arquivos Criados / Modificados | Critério de Conclusão (DoD) |
|---|---|---|---|
| **Etapa 1** | Backend & Admin | `package.json`<br>`backend/server.js`<br>`backend/tiktokService.js`<br>`backend/views/admin.html`<br>`backend/rules/*` | Servidor roda na porta 3000, rota `/admin` dispara eventos WebSocket validados no log |
| **Etapa 2** | Render PixiJS | `frontend/vite.config.js`<br>`frontend/index.html`<br>`frontend/src/main.js`<br>`frontend/src/engine/App.js`<br>`frontend/src/entities/Kite.js`<br>`frontend/src/entities/Tail.js`<br>`frontend/src/entities/Line.js` | Botão "Spawn Pipa" no `/admin` faz surgir pipa com avatar e rabiola na tela a 60 FPS |
| **Etapa 3** | Relinho & Áudio | `frontend/src/engine/Physics.js`<br>`frontend/src/engine/AudioManager.js`<br>`frontend/src/entities/SparkEmitter.js`<br>`frontend/src/entities/FallingKite.js` | Duas pipas cruzando linhas emitem faíscas, som "Tlec!" e a perdedora desce rodopiando |
| **Etapa 4** | HUD & OBS | `frontend/src/ui/HUD.js`<br>`frontend/src/ui/SkyScene.js`<br>`frontend/src/managers/KiteStatusManager.js` | Placar Top 5 animado, killfeed na tela, suporte a fundo transparente no OBS e teste com 30+ pipas |
