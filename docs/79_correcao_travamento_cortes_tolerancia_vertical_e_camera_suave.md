> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Documentação 79: Correção do Travamento de Cena nos Cortes, Tolerância Vertical 9:16 e Estabilização Cinemática da Câmera

## 1. Diagnóstico do Problema
O usuário reportou:
> *"não esta realista. os cortes esta travando a cena"*

Análise das causas raízes identificadas no terminal e código:
1. **Rejeição em Cascata com `POINT_MISMATCH` no Backend:**
   - Em telas verticais de alta resolução (ex: 1432x2428), a altura da arena é de 2428px e as linhas de pipa têm mais de 1800px de comprimento.
   - O validador antigo usava um limite estático estreito de 480px em relação à interseção teórica de retas perfeitas mão-pipa.
   - Como as cordas físicas flexíveis (`RopePhysics` XPBD) curvam com o vento, o ponto de abrasão e corte real ocorria legitimamente na corda, mas longe da reta ideal, gerando falsos positivos de `POINT_MISMATCH`.
2. **`this.syncArena()` Disparado a Cada Relinho:**
   - No frontend, o evento `relinho:cut_rejected` chamava `this.syncArena()`.
   - Isso disparava requisições de rede, destruía todas as pipas na tela, reinstanciava bonecos na laje e causava travamentos repentinos (stutters) no meio da disputa.
3. **Teleporte Artificial de Coordenadas:**
   - No método `handleCutSuccess`, um hack legado reposicionava bruscamente as pipas do vencedor e do perdedor (`winner.x = cutX + ...`, `loser.x = cutX + ...`), fazendo as pipas "pularem" na tela no instante exato do corte.
4. **Agitação Brusca de Câmera no `BroadcastDirector`:**
   - O modo de corte aplicava zoom agressivo e trepidação aleatória (`shakeIntensity = 1.0`), gerando sensação de perda de quadros na transmissão.

---

## 2. Correções Aplicadas

### 2.1. Backend: Validador Dinâmico com Tolerância Vertical Proporcional
Em [`backend/cutClaimValidator.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/backend/cutClaimValidator.js):
- A tolerância agora é calculada dinamicamente com base na resolução vertical e horizontal da arena:
  - `maxTolerance = Math.max(680, screenH * 0.45)`
  - `segmentSlack = Math.max(450, screenW * 0.45)`
- Se as retas estáticas não se cruzarem no ponto exato, o validador confere a distância do ponto de corte aos segmentos curvos de ambas as linhas (`pointToSegmentDist <= segmentSlack`). Se a corda física tocou, o corte é aprovado imediatamente como legítimo.

### 2.2. Frontend: Eliminação de Teleportes e Proteção Anti-Stutter
Em [`frontend/src/engine/App.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js):
- **Zero Teleporte:** As pipas mantêm rigorosamente sua posição, velocidade vetorial e inércia no momento da ruptura; a perdedora desliga a linha e vira `FlyawayKite` de forma fluida e natural.
- **Eliminação do `syncArena` Disruptivo:** O recebimento de ack ou reject não reseta a arena local, garantindo taxa de quadros estável a 60 FPS contínuos.

### 2.3. Câmera Ultra-Suave (Broadcast Director Estabilizado)
Em [`frontend/src/ui/three/BroadcastDirector.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/three/BroadcastDirector.js):
- Removida trepidação brusca de corte (`shakeIntensity = 0`).
- Zoom suave e cinematográfico (aproximação sutil de 60 unidades em vez de 190).
- Amortecimento contínuo com `lerpSpeed = 1.6` (corte) e `1.1` (combate), simulando câmera sobre trilhos de transmissão de e-sports.

---

## 3. Validação
- **Suíte de Testes:** **237/237 testes passando** (`npm test`).
- **Novo Teste:** Validação de corte em tela vertical 1432x2428 aprovada sem `POINT_MISMATCH`.
- **Build de Produção:** `npm run build` gerado com sucesso.
- **Servidor:** Reiniciado na porta 3000 pronto para OBS e TikTok Live.
