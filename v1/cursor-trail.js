/**
 * =============================================================================
 * CURSOR TRAIL - SPACECRAFT JET STREAM EFFECT
 * =============================================================================
 * 
 * Creates a subtle blue glow trail behind the cursor that simulates a
 * spacecraft's jet stream. Trail particles are drawn into the black hole.
 * 
 * Performance optimizations:
 * - Limited particle count (max 15)
 * - Throttled particle generation (every 30ms)
 * - Uses requestAnimationFrame for smooth animation
 * - Particles fade and shrink as they age
 * - Alpha blending for glow effect without expensive filters
 * 
 * =============================================================================
 */

(function() {
  'use strict';

  // Create a separate canvas layer for the cursor trail
  const bgCanvas = document.getElementById('bgCanvas');
  if (!bgCanvas) return;

  // Create trail canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'cursorTrailCanvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-1'; // Above background canvas, below content
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Resize canvas to match window
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Trail configuration
  const config = {
    maxParticles: 40,           // More points so it reads as a continuous jetstream
    particleLifetime: 1200,     // Longer persistence for a smoother trail
    particleSpawnDelay: 22,     // Denser sampling so it connects cleanly
    particleSize: 2.4,          // Base size of particles (used as stream width reference)
    glowSize: 10,               // Outer glow width reference
    trailColor: '120, 180, 255', // RGB for blue glow (matches accent color)
    suctionStrength: 0.6,       // How strongly particles are pulled to black hole (more subtle)
    velocityInherit: 0.08,      // Less "spray", more coherent jetstream
    suctionDelay: 250          // Milliseconds before particles start being sucked in
  };

  // State
  const state = {
    particles: [],
    mouse: {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      vx: 0,
      vy: 0
    },
    lastSpawnTime: 0,
    isMouseMoving: false,
    lastMouseMoveTime: 0,
    blackHole: null // Will be set from window position
  };

  // Get black hole position (centered on screen)
  function getBlackHolePosition() {
    return {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 80,
      eventHorizonRadius: 140
    };
  }

  // Create a new trail particle
  function createParticle(x, y, vx, vy) {
    return {
      x: x,
      y: y,
      vx: vx * config.velocityInherit + (Math.random() - 0.5) * 0.12,
      vy: vy * config.velocityInherit + (Math.random() - 0.5) * 0.12,
      birthTime: Date.now(),
      life: 1.0,
      size: config.particleSize * (0.75 + Math.random() * 0.5),
      alpha: 1
    };
  }

  // Update mouse position and velocity
  function handleMouseMove(e) {
    const newX = e.clientX;
    const newY = e.clientY;
    const currentTime = Date.now();

    state.mouse.lastX = state.mouse.x;
    state.mouse.lastY = state.mouse.y;
    state.mouse.x = newX;
    state.mouse.y = newY;

    // Calculate velocity for particle momentum
    state.mouse.vx = newX - state.mouse.lastX;
    state.mouse.vy = newY - state.mouse.lastY;

    // Check if cursor is actually moving (has significant velocity)
    const speed = Math.sqrt(state.mouse.vx * state.mouse.vx + state.mouse.vy * state.mouse.vy);
    state.isMouseMoving = speed > 0.5;
    state.lastMouseMoveTime = currentTime;
  }

  function handleMouseLeave() {
    state.isMouseMoving = false;
  }

  // Spawn a trail particle if enough time has passed
  function maybeSpawnParticle(currentTime) {
    // Don't spawn if cursor hasn't moved recently (static cursor)
    if (currentTime - state.lastMouseMoveTime > 100) {
      state.isMouseMoving = false;
      return;
    }
    
    if (!state.isMouseMoving) return;
    if (state.particles.length >= config.maxParticles) return;
    if (currentTime - state.lastSpawnTime < config.particleSpawnDelay) return;

    // Only spawn if mouse is actually moving with sufficient speed
    const speed = Math.sqrt(state.mouse.vx * state.mouse.vx + state.mouse.vy * state.mouse.vy);
    if (speed < 0.5) {
      state.isMouseMoving = false;
      return;
    }

    state.particles.push(createParticle(
      state.mouse.x,
      state.mouse.y,
      state.mouse.vx,
      state.mouse.vy
    ));
    state.lastSpawnTime = currentTime;
  }

  // Update and render trail particles
  function updateTrail() {
    const currentTime = Date.now();
    state.blackHole = getBlackHolePosition();

    // Clear canvas each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Try to spawn new particle
    maybeSpawnParticle(currentTime);

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      const age = currentTime - p.birthTime;
      
      // Update life based on age
      p.life = Math.max(0, 1 - (age / config.particleLifetime));

      // Remove dead particles
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      // Calculate distance to black hole
      const dx = state.blackHole.x - p.x;
      const dy = state.blackHole.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate particle age
      const particleAge = currentTime - p.birthTime;
      
      // Apply gravitational pull towards black hole only after delay
      if (dist > 1 && particleAge > config.suctionDelay) {
        // Subtle force calculation - only apply after delay
        // Inverse square law with minimal base force for subtle effect
        const baseForce = 0.1; // Very subtle minimum pull
        const distanceForce = state.blackHole.eventHorizonRadius / (dist * dist * 2); // Reduced intensity
        const force = baseForce + distanceForce;
        
        // Slow, subtle pull
        const fx = (dx / dist) * force * config.suctionStrength * 0.5;
        const fy = (dy / dist) * force * config.suctionStrength * 0.5;

        p.vx += fx;
        p.vy += fy;
      }

      // Apply drag to slow particles down naturally
      p.vx *= 0.935;
      p.vy *= 0.935;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Fade faster when close to black hole
      let alpha = p.life;
      if (dist < state.blackHole.eventHorizonRadius) {
        const proximityFade = dist / state.blackHole.eventHorizonRadius;
        alpha *= proximityFade;
      }

      // Remove if too close to black hole core
      if (dist < state.blackHole.radius) {
        state.particles.splice(i, 1);
        continue;
      }

      p.alpha = alpha;
    }

    // Render as a continuous jetstream instead of individual dots.
    if (state.particles.length < 2) return;

    const points = state.particles
      .slice()
      .sort((a, b) => a.birthTime - b.birthTime);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Glow pass
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const segAlpha = Math.min(a.alpha, b.alpha);
      if (segAlpha <= 0.01) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segDist = Math.sqrt(dx * dx + dy * dy);
      // Skip huge jumps (e.g. cursor teleporting or tab switching)
      if (segDist > 90) continue;

      const width = config.glowSize * (0.15 + 0.85 * segAlpha);
      ctx.strokeStyle = `rgba(${config.trailColor}, ${segAlpha * 0.14})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Core pass
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const segAlpha = Math.min(a.alpha, b.alpha);
      if (segAlpha <= 0.01) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segDist = Math.sqrt(dx * dx + dy * dy);
      if (segDist > 90) continue;

      const width = a.size * (0.25 + 0.95 * segAlpha);
      ctx.strokeStyle = `rgba(${config.trailColor}, ${segAlpha * 0.55})`;
      ctx.lineWidth = Math.max(0.75, width);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Subtle bright "nozzle" at the head
    const head = points[points.length - 1];
    if (head && head.alpha > 0.1) {
      ctx.fillStyle = `rgba(${config.trailColor}, ${Math.min(1, head.alpha) * 0.6})`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(1.2, head.size * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Initialize the trail system
  function init() {
    // Add mouse event listeners to document for full coverage
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Hook into the existing animation loop by creating our own
    // This runs on the same requestAnimationFrame as background.js
    function animate() {
      updateTrail();
      requestAnimationFrame(animate);
    }

    animate();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
