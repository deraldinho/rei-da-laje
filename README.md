# Rei da Laje

Jogo interativo em tempo real para **TikTok Live**, no qual participantes controlam pipas por comentários, curtidas e presentes enquanto um motor de física simula vento, linhas, contato, abrasão e corte.

O projeto nasceu como uma experiência de live e evoluiu para um laboratório de engenharia de software voltado a **sistemas em tempo real, física 2D/3D, WebSockets, estabilidade de longa duração e otimização de renderização**.

## Destaques técnicos

- Backend em **Node.js + Express + Socket.IO** com estado autoritativo da arena.
- Integração com eventos de **TikTok Live** usando worker/supervisor e reconexão resiliente.
- Frontend com **PixiJS + Three.js**, HUD para transmissão vertical e integração com OBS.
- Física de linha baseada em corda segmentada, XPBD, contato 3D, atrito, abrasão e ruptura localizada.
- Broad phase/narrow phase e budgets de contato para evitar colisão ingênua O(n²) no hot path.
- Pools de objetos e recursos 3D para reduzir alocações e travamentos durante cortes.
- Checkpoints, replay determinístico, watchdog e mecanismos de autocura da arena.
- Suíte automatizada com cenários de regressão, física, integração e benchmark para até **40 pipas**.

## Stack

`JavaScript` · `Node.js` · `Express` · `Socket.IO` · `Vite` · `PixiJS` · `Three.js` · `WebGL` · `HTML/CSS` · `Node Test Runner`

## Arquitetura resumida

```text
TikTok Live / Painel de teste
            │
            ▼
  Worker + Supervisor TikTok
            │
            ▼
   Backend Node.js / Socket.IO
      │                 │
      │ estado          │ eventos
      ▼                 ▼
 Física / Regras     Frontend Vite
      │                 │
      └───────────► PixiJS + Three.js
                        │
                        ▼
                  OBS / Live vertical
```

## Qualidade e testes

```bash
npm install
npm test
npm run build
```

Também existem gates específicos para browser smoke, performance, soak test e benchmarks da física de relinho definidos em `package.json`.

## Estrutura

```text
backend/   servidor, estado da arena e integração TikTok
frontend/  jogo, HUD, renderização 2D/3D e física visual
ops/       utilitários operacionais
tests/     testes unitários, integração e benchmarks
docs/      decisões, checkpoints e documentação técnica
```

## Sobre o projeto

**Rei da Laje** é um projeto pessoal de Deraldo Palomino Filho, desenvolvido como estudo prático de engenharia de software aplicada a jogos interativos e transmissões ao vivo.

GitHub: https://github.com/deraldinho
