/** Animação visual e orientação tridimensional (pitch, roll, yaw): nunca altera dano, HP ou a autoridade do relinho. */
export function maneuverPose(maneuver, seconds = 0) {
  if (!maneuver || !(maneuver.remaining > 0) || !(maneuver.duration > 0))
    return { angle: 0, scale: 1, glow: 0, trail: 0, tail: 0, label: null, color: 0xffffff, pitch3D: 0, roll3D: 0, yaw3D: 0 };
  const elapsed = Math.max(0, maneuver.duration - maneuver.remaining);
  const envelope = Math.min(1, elapsed / 0.18, (maneuver.remaining) / 0.28);
  const pulse = Math.sin(seconds * 19);
  const pose = {
    angle: 0, scale: 1, glow: 0.65 * envelope, trail: 0, tail: 0, label: maneuver.name,
    color: 0xffe07a, pitch3D: 0, roll3D: 0, yaw3D: 0, spin3D: false
  };

  switch(maneuver.name){
    case 'retao':
      pose.angle = 0.29 * envelope;
      pose.scale = 1 + 0.12 * envelope;
      pose.trail = 0.95 * envelope;
      pose.tail = 0.9 * envelope;
      pose.color = 0xffe07a;
      pose.pitch3D = -0.38 * envelope;
      pose.roll3D = 0.12 * envelope;
      break;

    case 'mergulho':
      // Bico apontado para o chão cortando em alta velocidade
      pose.angle = 1.57 * envelope; // 90° para baixo
      pose.scale = 1 + 0.15 * envelope;
      pose.glow = 0.85 * envelope;
      pose.trail = 1.1 * envelope;
      pose.tail = 1.2 * envelope;
      pose.color = 0x00f0ff;
      pose.pitch3D = -0.75 * envelope; // bico apontado para baixo em 3D
      pose.roll3D = 0.08 * envelope;
      break;

    case 'relo_lateral':
      // Ataque de quina / flanco lateral com escudo dourado
      pose.angle = 0.52 * envelope;
      pose.scale = 1 + 0.12 * envelope;
      pose.glow = 0.95 * envelope;
      pose.trail = 0.7 * envelope;
      pose.tail = 0.5 * envelope;
      pose.color = 0xffcc00;
      pose.pitch3D = 0.15 * envelope;
      pose.roll3D = 0.48 * envelope; // inclinação de asa lateral em 3D
      break;

    case 'mestre_do_ceu':
      // Poder supremo celestial
      pose.angle = (0.2 * Math.sin(seconds * 12)) * envelope;
      pose.scale = 1 + 0.22 * envelope;
      pose.glow = 1.0 * envelope;
      pose.trail = 1.25 * envelope;
      pose.tail = 1.3 * envelope;
      pose.color = 0xffffff;
      pose.pitch3D = -0.35 * envelope;
      pose.roll3D = (0.25 * Math.sin(seconds * 10)) * envelope;
      break;

    case 'despicar': {
      const cycle = (elapsed % 0.62) / 0.62;
      const bite = cycle < .18 ? cycle / .18 : Math.max(0, 1 - (cycle - .18) / .82);
      pose.angle = (cycle < .18 ? 0.82 * bite : cycle < .68 ? 0.34 + 0.12 * Math.sin(seconds * 24) : -0.16 * (1 - cycle) / .32) * envelope;
      pose.scale = 1 + (cycle < .18 ? .06 : .025) * envelope;
      pose.trail = (cycle < .68 ? .92 : .38) * envelope;
      pose.tail = (cycle < .68 ? 1.05 : .42) * envelope;
      pose.color = 0xff6688;
      pose.pitch3D = (cycle < .18 ? -0.45 : cycle < .68 ? 0.18 : -0.15) * envelope;
      pose.roll3D = (cycle < .18 ? 0.65 : Math.sin(seconds * 18) * 0.45) * envelope;
      pose.yaw3D = (cycle < .18 ? 0.35 : -0.2) * envelope;
      break;
    }

    case 'perseguir':
      pose.angle = (0.16 * Math.sin(seconds * 7)) * envelope;
      pose.scale = 1 + 0.05 * envelope;
      pose.trail = 0.55 * envelope;
      pose.tail = 0.48 * envelope;
      pose.color = 0x78e8ff;
      pose.pitch3D = -0.22 * envelope;
      pose.roll3D = (Math.sin(seconds * 7) * 0.15) * envelope;
      break;

    case 'aparar_retao':
      pose.angle = 0.22 * pulse * envelope;
      pose.scale = 1 + 0.12 * envelope;
      pose.glow = 0.9 * envelope;
      pose.tail = 0.27 * envelope;
      pose.color = 0x9cffee;
      pose.pitch3D = 0.25 * envelope;
      pose.roll3D = (0.18 * pulse) * envelope;
      break;

    case 'aparar_despicada':
      pose.angle = (-0.42 + 0.13 * pulse) * envelope;
      pose.scale = 1 + 0.13 * envelope;
      pose.glow = 0.98 * envelope;
      pose.trail = 0.32 * envelope;
      pose.tail = 0.4 * envelope;
      pose.color = 0xc9a3ff;
      pose.pitch3D = 0.3 * envelope;
      pose.roll3D = (-0.48 + 0.15 * pulse) * envelope;
      break;

    case 'tenteio':
      pose.angle = (Math.sin(seconds * 34) * 0.14) * envelope;
      pose.scale = 1 + 0.08 * envelope;
      pose.glow = 0.85 * envelope;
      pose.trail = 0.68 * envelope;
      pose.tail = 0.82 * envelope;
      pose.color = 0xffa42b;
      pose.pitch3D = (-0.22 + Math.sin(seconds * 32) * 0.16) * envelope;
      pose.roll3D = (Math.cos(seconds * 28) * 0.22) * envelope;
      break;

    case 'largada':
      pose.angle = -0.16 * envelope;
      pose.scale = 1 + 0.04 * envelope;
      pose.glow = 0.55 * envelope;
      pose.trail = 0.25 * envelope;
      pose.tail = 0.32 * envelope;
      pose.color = 0x55f0ff;
      pose.pitch3D = 0.32 * envelope;
      pose.roll3D = (Math.sin(seconds * 6) * 0.12) * envelope;
      break;

    case 'mergulho_parafuso':
      pose.angle = (elapsed * 12) % (Math.PI * 2);
      pose.scale = 1 + 0.14 * envelope;
      pose.glow = 0.95 * envelope;
      pose.trail = 1.05 * envelope;
      pose.tail = 1.15 * envelope;
      pose.color = 0xff4122;
      pose.pitch3D = -0.52 * envelope;
      pose.roll3D = ((elapsed * 16) % (Math.PI * 2)) * envelope;
      pose.spin3D = true;
      break;

    case 'lacada':
      pose.angle = (Math.sin(seconds * 8.5) * 0.32) * envelope;
      pose.scale = 1 + 0.11 * envelope;
      pose.glow = 0.88 * envelope;
      pose.trail = 0.8 * envelope;
      pose.tail = 0.92 * envelope;
      pose.color = 0xb448ff;
      pose.pitch3D = -0.18 * envelope;
      pose.roll3D = (Math.sin(seconds * 8) * 0.34) * envelope;
      break;

    default:
      return { angle: 0, scale: 1, glow: 0, trail: 0, tail: 0, label: null, color: 0xffffff, pitch3D: 0, roll3D: 0, yaw3D: 0 };
  }
  return pose;
}
