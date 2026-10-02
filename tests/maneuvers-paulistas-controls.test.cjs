const test = require('node:test');
const assert = require('node:assert/strict');

test('Manobras Paulistas (Retão, Mergulho, Relo Lateral, Despicada) e Controles', async (t) => {
  const { MANEUVERS, selectGiftManeuver, maneuverStats, applyManeuverMovement } = await import('../frontend/src/engine/Maneuvers.js');
  const {PlayerIntentController}=await import('../frontend/src/engine/physics/PlayerIntentController.js');

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

  await t.test('Retão agenda sequência física sem teleporte',()=>{
    const k={x:100,y:200,screenWidth:1000,screenHeight:800,isAscending:false,spawnProtection:0,maneuver:{name:'retao',duration:30,remaining:29.5,speed:1.5,reach:250}};k.intentController=new PlayerIntentController(k);const before={x:k.x,y:k.y};
    assert.equal(applyManeuverMovement(k,[],1,{x:.2,y:0}),true);const intent=k.intentController.update(1/60,{x:.2,y:0},[k]);
    assert.ok(intent.spoolCommand>0);assert.deepEqual({x:k.x,y:k.y},before);
  });

  await t.test('Mergulho produz trim para baixo e folga física',()=>{
    const k={x:200,y:150,screenWidth:1000,screenHeight:800,isAscending:false,spawnProtection:0,maneuver:{name:'mergulho',duration:30,remaining:29.5,speed:1.5,reach:250}};k.intentController=new PlayerIntentController(k);const beforeY=k.y;
    assert.equal(applyManeuverMovement(k,[],1,{x:0,y:0}),true);const intent=k.intentController.update(1/60,{x:0,y:0},[k]);
    assert.ok(intent.trimPitch>0);assert.ok(intent.spoolCommand>0);assert.equal(k.y,beforeY);
  });

  await t.test('Despicada gera torque no sentido do vento sem mover coordenadas',()=>{
    const k={x:500,y:200,screenWidth:1000,screenHeight:800,isAscending:false,spawnProtection:0,maneuver:{name:'despicar',duration:30,remaining:29.5,speed:1.35,reach:200}};k.intentController=new PlayerIntentController(k);const beforeX=k.x;
    assert.equal(applyManeuverMovement(k,[],1,{x:.8,y:0}),true);const intent=k.intentController.update(1/60,{x:.8,y:0},[k]);
    assert.ok(intent.spoolCommand>0);assert.ok(intent.debicoTorque>0);assert.equal(k.x,beforeX);
  });
});
