/**
 * =============================================================================
 * BLACK HOLE SIMULATION BACKGROUND
 * =============================================================================
 * 
 * An interactive black hole simulation with particle physics.
 * Particles orbit and are drawn into the black hole's gravity well.
 * Mouse interaction creates repulsion effects on nearby particles.
 * 
 * =============================================================================
 */

(function() {
  'use strict';

  // ============================================================================
  // SETUP
  // ============================================================================

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Mouse state
  const mouse = {
    x: 0,
    y: 0,
    isHovering: false
  };

  // Black hole configuration
  const blackHole = {
    x: 0,
    y: 0,
    mass: 3000,
    radius: 80,
    eventHorizonRadius: 140,
    accretionDiskRadius: 280,
    glowRadius: 180
  };

  // Particle array
  const particles = [];
  const maxParticles = 400;

  // Animation state
  let lastFrameTime = 0;
  const frameDelay = 1000 / 30; // 30 FPS for slower, more contemplative motion

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update black hole position to center
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;
  }

  function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() < 0.6
      ? 100 + Math.random() * 250
      : 400 + Math.random() * 600;

    const x = blackHole.x + Math.cos(angle) * distance;
    const y = blackHole.y + Math.sin(angle) * distance;

    // Calculate precise orbital velocity for stable circular motion
    // Using vis-viva equation for orbital mechanics
    const speed = Math.sqrt(blackHole.mass / distance) * 0.55;
    const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.1;  // Reduced randomness
    const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.1;

    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: 1,
      maxLife: 1,
      size: 0.5 + Math.random() * 1,
      angle: angle,
      distance: distance,
      orbitalDirection: Math.random() > 0.5 ? 1 : -1  // Some orbit clockwise, some counter
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }
  }

  // ============================================================================
  // MOUSE INTERACTION
  // ============================================================================

  function handleMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.isHovering = true;
  }

  function handleMouseLeave() {
    mouse.isHovering = false;
  }

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  function animate(currentTime) {
    // Frame rate limiting for reduced CPU usage
    if (currentTime - lastFrameTime < frameDelay) {
      requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = currentTime;

    // Clear canvas with fade effect for motion trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update black hole position (in case of resize)
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;

    // Draw accretion disk outer glow
    const accretionGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius,
      blackHole.x,
      blackHole.y,
      blackHole.accretionDiskRadius
    );
    accretionGlow.addColorStop(0, 'rgba(100, 150, 255, 0.03)');
    accretionGlow.addColorStop(0.5, 'rgba(80, 120, 200, 0.015)');
    accretionGlow.addColorStop(1, 'rgba(60, 100, 180, 0)');

    ctx.fillStyle = accretionGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.accretionDiskRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw event horizon bright glow
    const eventHorizonGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      blackHole.radius,
      blackHole.x,
      blackHole.y,
      blackHole.glowRadius
    );
    eventHorizonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    eventHorizonGlow.addColorStop(0.3, 'rgba(200, 220, 255, 0.04)');
    eventHorizonGlow.addColorStop(0.6, 'rgba(150, 180, 255, 0.02)');
    eventHorizonGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');

    ctx.fillStyle = eventHorizonGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw event horizon inner glow
    const innerGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius
    );
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    innerGlow.addColorStop(0.4, 'rgba(220, 230, 255, 0.05)');
    innerGlow.addColorStop(0.7, 'rgba(180, 200, 255, 0.02)');
    innerGlow.addColorStop(1, 'rgba(150, 180, 255, 0)');

    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw photon sphere ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.eventHorizonRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Draw black hole core with subtle gradient
    const coreGradient = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.radius
    );
    coreGradient.addColorStop(0, '#000000');
    coreGradient.addColorStop(0.7, '#000000');
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
    ctx.fill();

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Calculate distance to black hole
      const dx = blackHole.x - p.x;
      const dy = blackHole.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate edge fade based on distance from viewport center
      const maxViewportDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2;
      const viewportCenterDist = Math.sqrt(
        Math.pow(p.x - canvas.width / 2, 2) + 
        Math.pow(p.y - canvas.height / 2, 2)
      );
      const edgeFade = Math.max(0.15, 1 - (viewportCenterDist / maxViewportDist) * 1.5);

      // Mouse interaction - repulsion force
      if (mouse.isHovering) {
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mouseDist < 120) {
          const repulsionStrength = (120 - mouseDist) / 120;
          const repulsionForce = repulsionStrength * 0.8;
          p.vx += (mdx / mouseDist) * repulsionForce;
          p.vy += (mdy / mouseDist) * repulsionForce;
        }
      }

      // Apply gravitational force from black hole
      if (dist > 0.1) {
        const force = blackHole.mass / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        p.vx += fx * 0.005;
        p.vy += fy * 0.005;

        // Add orbital stabilization to maintain circular motion
        // Calculate current velocity magnitude and ideal orbital velocity
        const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const idealSpeed = Math.sqrt(blackHole.mass / dist) * 0.55;

        // Calculate tangential direction (perpendicular to radial)
        const tangentX = -dy / dist;
        const tangentY = dx / dist;

        // Calculate how much velocity is in the tangential direction
        const tangentialVelocity = p.vx * tangentX + p.vy * tangentY;

        // Apply gentle correction to maintain orbital velocity
        if (currentSpeed > 0.1 && dist > blackHole.eventHorizonRadius) {
          const correction = (idealSpeed - Math.abs(tangentialVelocity)) * 0.02;
          const direction = tangentialVelocity >= 0 ? 1 : -1;
          p.vx += tangentX * correction * direction;
          p.vy += tangentY * correction * direction;
        }
      }

      // Apply minimal drag to simulate space friction
      p.vx *= 0.998;
      p.vy *= 0.998;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Check if particle is in event horizon
      if (dist < blackHole.eventHorizonRadius) {
        p.life -= 0.03;

        // Create accretion disk swirl effect - enhances orbital motion
        if (dist > blackHole.radius) {
          const angle = Math.atan2(dy, dx);
          const perpAngle = angle + Math.PI / 2;
          // Stronger swirl closer to the event horizon
          const swirl_strength = (1 - dist / blackHole.eventHorizonRadius) * 0.2;
          p.vx += Math.cos(perpAngle) * swirl_strength;
          p.vy += Math.sin(perpAngle) * swirl_strength;
        }
      }

      // Remove dead particles or particles that hit the core
      if (p.life <= 0 || dist < blackHole.radius) {
        particles.splice(i, 1);
        particles.push(createParticle());
        continue;
      }

      // Remove particles that go off screen
      if (p.x < -100 || p.x > canvas.width + 100 || 
          p.y < -100 || p.y > canvas.height + 100) {
        particles.splice(i, 1);
        particles.push(createParticle());
        continue;
      }

      // Calculate particle brightness and alpha
      const brightness = Math.min(1, dist / 200);
      const alpha = p.life * brightness * edgeFade;

      // Draw particle
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Add glow for particles near event horizon
      if (dist < blackHole.eventHorizonRadius * 1.2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(animate);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    resize();
    initParticles();
    
    // Event listeners
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    // Start animation
    requestAnimationFrame(animate);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
