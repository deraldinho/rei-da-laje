> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 🛠️ 05. Plano de Desenvolvimento Prático (Hands-on Workflow)

Este documento descreve o fluxo de trabalho diário de desenvolvimento, scripts PowerShell unificados e configuração de transmissão no OBS Studio.

---

## 1. Fluxo de Trabalho Integrado (`npm run dev`)

Utilizamos a biblioteca `concurrently` para que o desenvolvedor execute um único comando no terminal PowerShell e tenha tanto o servidor Node.js/Socket.io quanto o empacotador Vite com Hot Module Replacement (HMR) rodando em sincronia:

```powershell
npm run dev
```

- **Servidor Backend**: Escuta na porta `3000`.
- **Painel Admin / Simulador**: Disponível em `http://localhost:3000/admin`.
- **Interface do Jogo (OBS)**: Disponível em `http://localhost:3000/`.

---

## 2. Ordem de Escrita dos Blocos de Código

1. **Bloco 1: Fundação do Monorepo**: `package.json`, instalação das dependências.
2. **Bloco 2: Core do Backend & Painel Admin**: `backend/server.js`, `tiktokService.js`, `backend/views/admin.html`, regras de gifts e buffs.
3. **Bloco 3: Engine Visual PixiJS**: `frontend/vite.config.js`, `frontend/src/main.js`, `App.js`, `Kite.js`, `Tail.js`, `Line.js`.
4. **Bloco 4: Física de Relinho & Áudio**: `Physics.js`, `AudioManager.js`, `SparkEmitter.js`, `FallingKite.js`.
5. **Bloco 5: HUD do OBS & Polimento**: `HUD.js`, `SkyScene.js`, teste de carga com 40+ pipas.

---

## 3. Configuração da Fonte no OBS Studio

1. Adicione uma nova fonte: **Navegador (Browser Source)**.
2. Propriedades:
   - **URL**: `http://localhost:3000`
   - **Largura (Width)**: `1080`
   - **Altura (Height)**: `1920` (ou `1920x1080` horizontal)
   - **FPS**: `60`
   - **Desativar quando não estiver visível**: `Desmarcado`
   - **Atualizar o navegador quando a cena se tornar ativa**: `Marcado`
