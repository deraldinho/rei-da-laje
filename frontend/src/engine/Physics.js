import { RelinhoContactSolver } from './physics/RelinhoContactSolver.js';

/**
 * Motor de Física Híbrida de Relinho (Interseção 2D de Segmentos e Cálculo de Forças)
 * Com sistema de Fricção Acumulada para resolver combates equilibrados
 */
export class Physics {

  /**
   * Calcula a interseção geométrica exata entre dois segmentos de reta 2D
   * Segmento 1: (x1, y1) -> (x2, y2)
   * Segmento 2: (x3, y3) -> (x4, y4)
   * Retorna { hit: boolean, x: number, y: number }
   */
  static checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return { hit: false, x: 0, y: 0 };

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // t e u precisam estar no intervalo [0, 1] para que a colisão ocorra dentro dos segmentos
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        hit: true,
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return { hit: false, x: 0, y: 0 };
  }

  /**
   * Distância Euclidiana entre 2 pontos
   */
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Resolve o combate de relinho entre duas pipas em tempo real
   * Delega ao solucionador físico tribológico RelinhoContactSolver
   * Retorna { winner, loser, tied, cutX, cutY, sparksOnly, damageA, damageB }
   */
  static resolveRelinhoCombat(kiteA, kiteB, intersectionPoint, delta = 1, contact = null) {
    return RelinhoContactSolver.resolveCombatStep(
      kiteA,
      kiteB,
      intersectionPoint,
      delta,
      contact,
      (winner, loser, pt) => Physics.finalizeCut(winner, loser, pt)
    );
  }

  /**
   * Processa o corte, checando se o perdedor tem escudo (Kevlar)
   */
  static finalizeCut(winner, loser, intersectionPoint) {
    // Garante que o vencedor nunca permaneça com HP negativo (ex: em ruptura simultânea onde ambos sofreram dano letal)
    if (winner) {
      winner.lineHP = Math.max(1, winner.lineHP);
      winner.updateHPBar?.();
    }

    // Se o perdedor tiver escudo ativo, consome e salva da morte!
    if (loser && loser.shieldCount > 0) {
      loser.shieldCount--;
      loser.lineHP = loser.maxLineHP;
      // Restaura a integridade mecânica de todos os segmentos da corda física
      if (loser.rope && loser.rope.segmentWear) {
        loser.rope.segmentWear.fill(0);
        if (Array.isArray(loser.rope.nodes)) {
          for (let i = 0; i < loser.rope.nodes.length; i++) {
            loser.rope.nodes[i].wear = 0;
          }
        }
      }
      loser.updateHPBar?.();
      loser.triggerShieldAbsorb();
      return {
        tied: true,
        absorbedByShield: true,
        shieldUserId: loser.userId,
        remainingShields: loser.shieldCount,
        winner: null,
        loser: null,
        cutX: intersectionPoint.x,
        cutY: intersectionPoint.y
      };
    }

    // O claim local NÃO rompe a RopePhysics. A geometria só vira ruptura real
    // quando o backend confirma o corte e emite game:cut_occurred para todos.
    // Aqui carregamos apenas os metadados determinísticos do ponto de contato.
    let breakInfo = null;
    if (loser && loser.rope) {
      const rawSegmentIndex = loser === intersectionPoint?.kiteA
        ? intersectionPoint?.segmentIndexA
        : intersectionPoint?.segmentIndexB;
      const segmentCount = Math.max(1, (Number(loser.rope.nodeCount) || loser.rope.nodes?.length || 2) - 1);
      const segIdx = Math.max(0, Math.min(segmentCount - 1,
        Number.isFinite(rawSegmentIndex) ? Math.floor(rawSegmentIndex) : 0));
      const rawContactT = loser === intersectionPoint?.kiteA ? intersectionPoint?.s : intersectionPoint?.t;
      const contactT = Math.max(0, Math.min(1, Number.isFinite(rawContactT) ? rawContactT : 0.5));
      breakInfo = {
        breakPoint: {
          x: Number.isFinite(intersectionPoint?.x) ? intersectionPoint.x : loser.x,
          y: Number.isFinite(intersectionPoint?.y) ? intersectionPoint.y : loser.y,
          z: Number.isFinite(intersectionPoint?.z) ? intersectionPoint.z : (Number.isFinite(loser.z) ? loser.z : 0)
        },
        segmentIndex: segIdx,
        segmentT: contactT,
        remainingRatio: (segmentCount - segIdx) / segmentCount
      };
    }

    return {
      tied: false,
      winner,
      loser,
      cutX: intersectionPoint.x,
      cutY: intersectionPoint.y,
      breakInfo
    };
  }
}

