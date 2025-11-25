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
    radius: 80,  // Increased from 40
    eventHorizonRadius: 140  // Increased from 70
  };

  // Particle array
  const particles = [];
  const maxParticles = 400;

  // Animation state
  let lastFrameTime = 0;
  const frameDelay = 1000 / 24; // 24 FPS for slower, more cinematic feel

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

    // Calculate orbital velocity (reduced for slower animation)
    const speed = Math.sqrt(blackHole.mass / distance) * 0.5;  // Reduced from 0.8
    const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.3;  // Reduced randomness
    const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.3;

    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: 1,
      maxLife: 1,
      size: 0.5 + Math.random() * 1,
      angle: angle,
      distance: distance
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

    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update black hole position (in case of resize)
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;

    // Draw black hole event horizon glow
    const gradient = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw black hole core
    ctx.fillStyle = '#000000';
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

      // Apply gravitational force from black hole (reduced for slower animation)
      if (dist > 0.1) {
        const force = blackHole.mass / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        p.vx += fx * 0.005;  // Reduced from 0.008
        p.vy += fy * 0.005;
      }

      // Apply drag (increased for slower movement)
      p.vx *= 0.992;  // Reduced from 0.995
      p.vy *= 0.992;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Check if particle is in event horizon
      if (dist < blackHole.eventHorizonRadius) {
        p.life -= 0.03;  // Reduced from 0.05 for slower fade

        // Create accretion disk effect (reduced force for slower swirl)
        if (dist > blackHole.radius && Math.random() > 0.7) {
          const angle = Math.atan2(dy, dx);
          const perpAngle = angle + Math.PI / 2;
          p.vx += Math.cos(perpAngle) * 0.3;  // Reduced from 0.5
          p.vy += Math.sin(perpAngle) * 0.3;
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
