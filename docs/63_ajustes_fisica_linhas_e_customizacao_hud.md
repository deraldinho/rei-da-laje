> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 63. Ajustes de Física, Linhas 3D e Customização do TOP 5 e Nomes de Pipas

**Data:** 30/09/2026  
**Status:** Concluído e Validado (187/187 testes aprovados)  
**Skills Utilizadas:** `/senior-fullstack`, `/systematic-debugging`, `/test-driven-development`, `/security-auditor`, `/antigravity-guide`

---

## 1. Contexto e Problemas Diagnosticados

O streamer relatou que mecânicas haviam parado de funcionar e solicitou novos controles de personalização:
1. **Linhas 3D Invisíveis / Erro de Buffer:** Erro no console do navegador: `BufferGeometry.computeBoundingSphere(): Computed radius is NaN`. Ao chamar `syncLine`, eram passados escalares em vez de instâncias de `THREE.Vector3`, corrompendo o buffer de posições das linhas e impedindo a renderização.
2. **Bonecos Invisíveis por Conta da Câmera:** A mureta de concreto da laje possuía altura de 16.2 unidades (70% da altura do bonequinho), escondendo o corpo e a carretilha dos jogadores no enquadramento vertical.
3. **Pipas Rígidas (Falta de Física Aerodinâmica):** Os deltas de velocidade `vx` e `vy` não estavam sendo calculados em `Kite.js`, mantendo o pitch e roll dinâmico em repouso estático.
4. **Vão Vazio sob os Prédios no Cenário do Rio:** Em `ThemeRJ.js`, havia um vão vazio entre o fundo da laje e a orla marítima, fazendo os prédios e a areia parecerem pontes flutuantes.
5. **Necessidade de Configurações no Painel Admin e HUD:**
   - Tamanho configurável do nome da pipa (`kiteNameScale`).
   - Tamanho configurável do placar TOP 5 live (`top5Scale`).
   - Estilo visual personalizável do TOP 5 live (`top5Style`).
   - Controle de visibilidade dos detalhes extras do placar (`top5ShowExtras`).

---

## 2. Soluções e Implementação Técnica

### A. Correção da Linha 3D e Eliminação de NaN
- **Causa Raiz:** Assinatura incorreta ao chamar `syncLine` em `ThreeSkyScene.js`.
- **Correção:** Em `ThreeSkyScene.js`, calculamos o vetor tridimensional exato da mão direita do bonequinho segurando a carretilha:
  ```javascript
  const handPos = new THREE.Vector3(
    p3d.position.x + 3.4 * scale,
    lajeWorldY + 14.5 * scale,
    lajeZ + p3d.position.z + 6.4 * scale
  );
  this.lines.syncLine(uidStr, k3d.position, handPos, lineCol, opacity, tension);
  ```
- **Sanitização de Coordenadas:** Em `ThreeLines.js`, todas as coordenadas passam por `Number.isFinite() || 0` e só então o `BufferAttribute.needsUpdate = true` e `computeBoundingSphere()` são invocados com segurança total.

### B. Visibilidade e Escala dos Personagens na Laje
- **Mureta Rebaixada:** Em `ThreeLaje.js`, a altura da mureta foi rebaixada de 16.2 para 9.2 unidades (altura da cintura).
- **Escala e Posicionamento:** Em `ThreeCharacters.js`, a escala dos bonecos no modo portrait foi elevada para 1.65x e a elevação dos pés fixada em `y = 2.5`, garantindo visibilidade total de cabeça, corpo, braços e carretilhas na base da tela.
- **Enquadramento de Câmera:** Em `ThreeSkyScene.js`, o ponto focal da câmera no modo retrato foi ajustado para `(0, 10, 0)` a partir de `(0, 10, 830)` com FOV 50, enquadrando a laje harmonicamente no terço inferior da transmissão.

### C. Física Realista e Aerodinâmica das Pipas
- Em `frontend/src/entities/Kite.js`, o cálculo de deslocamento por frame computa `this.vx`, `this.vy` e `this.speed`.
- Em `ThreeSkyScene.js`, `vx` e `vy` alimentam os ângulos de rolagem (`roll`), arfagem (`pitch`) e guinada (`yaw`), reagindo instantaneamente a ventos e manobras autênticas brasileiras (Retão, Despicada, Puxão, Tenteio).

### D. Base de Terreno do Vale Carioca no ThemeRJ
- Em `frontend/src/ui/three/themes/states/ThemeRJ.js`, adicionamos o `valleyFloor` e colinas intermediárias com vegetação tropical cobrindo o intervalo de Z: -520 a 0 e Y: -16 a +4, aterrando a cidade e eliminando qualquer vão sob os edifícios.

### E. Configurações de Customização (Admin, Backend & HUD)
1. **Backend (`settingsManager.js`):**
   - `kiteNameScale`: padrão `1.15`, intervalo validado `0.6` a `2.5`.
   - `top5Scale`: padrão `1.0`, intervalo validado `0.7` a `1.4`.
   - `top5Style`: padrão `'glass'`, opções permitidas: `'glass'`, `'cyberpunk'`, `'gold'`, `'minimal'`.
   - `top5ShowExtras`: padrão `true`, booleano restrito.
2. **Painel Admin (`admin.html`):**
   - Controles visuais no Card A com sliders e selects.
   - Atualização em tempo real de badges visuais (`valKiteNameScale`, `valTop5Scale`).
   - Auto-save com debounce de 350ms e persistência em `game-settings.json`.
3. **Motor & HUD (`App.js`, `HUD.js`, `LeaderboardComponent.js`, `game.css`):**
   - `LeaderboardComponent.setTop5Scale(scale)`: aplica `--top5-scale` e `transform: scale(...)`.
   - `LeaderboardComponent.setTop5Style(style)`: aplica classes `.theme-glass`, `.theme-cyberpunk`, `.theme-gold`, `.theme-minimal`.
   - `LeaderboardComponent.setTop5ShowExtras(show)`: alterna a classe `.hide-extras` que oculta o rodapé, recorde da live, hall da fama e líder atual para transmissões focadas no combate.
   - `ThreeSkyScene.setKiteNameScale(scale)`: redimensiona os sprites 3D de apelido proporcionalmente no espaço 3D.

---

## 3. Auditoria de Segurança (`/security-auditor`)
- **Sanitização Estrita:** Todos os campos recebidos em `/api/settings` passam pela função `sanitize()` com limites numéricos e lista branca (`whitelist`) para estilos.
- **Prevenção de XSS:** A renderização do placar TOP 5 e nomes 3D utiliza DOM nativo (`createElement`, `textContent`, `CanvasRenderingContext2D`) sem `innerHTML`.
- **Controle de Acesso:** O endpoint `/api/settings` requer autorização via middleware `requireLocalControl`.

---

## 4. Testes e Validação (`/test-driven-development`)
- **Suite de Testes:** Executado `npm test` via runner nativo do Node.js.
- **Resultado:** **187/187 testes aprovados** (0 falhas, 0 erros).
- **Inspeção em Tempo Real (CDP):** Executado `scratch/inspect-real-kites.mjs` contra a instância viva em `http://127.0.0.1:3000`.
  - Zero erros no console do navegador.
  - Sincronização e posicionamento NDC de pipa, linha e boneco validados com sucesso.
