import { getLineMaterial } from './LineMaterial.js';

/**
 * RelinhoContactSolver - Solucionador Físico de Atrito e Desgaste Abrasivo
 * 
 * Modela a física real do relinho:
 * 1. Força Normal (N) derivada da tensão combinada e ângulo de cruzamento:
 *    N ≈ T_efetiva * sin(θ)
 * 2. Força de Atrito Cinético:
 *    F_atrito = μ * N
 * 3. Taxa de Trabalho de Cisalhamento (Potência dissipada):
 *    P = F_atrito * V_deslizamento
 * 4. Desgaste Abrasivo Localizado:
 *    Dano = P * Δt * (Abrasividade_Atacante / Resistencia_Defensor)
 * 5. Ruptura Física no Segmento:
 *    A linha rompe quando o segmento atinge desgaste máximo ou o HP zera.
 */
export class RelinhoContactSolver {
  /**
   * Calcula o trabalho de atrito e as taxas de dano abrasivo entre as duas linhas.
   */
  static calculateFrictionalWork(kiteA, kiteB, contactPoint, contactInfo = {}) {
    const matA = kiteA.rope?.material || (typeof getLineMaterial === 'function' ? getLineMaterial(kiteA.lineType) : { abrasiveness: 1, abrasionResistance: 1, friction: 0.65 });
    const matB = kiteB.rope?.material || (typeof getLineMaterial === 'function' ? getLineMaterial(kiteB.lineType) : { abrasiveness: 1, abrasionResistance: 1, friction: 0.65 });

    // 1. Tensão física nos pontos de contato
    const tensionA = kiteA.rope ? kiteA.rope.getNaturalTension() : Number(kiteA.lineTension ?? 0.58);
    const tensionB = kiteB.rope ? kiteB.rope.getNaturalTension() : Number(kiteB.lineTension ?? 0.58);

    // 2. Fricao combinada dos materiais
    const combinedFriction = (matA.friction + matB.friction) * 0.5;
    const friction = Math.max(0.25, Math.min(1.35, contactInfo.friction || combinedFriction));

    // Passo 7 — bug do short-circuit || corrigido:
    // Em JavaScript: 0 || 1.0 === 1.0 (falsy), portanto sinAngle=0 virava 1.0.
    // Isso significava que linhas paralelas (sinθ≈0) recebiam pressão máxima de corte.
    // Correção: usar Number.isFinite para distinguir 0 (válido) de undefined/NaN.
    const rawSinAngle = Number.isFinite(contactInfo.sinAngle)
      ? contactInfo.sinAngle
      : (Number.isFinite(contactInfo.angleFactor) ? contactInfo.angleFactor : 1.0);
    // Clampa entre 0 e 1.3 (0 é válido: linhas paralelas = zero força normal)
    const sinAngle = Math.max(0.0, Math.min(1.3, rawSinAngle));

    // Passo 6 — P = F_atrito × V_deslizamento (física real):
    // Antes: dano era constante independente de slidingSpeed (testado: speed 0 = speed 1000 = 0.6888)
    // Agora: sem deslizamento (speed=0) -> sem abrasão (como no mundo real)
    //
    // Fallback quando slidingSpeed não é fornecido (ex.: testes legados ou caminho sem RopeCollision):
    // Usa contactSpeed do kite (definido por manobras) como proxy de velocidade de deslizamento.
    // Isso preserva comportamento não-zero do sistema legado, mas quando RopeCollision
    // fornece slidingSpeed explícito (inclusive 0), esse valor é usado literalmente.
    const hasExplicitSpeed = Number.isFinite(contactInfo.slidingSpeed);
    const slidingSpeed = hasExplicitSpeed
      ? Math.max(0, contactInfo.slidingSpeed)
      : Math.max(
          1, // mínimo de referência para preservar dano em colisões legadas
          ((kiteA.contactSpeed || 0) + (kiteB.contactSpeed || 0)) * 0.5 * 0.15 +
          Math.abs((kiteA.lineTension || 0.58) - 0.4) * 12 + 8 // derivado da tensão
        );

    // Física do relinho:
    //   N = T_efetiva × sin(θ)     força normal proporcional à tensão e ângulo
    //   F_f = μ × N               atrito cinético
    //   P = F_f × V_slide          potência dissipada por abrasão
    //   wear = P × Δt × K          desgaste localizado (K = constante tribelógica)
    const normalForceA = tensionA * sinAngle;
    const normalForceB = tensionB * sinAngle;
    const frictionForceA = friction * normalForceA;
    const frictionForceB = friction * normalForceB;
    const powerA = frictionForceA * slidingSpeed; // potência de abrasão sobre A
    const powerB = frictionForceB * slidingSpeed; // potência de abrasão sobre B

    // 4. Modificadores de manobra, geometria e habilidades especiais
    const celestialA = kiteA.isInvulnerable || kiteA.lineType === 'mestre_do_ceu';
    const celestialB = kiteB.isInvulnerable || kiteB.lineType === 'mestre_do_ceu';
    const powerMultA = typeof kiteA.calculateCombatPower === 'function' ? kiteA.calculateCombatPower() : Number(kiteA.powerMultiplier || 1);
    const powerMultB = typeof kiteB.calculateCombatPower === 'function' ? kiteB.calculateCombatPower() : Number(kiteB.powerMultiplier || 1);

    const ratio = (kite) => {
      if (![kite.x, kite.y, kite.baseX, kite.baseY].every(Number.isFinite)) return 1;
      const length = Math.hypot(kite.x - kite.baseX, kite.y - kite.baseY);
      return length > 0 ? Math.hypot(kite.x - contactPoint.x, kite.y - contactPoint.y) / length : 1;
    };
    const geometryBoostA = ratio(kiteA) < 0.25 ? 1.12 : 1;
    const geometryBoostB = ratio(kiteB) < 0.25 ? 1.12 : 1;

    const tensionBonus = (t) => 0.72 + Math.max(0.12, Math.min(1.0, t)) * 0.55;
    const offenseA = Math.min(1.25, kiteA.maneuver?.damage || 1) * geometryBoostA * tensionBonus(tensionA);
    const offenseB = Math.min(1.25, kiteB.maneuver?.damage || 1) * geometryBoostB * tensionBonus(tensionB);

    const defenseWindow = (k) => k.defenseWindowRemaining > 0 ? 0.72 : 1;
    const comboDefense = (k) => Math.max(0.7, Math.min(1.0, k.chatCombo?.defense || 1));
    const defenseA = Math.max(0.5, Math.min(1.0, kiteA.maneuver?.defense || 1)) * defenseWindow(kiteA) * comboDefense(kiteA) * (celestialA ? 0.52 : 1);
    const defenseB = Math.max(0.5, Math.min(1.0, kiteB.maneuver?.defense || 1)) * defenseWindow(kiteB) * comboDefense(kiteB) * (celestialB ? 0.52 : 1);

    const shock = (k) => Number.isFinite(k.contactSpeed) && k.contactSpeed > 8 ? 1.12 : 1;

    // Razão tribelógica: Abrasividade do atacante sobre a resistência do defensor
    const abrasivenessRatioA = (matA.abrasiveness || 1.0) / Math.max(0.2, matB.abrasionResistance || 1.0);
    const abrasivenessRatioB = (matB.abrasiveness || 1.0) / Math.max(0.2, matA.abrasionResistance || 1.0);

    // Constante tribelógica de escala (calibrável via settings futuros)
    // K=0.14 calibrado para que uma colisão com slidingSpeed≈10, sinAngle≈1, tensão≈0.58
    // produza damageRate ≈ 0.69 — preservando o ritmo de jogo do sistema legado.
    // slidingSpeed=0 → damageRate=0 (física causal mantida).
    const K = 0.14;

    // Taxa de dano derivada da potência física (Passo 6: agora causal)
    const damageRateB = powerA * K * abrasivenessRatioA * powerMultA * offenseA * defenseB * shock(kiteA); // A ataca B
    const damageRateA = powerB * K * abrasivenessRatioB * powerMultB * offenseB * defenseA * shock(kiteB); // B ataca A

    return {
      friction,
      sinAngle,
      slidingSpeed,
      damageRateA,
      damageRateB
    };
  }

  /**
   * Resolve o passo completo de combate entre as duas pipas
   */
  static resolveCombatStep(kiteA, kiteB, intersectionPoint, delta = 1, contact = null, finalizeCutFn = null) {
    const step = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 3)) : 1;

    // Primeiro toque só produz faíscas: o dano começa quando o contato atinge GRINDING
    if (contact && contact.phase && contact.phase !== 'GRINDING') {
      return {
        tied: true,
        sparksOnly: true,
        contactPhase: contact.phase,
        friction: contact.friction || 0
      };
    }

    const { damageRateA, damageRateB } = this.calculateFrictionalWork(
      kiteA,
      kiteB,
      intersectionPoint,
      contact || {}
    );

    // Dano do frame com escala de passo exata (compatibilidade 1:1 com fixed timestep)
    const damageA = damageRateA * step;
    const damageB = damageRateB * step;

    const maxHPA = Math.max(1, Number(kiteA.maxLineHP) || 100);
    const maxHPB = Math.max(1, Number(kiteB.maxLineHP) || 100);

    // Aplica desgaste nos nós físicos das cordas se disponíveis
    if (kiteA.rope && Number.isFinite(intersectionPoint?.segmentIndexA)) {
      kiteA.rope.applySegmentWear(intersectionPoint.segmentIndexA, (damageA / maxHPA) * 0.6);
    }
    if (kiteB.rope && Number.isFinite(intersectionPoint?.segmentIndexB)) {
      kiteB.rope.applySegmentWear(intersectionPoint.segmentIndexB, (damageB / maxHPB) * 0.6);
    }

    // Aplica o dano no HP da linha
    let aDied = kiteA.takeDamage(damageA);
    let bDied = kiteB.takeDamage(damageB);

    // Sincroniza HP com o ponto mais fraco da corda física
    if (kiteA.rope) {
      const weakest = kiteA.rope.getWeakestSegmentIntegrity();
      if (weakest <= 0.05) {
        kiteA.lineHP = 0;
        aDied = true;
      } else if (kiteA.lineHP > 1) {
        kiteA.lineHP = Math.min(kiteA.lineHP, weakest * maxHPA);
      }
    }
    if (kiteB.rope) {
      const weakest = kiteB.rope.getWeakestSegmentIntegrity();
      if (weakest <= 0.05) {
        kiteB.lineHP = 0;
        bDied = true;
      } else if (kiteB.lineHP > 1) {
        kiteB.lineHP = Math.min(kiteB.lineHP, weakest * maxHPB);
      }
    }

    const finalize = typeof finalizeCutFn === 'function' ? finalizeCutFn : (winner, loser, pt) => ({
      tied: false,
      winner,
      loser,
      cutX: pt.x,
      cutY: pt.y
    });

    // Checagem de término do combate
    if (aDied && bDied) {
      const excessA = -kiteA.lineHP / maxHPA;
      const excessB = -kiteB.lineHP / maxHPB;

      if (Math.abs(excessA - excessB) < 1e-9) {
        const tipRatio = (kite) => {
          if (![kite.x, kite.y, kite.baseX, kite.baseY].every(Number.isFinite)) return NaN;
          const total = Math.hypot(kite.x - kite.baseX, kite.y - kite.baseY);
          return total > 1e-6 ? Math.hypot(kite.x - intersectionPoint.x, kite.y - intersectionPoint.y) / total : NaN;
        };
        const ratioA = tipRatio(kiteA);
        const ratioB = tipRatio(kiteB);

        if (Number.isFinite(ratioA) && Number.isFinite(ratioB) && Math.abs(ratioA - ratioB) > 1e-5) {
          return ratioA < ratioB
            ? finalize(kiteA, kiteB, intersectionPoint)
            : finalize(kiteB, kiteA, intersectionPoint);
        }

        kiteA.lineHP = Math.max(1, kiteA.lineHP);
        kiteB.lineHP = Math.max(1, kiteB.lineHP);
        kiteA.updateHPBar?.();
        kiteB.updateHPBar?.();
        return { tied: true, sparksOnly: true, simultaneousBreak: true };
      }

      return excessA < excessB
        ? finalize(kiteA, kiteB, intersectionPoint)
        : finalize(kiteB, kiteA, intersectionPoint);
    }

    if (aDied) {
      return finalize(kiteB, kiteA, intersectionPoint);
    }
    if (bDied) {
      return finalize(kiteA, kiteB, intersectionPoint);
    }

    return {
      tied: true,
      sparksOnly: true,
      winner: null,
      loser: null,
      cutX: intersectionPoint.x,
      cutY: intersectionPoint.y,
      damageA,
      damageB
    };
  }
}
