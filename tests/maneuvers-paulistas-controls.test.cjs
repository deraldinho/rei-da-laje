const test = require('node:test');
const assert = require('node:assert/strict');

test('Manobras Paulistas (Retão, Mergulho, Relo Lateral, Despicada) e Controles', async (t) => {
  const { MANEUVERS, selectGiftManeuver, maneuverStats, applyManeuverMovement } = await import('../frontend/src/engine/Maneuvers.js');

  await t.test('selectGiftManeuver mapeia presentes para as manobras paulistas solicitadas', () => {
    assert.equal(selectGiftManeuver('Rosa'), 'retao', 'Rosa deve disparar Retão');
    assert.equal(selectGiftManeuver('flor'), 'retao', 'Flor deve disparar Retão');
    assert.equal(selectGiftManeuver('Donut'), 'despicar', 'Donut deve disparar Despicada');
    assert.equal(selectGiftManeuver('mergulho'), 'mergulho', 'Mergulho direto deve retornar mergulho');
    assert.equal(selectGiftManeuver('relo_lateral'), 'relo_lateral', 'Relo lateral direto deve retornar relo_lateral');
    assert.equal(selectGiftManeuver('mestre_do_ceu'), 'mestre_do_ceu', 'Mestre do céu direto deve retornar mestre_do_ceu');
  });

  await t.test('Retão possui velocidade alta, bônus de dano de 1.25 e alcance estendido', () => {
    const stats = maneuverStats('retao', 1, 1);
    assert.ok(stats);
    assert.equal(stats.name, 'retao');
    assert.ok(stats.speed >= 1.4);
    assert.ok(stats.damage >= 1.2);
  });

  await t.test('Mergulho possui velocidade de descida e bônus de corte vertical', () => {
    const stats = maneuverStats('mergulho', 30, 1);
    assert.ok(stats);
    assert.equal(stats.name, 'mergulho');
    assert.ok(stats.speed >= 1.4);
    assert.ok(stats.damage >= 1.2);
  });

  await t.test('applyManeuverMovement executa avanço de Retão com tensão máxima', () => {
    const fakeKite = {
      x: 100, y: 200, screenWidth: 1000, screenHeight: 800,
      isAscending: false, spawnProtection: 0,
      maneuver: { name: 'retao', duration: 30, remaining: 29.5, speed: 1.5, reach: 250 },
      lineTension: 0.5, lineSlack: 0.5
    };
    const moved = applyManeuverMovement(fakeKite, [], 1, { x: 0.2, y: 0 });
    assert.equal(moved, true);
    assert.ok(fakeKite.x > 100, 'Retão deve avançar a posição X');
    assert.equal(fakeKite.lineTension, 1.0, 'Retão deve esticar a linha com tensão máxima 1.0');
    assert.equal(fakeKite.lineSlack, 0, 'Retão deve zerar a folga da linha');
  });

  await t.test('applyManeuverMovement executa descida vertical de Mergulho', () => {
    const fakeKite = {
      x: 200, y: 150, screenWidth: 1000, screenHeight: 800,
      isAscending: false, spawnProtection: 0,
      maneuver: { name: 'mergulho', duration: 30, remaining: 29.5, speed: 1.5, reach: 250 },
      lineTension: 0.5, contactSpeed: 0
    };
    const initialY = fakeKite.y;
    const moved = applyManeuverMovement(fakeKite, [], 1, { x: 0, y: 0 });
    assert.equal(moved, true);
    assert.ok(fakeKite.y > initialY, 'Mergulho deve descer verticalmente aumentando Y');
    assert.ok(fakeKite.contactSpeed >= 20, 'Mergulho deve conferir alta velocidade de impacto');
    assert.equal(fakeKite.rotation, 0.52, 'Mergulho deve apontar o bico para baixo');
  });

  await t.test('applyManeuverMovement executa Despicada no sentido do vento', () => {
    const fakeKite = {
      x: 500, y: 200, screenWidth: 1000, screenHeight: 800,
      isAscending: false, spawnProtection: 0,
      maneuver: { name: 'despicar', duration: 30, remaining: 29.5, speed: 1.35, reach: 200 },
      lineSlack: 0
    };
    const wind = { x: 0.8, y: 0 }; // Vento forte para a direita (+)
    const initialX = fakeKite.x;
    const moved = applyManeuverMovement(fakeKite, [], 1, wind);
    assert.equal(moved, true);
    assert.ok(fakeKite.x > initialX, 'Despicada deve impulsionar a pipa na direção positiva do vento');
  });
});
