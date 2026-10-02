const test = require('node:test');
const assert = require('node:assert/strict');

test('P11 - PlayerIntentController: mapeamento de comandos clássicos para intenção física contínua', async () => {
  const { PlayerIntentController } = await import('../frontend/src/engine/physics/PlayerIntentController.js');

  const mockKite = {
    x: 400,
    y: 500,
    screenWidth: 1080,
    screenHeight: 1920,
    oscillationTimer: 1.0,
    windPhase: 0.5
  };

  const controller = new PlayerIntentController(mockKite);
  assert.equal(controller.currentAction, null);

  // 1. Comando Puxar
  controller.triggerAction('puxar', 1.0, { intensity: 1.2 });
  assert.equal(controller.currentAction, 'puxar');
  let intent = controller.update(1 / 60, { x: 0.5, y: 0 }, []);
  assert.ok(intent.reelVelocity < 0, 'Puxar deve recolher carretel (reelVelocity < 0)');
  assert.ok(intent.liftIntent > 0, 'Puxar deve elevar sustentação');
  assert.ok(intent.tensionAssist > 0, 'Puxar deve aumentar tensão');
  assert.ok(intent.spoolCommand < 0 && intent.trimPitch < 0, 'Puxar canônico recolhe linha e orienta retão');

  // 2. Comando Descarregar
  controller.triggerAction('descarregar', 1.0);
  intent = controller.update(1 / 60, { x: 0.5, y: 0 }, []);
  assert.ok(intent.reelVelocity > 0, 'Descarregar deve soltar carretel (reelVelocity > 0)');
  assert.ok(intent.tensionAssist < 0, 'Descarregar deve reduzir tensão');
  assert.ok(intent.spoolCommand > 0, 'Descarregar canônico deve liberar linha');

  // 3. Comando Despicar
  controller.triggerAction('despicar', 1.0);
  intent = controller.update(1 / 60, { x: 0.5, y: 0 }, []);
  assert.ok(intent.liftIntent < 0, 'Despicar deve apontar o bico para baixo (liftIntent < 0)');
  assert.ok(intent.steerIntent !== 0, 'Despicar deve ter componente lateral');
  assert.ok(Math.abs(intent.debicoTorque) > 0.5, 'Despicar canônico deve aplicar torque angular');

  // 4. Comando Tenteio (pulsos)
  controller.triggerAction('tenteio', 1.5);
  const intent1 = controller.update(1 / 60, { x: 0, y: 0 }, []);
  assert.ok(controller.currentAction === 'tenteio');
});

test('P12 - LiveInputBuffer: amortecimento determinístico de rajadas de torcida e chat', async () => {
  const { LiveInputBuffer } = await import('../frontend/src/engine/physics/LiveInputBuffer.js');
  const { PlayerIntentController } = await import('../frontend/src/engine/physics/PlayerIntentController.js');

  const mockKite = { x: 500, y: 600, screenWidth: 1080, screenHeight: 1920 };
  const controller = new PlayerIntentController(mockKite);
  const buffer = new LiveInputBuffer(mockKite);

  // Rajada de 50 curtidas simultâneas
  buffer.addLikes(50);
  assert.ok(buffer.likeEnergy > 10, 'Curtidas devem carregar likeEnergy');

  // 10 comentários de chat em rajada
  for (let i = 0; i < 10; i++) {
    buffer.addComment('Bora pipa linda #puxar');
  }
  assert.ok(buffer.commentEnergy > 5, 'Comentários devem carregar commentEnergy');
  assert.ok(buffer.pendingCommands.length > 0, 'Comentários devem gerar gestos físicos na fila existente');

  // Drena suavemente por alguns passos físicos
  buffer.step(1 / 60, controller);
  assert.ok(controller.currentAction === 'comment_gesture', 'Buffer deve acionar gesto físico sem teleporte');
});

test('P12 - ManeuverQueue: prioridade de presentes e transições suaves', async () => {
  const { ManeuverQueue } = await import('../frontend/src/engine/physics/ManeuverQueue.js');
  const { PlayerIntentController } = await import('../frontend/src/engine/physics/PlayerIntentController.js');

  const mockKite = {
    x: 500,
    y: 600,
    screenWidth: 1080,
    screenHeight: 1920,
    setManeuver(data) { this.maneuver = data; }
  };
  const controller = new PlayerIntentController(mockKite);
  const queue = new ManeuverQueue(mockKite);

  // Enfileira Retão
  queue.enqueue({ name: 'retao', duration: 10, priority: 1 }, controller);
  assert.equal(queue.activeManeuver.name, 'retao');

  // Enfileira Despicar (entra na fila)
  queue.enqueue({ name: 'despicar', duration: 5, priority: 1 }, controller);
  assert.equal(queue.queue.length, 1);
  assert.equal(queue.activeManeuver.name, 'retao');

  // Enfileira Mestre do Céu (prioridade lendária 10 -> assume imediatamente)
  queue.enqueue({ name: 'mestre_do_ceu', duration: 15, priority: 10 }, controller);
  assert.equal(queue.activeManeuver.name, 'mestre_do_ceu');
  assert.equal(queue.queue.length, 2, 'Manobra anterior deve voltar para a fila');
});

test('P13 - BroadcastDirector: segue o vento e preserva o grupo em quadro', async () => {
  const THREE = await import('three');
  const { BroadcastDirector } = await import('../frontend/src/ui/three/BroadcastDirector.js');
  const camera = new THREE.PerspectiveCamera(46, 1080 / 1920, 1, 3600);
  const basePos = new THREE.Vector3(0, 0, 720); camera.position.copy(basePos);
  const director = new BroadcastDirector(camera, basePos);
  const kitesMap = new Map([['1', { isInCombat: true }], ['2', { isInCombat: true }]]);
  const kites3D = new Map([
    ['1', { position: new THREE.Vector3(-140, 20, 100) }],
    ['2', { position: new THREE.Vector3(140, 40, 120) }]
  ]);
  director.triggerCutFocus(900, 700, 100);
  director.update(0.016, kitesMap, kites3D, { x: 1, y: 0, z: 0, gust: 1 });
  assert.equal(director.currentMode, 'wind-follow');
  assert.ok(director.targetLookAt.x > 0, 'vento +X deve antecipar a câmera para +X');
  assert.ok(director.targetPos.z >= basePos.z, 'câmera deve abrir para manter o grupo visível');
  assert.ok(Math.abs(director.targetLookAt.x) < 220, 'evento não pode puxar a câmera para fora do grupo');
});

test('Validação de corte em tela vertical 1432x2428 não rejeita com POINT_MISMATCH', () => {
  const { validateCutClaim } = require('../backend/cutClaimValidator');
  const GameRules = require('../backend/rules/gameRules');
  const rules = new GameRules(2);
  rules.handlePlayerComment({ userId: 'win' });
  rules.handlePlayerComment({ userId: 'los' });

  const now = Date.now();
  const states = new Map([
    ['win', {
      userId: 'win', updatedAt: now,
      screenWidth: 1432, screenHeight: 2428,
      baseX: 720, baseY: 2100,
      x: 750, y: 800
    }],
    ['los', {
      userId: 'los', updatedAt: now,
      screenWidth: 1432, screenHeight: 2428,
      baseX: 740, baseY: 2100,
      x: 710, y: 850
    }]
  ]);

  // Ponto de corte na corda em Y=1760 (como no caso real do usuário)
  const result = validateCutClaim({
    winnerId: 'win',
    loserId: 'los',
    cutX: 730,
    cutY: 1760
  }, rules, states, now);

  assert.equal(result.ok, true, 'Corte legítimo de corda curva em tela vertical deve ser aceito');
  assert.equal(result.reason, undefined);
});

