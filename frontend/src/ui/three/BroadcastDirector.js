import * as THREE from 'three';

/**
 * BroadcastDirector - Câmera Automática Inteligente para Transmissão Live (P13)
 * 
 * Direção de TV ao vivo no Three.js para o TikTok Live:
 * - Detecta automaticamente situações de combate acirrado (relinho), momentos de corte,
 *   aparadas de pipas voadas e manobras épicas.
 * - Realiza zoom in dramático e enquadramento suave nos embates.
 * - Abre para visão panorâmica e estável da arena na ausência de disputas.
 * - Amortecimento cinematográfico contínuo para visualização 9:16 vertical (sem enjoo).
 */
export class BroadcastDirector {
  constructor(camera, basePosition = new THREE.Vector3(0, 0, 720)) {
    this.camera = camera;
    this.basePos = basePosition.clone();
    this.targetPos = basePosition.clone();
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
    this.eventFocusPos = new THREE.Vector3(0, 0, 0);
    this.eventTimer = 0;
    this.shakeIntensity = 0;
    this.currentMode = 'overview'; // 'overview', 'combat', 'cut', 'aparo', 'maneuver'
    this.enabled = true;
  }

  /**
   * Foca dramaticamente em um corte recente
   * @param {number} x Coordenada X mundial 3D
   * @param {number} y Coordenada Y mundial 3D
   * @param {number} z Coordenada Z mundial 3D
   */
  triggerCutFocus(x, y, z) {
    if (!this.enabled) return;
    this.eventFocusPos.set(
      Math.max(-200, Math.min(200, Number(x) || 0)),
      Math.max(-80, Math.min(220, Number(y) || 0)),
      Number(z) || 120
    );
    this.eventTimer = 2.0; // 2 segundos de enquadramento suave no corte
    this.shakeIntensity = 0; // Câmera estável sem trepidação que cause sensação de travamento
    this.currentMode = 'cut';
  }

  /**
   * Foca em uma pipa voada aparada
   * @param {number} x Coordenada X mundial 3D
   * @param {number} y Coordenada Y mundial 3D
   * @param {number} z Coordenada Z mundial 3D
   */
  triggerAparoFocus(x, y, z) {
    if (!this.enabled) return;
    this.eventFocusPos.set(
      Math.max(-200, Math.min(200, Number(x) || 0)),
      Math.max(-80, Math.min(220, Number(y) || 0)),
      Number(z) || 120
    );
    this.eventTimer = 1.8;
    this.shakeIntensity = 0;
    this.currentMode = 'aparo';
  }

  /**
   * Atualização contínua a cada quadro de renderização
   * @param {number} dt Delta time em segundos
   * @param {Map} kitesMap Mapa de instâncias Kite 2D
   * @param {Map} kites3D Mapa de modelos 3D das pipas
   */
  update(dt = 0.016, kitesMap = null, kites3D = null) {
    if (!this.camera || !this.enabled) return;

    const safeDt = Math.max(0.001, Math.min(0.05, Number(dt) || 0.016));

    // 1. Processamento de Eventos Prioritários (Corte / Aparo)
    if (this.eventTimer > 0) {
      this.eventTimer -= safeDt;
      this.targetLookAt.set(
        this.eventFocusPos.x * 0.5,
        this.eventFocusPos.y * 0.5,
        0
      );
      this.targetPos.set(
        this.eventFocusPos.x * 0.25,
        this.eventFocusPos.y * 0.25,
        Math.max(640, this.basePos.z - 60) // Zoom sutil e elegante
      );

      if (this.eventTimer <= 0) {
        this.currentMode = 'overview';
      }
    } else {
      // 2. Busca de Combatentes com Linhas Cruzadas (Relinho Ativo)
      let combatCount = 0;
      let combatSumX = 0;
      let combatSumY = 0;
      let combatSumZ = 0;

      let maneuverKite3D = null;
      let leaderKite3D = null;

      if (kitesMap && kites3D) {
        for (const [userId, kite] of kitesMap.entries()) {
          const k3d = kites3D.get(String(userId));
          if (!k3d) continue;

          if (kite.isInCombat) {
            combatCount++;
            combatSumX += k3d.position.x;
            combatSumY += k3d.position.y;
            combatSumZ += k3d.position.z;
          }

          if (kite.maneuver && kite.maneuver.remaining > 0 && !maneuverKite3D) {
            maneuverKite3D = k3d;
          }

          if ((kite.isKing || kite.isLeader) && !leaderKite3D) {
            leaderKite3D = k3d;
          }
        }
      }

      if (combatCount >= 2) {
        // Enquadramento de Relinho: foca suavemente na disputa sem trancos
        const avgX = combatSumX / combatCount;
        const avgY = combatSumY / combatCount;

        this.targetLookAt.set(
          Math.max(-180, Math.min(180, avgX * 0.7)),
          Math.max(-60, Math.min(220, avgY * 0.7)),
          0
        );
        this.targetPos.set(
          avgX * 0.2,
          avgY * 0.2,
          Math.max(660, this.basePos.z - 45)
        );
        this.currentMode = 'combat';
      } else if (maneuverKite3D) {
        // Enquadramento suave de Manobra Ativa
        this.targetLookAt.set(
          maneuverKite3D.position.x * 0.45,
          maneuverKite3D.position.y * 0.45,
          0
        );
        this.targetPos.set(
          maneuverKite3D.position.x * 0.15,
          maneuverKite3D.position.y * 0.15,
          Math.max(680, this.basePos.z - 30)
        );
        this.currentMode = 'maneuver';
      } else {
        // Visão Ampla Panorâmica da Arena
        this.targetLookAt.set(0, 0, 0);
        this.targetPos.copy(this.basePos);
        this.currentMode = 'overview';
      }
    }

    // 3. Interpolação Cinematográfica Suave (Amortecimento contínuo sem solavancos)
    const lerpSpeed = this.currentMode === 'cut' ? 1.6 : 1.1;

    this.camera.position.lerp(this.targetPos, Math.min(1.0, safeDt * lerpSpeed));
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1.0, safeDt * (lerpSpeed * 1.15)));

    this.camera.lookAt(this.currentLookAt);
  }

  resize(width, height) {
    if (!this.camera) return;
    const aspect = width / height;
    this.camera.aspect = aspect;
    // Em telas verticais 9:16 de smartphone, afasta proporcionalmente para manter visão completa
    if (aspect < 1.0) {
      this.basePos.z = 720 / Math.max(0.55, aspect * 1.35);
    } else {
      this.basePos.z = 720;
    }
    this.camera.updateProjectionMatrix();
  }
}
