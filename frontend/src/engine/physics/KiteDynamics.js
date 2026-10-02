/**
 * KiteDynamics - Modelo Físico Dinâmico da Pipa (P8/P9)
 * 
 * Substitui o deslocamento puramente cinemático por dinâmica real:
 * - A pipa tem massa, velocidade vetorial (vx, vy) e momento angular.
 * - Forças atuantes:
 *   1. Vento (Sustentação aerodinâmica Lift e Arrasto Drag).
 *   2. Gravidade (peso da pipa, rabiola e linha).
 *   3. Tensão da Corda XPBD (puxa o cabresto na direção do fio).
 *   4. Intenções de Controle (comentários/presentes: reelVelocity, liftIntent, steerIntent).
 */
const SPARSE_CROSSING_SPEED = 0.72;
const DENSE_CROSSING_SPEED = 0.34;

export function sparseCruiseTarget(kite, population = 2, globalTime = 0, width = 1080, height = 1920) {
  const count = Math.max(2, Math.min(8, Math.floor(Number(population) || 2)));
  const layoutIndex = Number(kite?.rooftopPlayer?.layoutIndex);
  const hasLayoutIndex = Number.isFinite(layoutIndex);
  const rank = hasLayoutIndex ? ((Math.floor(layoutIndex) % count) + count) % count : 0;
  const fallbackPhase = Number.isFinite(kite?.windPhase) ? kite.windPhase : 0;
  const phase = hasLayoutIndex ? (rank * Math.PI * 2) / count : fallbackPhase;
  const t = Number.isFinite(globalTime) ? globalTime : 0;
  const w = Math.max(320, Number(width) || 1080);
  const h = Math.max(480, Number(height) || 1920);

  // Fases uniformemente espaÃ§adas fazem os sobreviventes trocarem de corredor.
  // Para 2 pipas as fases sÃ£o exatamente opostas; 3/4 formam uma circulaÃ§Ã£o.
  const crossingWave = Math.cos(t * SPARSE_CROSSING_SPEED + phase);
  const verticalWave = Math.sin(t * 0.43 + phase * 0.35);
  return {
    x: w * (0.5 + crossingWave * 0.34),
    y: h * (0.28 + verticalWave * 0.075)
  };
}

export function denseCruiseTarget(kite, population = 40, globalTime = 0, width = 1080, height = 1920) {
  const count = Math.max(9, Math.min(40, Math.floor(Number(population) || 40)));
  const layoutIndex = Number(kite?.rooftopPlayer?.layoutIndex);
  const rank = Number.isFinite(layoutIndex) ? ((Math.floor(layoutIndex) % count) + count) % count : 0;
  const rows = count >= 28 ? 4 : count >= 18 ? 3 : 2;
  const cols = Math.max(2, Math.ceil(count / rows));
  const row = rank % rows;
  const col = Math.min(cols - 1, Math.floor(rank / rows));
  const w = Math.max(320, Number(width) || 1080);
  const h = Math.max(480, Number(height) || 1920);
  const t = Number.isFinite(globalTime) ? globalTime : 0;
  const phase = row * (Math.PI / 2) + col * 0.61;
  const baseX = w * (0.12 + (col / Math.max(1, cols - 1)) * 0.76);
  const baseY = h * (0.20 + (row / Math.max(1, rows - 1)) * 0.14);
  const x = baseX + Math.sin(t * DENSE_CROSSING_SPEED + phase) * w * 0.045;
  const y = baseY + Math.cos(t * 0.28 + phase * 0.6) * h * 0.012;
  return {
    x: Math.max(w * 0.10, Math.min(w * 0.90, x)),
    y: Math.max(h * 0.18, Math.min(h * 0.38, y))
  };
}

export class KiteDynamics {
  // Relógio global compartilhado: TODAS as pipas usam o mesmo tempo para convergir
  // ao MESMO ponto de encontro simultaneamente. Sem isso, cada pipa calculava
  // seu próprio ponto e momento de convergência (oscillationTimer é randômico).
  static _globalTime = 0;
  static _stepFrame = 0;   // counter de substep para deduplicar incremento
  static _lastFrame = -1;  // último substep processado
  /**
   * Executa um passo determinístico de dinâmica física na pipa (60 Hz fixo)
   * @param {object} kite Instância da pipa
   * @param {number} fixedDt Delta time fixo em segundos (ex: 1/60)
   * @param {object} wind Vetor de vento {x, y, gust}
   * @param {number} population Total de pipas na arena
   */
  static step(kite, fixedDt = 1 / 60, wind = null, population = 2) {
    if (!kite || !Number.isFinite(kite.x) || !Number.isFinite(kite.y)) return;

    const dt = Math.max(0.001, Math.min(0.05, Number(fixedDt) || 1 / 60));
    // Incrementa o relógio global apenas UMA vez por substep de física,
    // não uma vez por pipa. Usa counter de frame incrementado externamente.
    const currentFrame = KiteDynamics._stepFrame;
    if (currentFrame !== KiteDynamics._lastFrame) {
      KiteDynamics._globalTime += dt;
      KiteDynamics._lastFrame = currentFrame;
    }
    const wX = Number.isFinite(wind?.x) ? wind.x : 0;
    const wY = Number.isFinite(wind?.y) ? wind.y : 0;
    const gust = Number.isFinite(wind?.gust) ? wind.gust : 1.0;

    // Inicializa propriedades dinâmicas se ainda não existirem
    if (!Number.isFinite(kite.vx)) kite.vx = 0;
    if (!Number.isFinite(kite.vy)) kite.vy = 0;
    if (!Number.isFinite(kite.mass)) kite.mass = 0.85; // kg normalizado

    // 1. Força Gravitacional
    const gravityForce = 38.0 * kite.mass; // px/s^2 para baixo (+Y)

    // 2. Tensão física emergente da linha RopePhysics (Two-Way Coupling)
    let tensionFx = 0;
    let tensionFy = 0;
    const rope = kite.rope;

    if (rope && rope.isInitialized && Array.isArray(rope.nodes) && rope.nodes.length >= 2) {
      const nNodes = rope.nodes.length;
      const topNode = rope.nodes[nNodes - 1]; // cabresto da pipa
      const prevNode = rope.nodes[nNodes - 2]; // nó imediatamente anterior da linha

      const dx = prevNode.x - topNode.x;
      const dy = prevNode.y - topNode.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Direção da linha puxando a pipa
      const dirX = dx / dist;
      const dirY = dy / dist;

      // Magnitude da tensão: linha esticada puxa forte; linha frouxa (descarrego) não puxa
      const tensionMag = (rope.tension || 0.58) * 115.0;
      tensionFx = dirX * tensionMag;
      tensionFy = dirY * tensionMag;
    }

    // 3. Força Aerodinâmica do Vento (Sustentação Lift, Arrasto Drag e Direcionamento do Bico)
    // O vento aparente relativo à velocidade da pipa
    const apparentWindX = (wX * 32.0 * gust) - kite.vx;
    const apparentWindY = (wY * 18.0) - kite.vy;

    // Arrasto aerodinâmico do corpo da pipa (empurra na direção do fluxo relativo)
    const dragCoeff = 0.95;
    const dragFx = apparentWindX * dragCoeff * 2.5;

    // Arrasto e peso físico da rabiola (a cauda puxa para trás e para baixo, estabilizando)
    const tailDragFx = -kite.vx * 0.28;
    const tailDragFy = -kite.vy * 0.25 + 5.5; // peso da rabiola

    // Sustentação (Lift): em uma pipa real, o vento contra o plano inclinado (bico) gera empuxo aerodinâmico
    const speed = (kite.likeBoostRemaining || 0) > 0 ? 1.35 : 1.0;
    const liftCoeff = 1.25 * speed;
    const naturalLift = -gravityForce * 0.96; // Sustentação que mantém a pipa pairando no céu
    const dynamicLift = -Math.max(8.0, Math.abs(apparentWindX) * 1.5) * liftCoeff;
    const liftFy = naturalLift + dynamicLift * 0.3;

    // Empuxo Direcional do Bico: a inclinação da pipa projeta a sustentação na direção do seu eixo
    const curRot = Number.isFinite(kite.rotation) ? kite.rotation : 0;
    const noseDirX = Math.sin(curRot);
    const noseDirY = -Math.cos(curRot);
    const liftMagnitude = (Math.abs(apparentWindX) * 1.6 + 32.0) * liftCoeff;
    const noseLiftFx = noseDirX * liftMagnitude * 0.55;
    const noseLiftFy = (noseDirY + 1.0) * liftMagnitude * 0.45; // compensação vertical do bico

    // Balanço aerodinâmico natural da pipa no céu (dança ao sabor da brisa)
    const swayTimer = (kite.oscillationTimer || 0) * 1.5 + (kite.windPhase || 0);
    const sparse = population <= 8;
    // Em arenas pequenas/médias, o balanço precisa ser maior para gerar cruzamentos reais
    const swayAmpX = sparse ? 55.0 : 18.0;
    const swayAmpY = sparse ? 35.0 : 12.0;
    const naturalSwayFx = Math.sin(swayTimer) * swayAmpX + (sparse ? Math.sin(swayTimer * 0.37) * 30.0 : 0);
    const naturalSwayFy = Math.cos(swayTimer * 0.8) * swayAmpY + (sparse ? Math.cos(swayTimer * 0.29) * 18.0 : 0);

    // 4. Intenções de Controle Físico (PlayerIntentController, Buffer de Chat e Fila de Manobras)
    let controlFx = 0;
    let controlFy = 0;

    // Atualiza amortecedor de chat (LiveInputBuffer) e fila de manobras (ManeuverQueue)
    if (kite.inputBuffer) {
      kite.inputBuffer.step(dt, kite.intentController);
    }
    if (kite.maneuverQueue) {
      kite.maneuverQueue.step(dt, kite.intentController);
    }

    // Coleta intenções físicas ativas
    if (kite.intentController) {
      const intent = kite.intentController.update(dt, wind, population);
      if (intent) {
        // Velocidade de carretilha (recolher acelera puxão no bico; soltar alivia tensão e cria barriga)
        if (intent.reelVelocity < 0) {
          const pullMag = Math.abs(intent.reelVelocity);
          rope?.pullIn(pullMag * 2.2 * dt * 60);
          controlFx += tensionFx * (1.0 + pullMag * 0.35) + noseDirX * pullMag * 35.0;
          controlFy += tensionFy * (1.0 + pullMag * 0.35) + noseDirY * pullMag * 35.0; // arranca forte na direção do bico
        } else if (intent.reelVelocity > 0) {
          rope?.releaseSpool(intent.reelVelocity * 2.0 * dt * 60);
          // Soltar linha reduz a força exercida pela linha, deixando a pipa livre
          tensionFx *= 0.25;
          tensionFy *= 0.25;
        }

        // Intenção de sustentação / arfagem (-Y sobe, +Y mergulha)
        controlFy -= intent.liftIntent * 68.0;

        // Intenção de esterçamento lateral (guinada para esquerda/direita)
        controlFx += intent.steerIntent * 62.0;

        // Assistência de tração
        if (intent.tensionAssist && rope) {
          rope.tension = Math.min(1.0, (rope.tension || 0.58) + intent.tensionAssist * 0.15);
        }
      }
    }

    // Manobras legadas ativas
    if (kite.maneuver && kite.maneuver.remaining > 0 && !kite.intentController?.currentAction) {
      const mName = String(kite.maneuver.name).toLowerCase();
      if (mName === 'retao' || mName === 'puxao') {
        controlFx += (kite.vx >= 0 ? 45.0 : -45.0) + noseDirX * 35.0;
        controlFy -= 75.0;
        rope?.pullIn(7.0 * dt * 60);
      } else if (mName === 'despicar' || mName === 'desbicada' || mName === 'mergulho') {
        controlFy += 95.0;
        controlFx += (wX >= 0 ? 42.0 : -42.0);
        rope?.releaseSpool(6.0 * dt * 60);
      } else if (mName.startsWith('aparar')) {
        controlFy -= 35.0;
        rope?.releaseSpool(3.0 * dt * 60);
      }
    }

    // 5. Estabilidade Aerodinâmica de Altitude de Cruzeiro e Dispersão no Céu
    const width = Number.isFinite(kite.screenWidth) ? kite.screenWidth : 1080;
    const height = Number.isFinite(kite.screenHeight) ? kite.screenHeight : 1920;

    // Convergência Dinâmica para Populações Baixas (≤4 pipas):
    // Conceito: COMPRIMIR → EXPANDIR → CRUZAR
    //
    // 1. Convergência ALTA: drift é comprimido, todas as pipas vão pro CENTRO
    // 2. Convergência BAIXA: drift se expande, cada pipa usa sua windPhase
    //    individual e vai pra um LADO DIFERENTE do céu
    // 3. Como as mãos (âncoras na laje) ficam fixas, pipas que trocam de lado
    //    cruzam as linhas umas das outras → RELINHO NATURAL
    //
    // NOTA: O erro anterior era convergir todas a UM MESMO PONTO — isso formava
    // um "leque" de linhas que NUNCA se cruzavam.
    let cruiseX, cruiseY;

    if (sparse) {
      const target = sparseCruiseTarget(kite, population, KiteDynamics._globalTime, width, height);
      cruiseX = target.x;
      cruiseY = target.y;
    } else {
      const target = denseCruiseTarget(kite, population, KiteDynamics._globalTime, width, height);
      cruiseX = target.x;
      cruiseY = target.y;
    }

    // Sustentação restauradora de altitude: quanto mais a pipa descer em relação ao céu,
    // maior a sustentação ascencional do vento contra a face inferior da pipa (-Y).
    // Em arena cheia a mola vertical também mantém as faixas legíveis sob vento forte.
    const altitudeError = kite.y - cruiseY;
    const restoringLiftFy = -altitudeError * (sparse ? 1.8 : 1.95);

    // Força lateral de corredor: em arena cheia precisa vencer o arrasto comum do vento;
    // sem isso dezenas de pipas acumulam na mesma borda da tela.
    const lateralCorridorFx = -(kite.x - cruiseX) * (sparse ? 0.55 : 1.15);

    // A linha equilibra a sustentação; atenuamos a componente vertical para não afundar a pipa na laje
    const balancedTensionFy = tensionFy * 0.12;

    // 6. Integração Newtoniana (F = m * a -> a = F / m -> v += a * dt)
    const totalFx = dragFx + tailDragFx + tensionFx + noseLiftFx + controlFx + naturalSwayFx + lateralCorridorFx;
    const totalFy = gravityForce + tailDragFy + liftFy + noseLiftFy + balancedTensionFy + controlFy + naturalSwayFy + restoringLiftFy;

    const ax = totalFx / kite.mass;
    const ay = totalFy / kite.mass;

    kite.vx += ax * dt;
    kite.vy += ay * dt;

    // Amortecimento do ar (air damping) - fluido e responsivo
    const airDamping = Math.pow(0.91, dt * 60);
    kite.vx *= airDamping;
    kite.vy *= airDamping;

    // 7. Atualização de Posição
    kite.x += kite.vx * dt * 60;
    kite.y += kite.vy * dt * 60;

    // 8. Rotação dinâmica coerente com o movimento aerodinâmico e estabilização de rabiola
    const targetRot = Math.max(-0.65, Math.min(0.65, (kite.vx * 0.08) + (wX * 0.09)));
    kite.rotation += (targetRot - kite.rotation) * Math.min(1.0, dt * 14);

    // 9. Limites físicos de segurança da arena (sempre no alto do céu, bem acima da laje)
    kite.x = Math.max(width * 0.08, Math.min(width * 0.92, kite.x));
    kite.y = Math.max(height * 0.12, Math.min(height * 0.44, kite.y));
  }
}
