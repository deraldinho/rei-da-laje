const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const physicsUrl = pathToFileURL(path.resolve(__dirname, '..', 'frontend/src/engine/Physics.js')).href;

function makeKite(id, hp, power = 1) {
  return {
    userId: id,
    lineType: 'algodao',
    lineHP: hp,
    maxLineHP: 100,
    powerMultiplier: power,
    lineTension: 1,
    contactSpeed: 20,
    defenseWindowRemaining: 0,
    x: id === 'a' ? 300 : 700,
    y: 300,
    baseX: id === 'a' ? 250 : 750,
    baseY: 1700,
    shieldCount: 0,
    takeDamage(amount) { this.lineHP -= amount; return this.lineHP <= 0; },
    updateHPBar() {},
    calculateCombatPower() { return this.powerMultiplier; }
  };
}

test('resolveRelinhoCombat funciona quando passado como callback sem this', async () => {
  const { Physics } = await import(`${physicsUrl}?t=${Date.now()}`);
  const resolver = Physics.resolveRelinhoCombat;
  const a = makeKite('a', 100, 4);
  const b = makeKite('b', 0.01, 1);
  const intersection = { x: 500, y: 800, kiteA: a, kiteB: b, sinAngle: 1, slidingSpeed: 30 };
  const contact = { phase: 'GRINDING', sinAngle: 1, slidingSpeed: 30, friction: 1 };

  const result = resolver(a, b, intersection, 1, contact);
  assert.equal(result.tied, false);
  assert.equal(result.winner, a);
  assert.equal(result.loser, b);
});
