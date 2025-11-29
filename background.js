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

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  // Safari-specific rendering optimizations
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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
    radius: 90,                    // Schwarzschild radius (visual)
    eventHorizonRadius: 115,        // Event horizon
    accretionDiskRadius: 230,
    glowRadius: 150,
    iscoRadius: 200,               // ISCO at 3× Schwarzschild radius
    photonSphereRadius: 100,        // Photon sphere at 1.5× Schwarzschild radius
  };

  // Particle array
  const particles = [];
  const maxParticles = 400;

  // Text animation state
  let messages = [];
  let displayedText = '';
  let currentMessage = '';
  let charIndex = 0;
  let delayTimeout = null;
  let typingInterval = null;
  let cycleTimeout = null;
  let currentMessageIndex = 0;

  // Celestial bodies - Solar System planets
  // Sizes scaled relative to Earth (size 5 = Earth), colors based on actual appearance
  const celestialBodies = [
    { distance: 320, speed: 0.0015, angle: 0, size: 2, color: 'rgba(169, 169, 169, 0.4)' },      // Mercury - small, gray
    { distance: 380, speed: 0.0012, angle: 1.2, size: 4.8, color: 'rgba(230, 200, 150, 0.38)' }, // Venus - yellowish white
    { distance: 440, speed: 0.001, angle: 2.5, size: 5, color: 'rgba(100, 149, 237, 0.4)' },     // Earth - blue
    { distance: 500, speed: 0.0008, angle: 4, size: 2.7, color: 'rgba(220, 100, 80, 0.38)' },    // Mars - red
    { distance: 580, speed: 0.0006, angle: 5.5, size: 11, color: 'rgba(210, 180, 140, 0.36)' },  // Jupiter - tan/brown with bands
    { distance: 660, speed: 0.0005, angle: 0.8, size: 9.2, color: 'rgba(230, 210, 170, 0.35)' }, // Saturn - pale gold
    { distance: 730, speed: 0.0004, angle: 3.2, size: 6.3, color: 'rgba(175, 238, 238, 0.33)' }, // Uranus - pale cyan
    { distance: 800, speed: 0.0003, angle: 1.5, size: 6.1, color: 'rgba(100, 120, 200, 0.36)' }  // Neptune - deep blue
  ];

  // Animation state
  let lastFrameTime = 0;
  const frameDelay = 1000 / 24; // 24 FPS for slower, more contemplative motion

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
    const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.02;  // Minimal randomness for immediate stable orbits
    const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.02;

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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update black hole position (in case of resize)
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;

    // Draw accretion disk outer glow - simplified gradient for Safari
    const accretionGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius,
      blackHole.x,
      blackHole.y,
      blackHole.accretionDiskRadius
    );
    accretionGlow.addColorStop(0, 'rgba(100, 150, 255, 0.03)');
    accretionGlow.addColorStop(0.5, 'rgba(75, 115, 210, 0.015)');
    accretionGlow.addColorStop(1, 'rgba(60, 100, 180, 0)');

    ctx.fillStyle = accretionGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.accretionDiskRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw event horizon bright glow - simplified for Safari
    const eventHorizonGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      blackHole.radius,
      blackHole.x,
      blackHole.y,
      blackHole.glowRadius
    );
    eventHorizonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    eventHorizonGlow.addColorStop(0.5, 'rgba(180, 200, 255, 0.03)');
    eventHorizonGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');

    ctx.fillStyle = eventHorizonGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw event horizon inner glow - simplified for Safari
    const innerGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius
    );
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    innerGlow.addColorStop(0.5, 'rgba(210, 225, 255, 0.04)');
    innerGlow.addColorStop(1, 'rgba(150, 180, 255, 0)');

    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw photon sphere ring (subtle visualization at 1.5× Schwarzschild radius)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.photonSphereRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw accretion disk structure (gradient from ISCO outward) - simplified for Safari
    const diskGradient = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      blackHole.eventHorizonRadius,
      blackHole.x,
      blackHole.y,
      blackHole.iscoRadius * 1.5
    );
    diskGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    diskGradient.addColorStop(0.5, 'rgba(210, 225, 255, 0.025)');
    diskGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

    ctx.fillStyle = diskGradient;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.iscoRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

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

    // Draw text over black hole core (if text is set)
    if (displayedText) {
      ctx.save();
      
      // Minimalist styling with Doto font (slightly thicker weight)
      ctx.font = '600 11px "Doto", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Simple shadow for subtle depth
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 4;
      
      // Wrap text to fit within black hole radius
      const maxWidth = blackHole.radius * 1.6; // 80% of diameter for padding
      const lineHeight = 14; // Spacing between lines
      const words = displayedText.split(' ');
      const lines = [];
      let currentLine = '';
      
      // Build lines that fit within maxWidth
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Calculate starting Y position to center all lines vertically
      const totalHeight = lines.length * lineHeight;
      let startY = blackHole.y - (totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line centered
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], blackHole.x, startY + (i * lineHeight));
      }
      
      ctx.restore();
    }

    // Update and draw celestial bodies (moons/planets)
    for (const body of celestialBodies) {
      // Update orbital angle
      body.angle += body.speed;

      // Calculate position
      const x = blackHole.x + Math.cos(body.angle) * body.distance;
      const y = blackHole.y + Math.sin(body.angle) * body.distance;

      // Calculate fade based on distance from viewport edges
      const maxViewportDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2;
      const viewportCenterDist = Math.sqrt(
        Math.pow(x - canvas.width / 2, 2) +
        Math.pow(y - canvas.height / 2, 2)
      );
      const edgeFade = Math.max(0.2, 1 - (viewportCenterDist / maxViewportDist) * 1.2);

      // Draw orbital path (very subtle)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 * edgeFade})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(blackHole.x, blackHole.y, body.distance, 0, Math.PI * 2);
      ctx.stroke();

      // Draw the celestial body with a subtle glow
      const bodyColor = body.color.replace(/[\d.]+\)$/, (match) => {
        const alpha = parseFloat(match);
        return `${alpha * edgeFade})`;
      });

      // Outer glow
      ctx.fillStyle = bodyColor.replace(/[\d.]+\)$/, (match) => {
        const alpha = parseFloat(match);
        return `${alpha * 0.3})`;
      });
      ctx.beginPath();
      ctx.arc(x, y, body.size * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Main body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(x, y, body.size, 0, Math.PI * 2);
      ctx.fill();
    }

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

      // Mouse interaction - repulsion force (reduced to prevent escape velocity)
      if (mouse.isHovering) {
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mouseDist < 120) {
          const repulsionStrength = (120 - mouseDist) / 120;
          const repulsionForce = repulsionStrength * 0.4; // Reduced from 0.8 to prevent escape
          p.vx += (mdx / mouseDist) * repulsionForce;
          p.vy += (mdy / mouseDist) * repulsionForce;
        }
      }

      // Cap velocity to prevent escape velocity
      const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = Math.sqrt(blackHole.mass / Math.max(dist, blackHole.radius)) * 0.65; // Slightly above orbital speed
      if (currentSpeed > maxSpeed) {
        const speedRatio = maxSpeed / currentSpeed;
        p.vx *= speedRatio;
        p.vy *= speedRatio;
      }

      // Apply gravitational force from black hole
      if (dist > 0.1) {
        const force = blackHole.mass / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // For particles outside ISCO, apply velocity correction to maintain circular orbits
        if (dist > blackHole.iscoRadius) {
          const angleToBH = Math.atan2(dy, dx);
          const orbitalAngle = angleToBH + Math.PI / 2;
          const idealSpeed = Math.sqrt(blackHole.mass / dist) * 0.55;
          const idealVx = Math.cos(orbitalAngle) * idealSpeed;
          const idealVy = Math.sin(orbitalAngle) * idealSpeed;
          
          // Blend current velocity toward ideal orbital velocity (increased for stability)
          const blendFactor = 0.08;
          p.vx = p.vx * (1 - blendFactor) + idealVx * blendFactor;
          p.vy = p.vy * (1 - blendFactor) + idealVy * blendFactor;
        }

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

        // Apply gentle correction to maintain orbital velocity (increased for stability)
        if (currentSpeed > 0.1 && dist > blackHole.eventHorizonRadius) {
          const correction = (idealSpeed - Math.abs(tangentialVelocity)) * 0.08;
          const direction = tangentialVelocity >= 0 ? 1 : -1;
          p.vx += tangentX * correction * direction;
          p.vy += tangentY * correction * direction;
        }
      }

      // Reduced drag for particles in stable orbits outside ISCO
      if (dist > blackHole.iscoRadius) {
        p.vx *= 0.9985;
        p.vy *= 0.9985;
      } else {
        // More drag as particles spiral in inside ISCO
        p.vx *= 0.997;
        p.vy *= 0.997;
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Spiral trajectory for particles inside ISCO
      if (dist < blackHole.iscoRadius && dist > blackHole.radius) {
        const angleToBH = Math.atan2(dy, dx);
        const perpAngle = angleToBH + Math.PI / 2;
        // Spiral strength increases as particle gets closer to event horizon
        const spiralStrength = (blackHole.iscoRadius - dist) / (blackHole.iscoRadius - blackHole.radius);
        p.vx += Math.cos(perpAngle) * spiralStrength * 0.3;
        p.vy += Math.sin(perpAngle) * spiralStrength * 0.3;
      }

      // Check if particle is in event horizon
      if (dist < blackHole.eventHorizonRadius) {
        // Fade faster the closer to the black hole
        const proximityFactor = 1 - (dist / blackHole.eventHorizonRadius);
        p.life -= 0.06 + (proximityFactor * 0.12); // Faster fade near the core
      }

      // Remove dead particles or particles that hit the core
      if (p.life <= 0 || dist < blackHole.radius) {
        particles.splice(i, 1);
        particles.push(createParticle());
        continue;
      }

      // Keep particles in stable orbits - apply stronger correction if too far from black hole
      // This prevents particles from escaping due to instabilities
      if (dist > blackHole.accretionDiskRadius * 2) {
        // Pull particle back towards stable orbit radius
        const targetDist = blackHole.accretionDiskRadius * 1.5;
        const pullStrength = (dist - targetDist) / dist;
        p.vx -= (dx / dist) * pullStrength * 0.5;
        p.vy -= (dy / dist) * pullStrength * 0.5;
      }

      // Calculate Doppler beaming effect
      // Radial velocity = component of velocity toward/away from viewer
      const angleToBH = Math.atan2(dy, dx);
      const velocityAngle = Math.atan2(p.vy, p.vx);
      const totalSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const radialVelocity = Math.cos(velocityAngle - angleToBH) * totalSpeed;
      
      // Doppler factor: approaching (negative radial velocity) = brighter
      // Receding (positive radial velocity) = dimmer
      const dopplerFactor = 1 - (radialVelocity / 50);
      const dopplerBrightness = Math.max(0.3, Math.min(1.5, dopplerFactor));

      // Distance-based brightness
      const distanceBrightness = Math.min(1, dist / 200);
      
      // Accretion disk brightness boost for particles near ISCO
      const diskBrightness = dist < blackHole.iscoRadius * 1.3
        ? 1 + (0.4 * (1 - dist / (blackHole.iscoRadius * 1.3)))
        : 1;
      
      // Combined brightness
      const baseBrightness = distanceBrightness * dopplerBrightness * diskBrightness;
      const alpha = Math.min(1, p.life * baseBrightness * edgeFade);

      // Doppler color shift: approaching = bluer/whiter, receding = slightly warmer
      const colorShift = Math.max(0, Math.min(1, dopplerFactor));
      const red = 255;
      const green = Math.floor(220 + colorShift * 35);
      const blue = Math.floor(180 + colorShift * 75);

      // Gravitational lensing effect
      let drawX = p.x;
      let drawY = p.y;
      let lensingAlpha = alpha;

      // Apply lensing for particles in the lensing region (between event horizon and 2× event horizon)
      if (dist > blackHole.eventHorizonRadius && dist < blackHole.eventHorizonRadius * 2.5) {
        // Check if particle is moving toward/behind the black hole
        const futureX = p.x + p.vx * 8;
        const futureY = p.y + p.vy * 8;
        const futureDist = Math.sqrt(
          Math.pow(blackHole.x - futureX, 2) + Math.pow(blackHole.y - futureY, 2)
        );

        // If trajectory takes particle closer to black hole, apply lensing
        if (futureDist < dist && futureDist < blackHole.eventHorizonRadius * 2) {
          const angleFromCenter = Math.atan2(p.y - blackHole.y, p.x - blackHole.x);
          const lensingStrength = (blackHole.eventHorizonRadius * 2 - futureDist) / blackHole.eventHorizonRadius;
          const clampedStrength = Math.min(0.5, lensingStrength * 0.3);
          
          // Deflect position slightly around the black hole
          const deflectionAngle = angleFromCenter + clampedStrength;
          const lensedDist = dist + clampedStrength * 15;
          drawX = blackHole.x + Math.cos(deflectionAngle) * lensedDist;
          drawY = blackHole.y + Math.sin(deflectionAngle) * lensedDist;
          
          // Lensed particles are slightly dimmer
          lensingAlpha = alpha * (1 - clampedStrength * 0.4);
        }
      }

      // Draw particle with Doppler-shifted color and lensing
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${lensingAlpha})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Enhanced glow for particles near event horizon
      if (dist < blackHole.eventHorizonRadius * 1.2) {
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${lensingAlpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(animate);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Load messages from markdown file
  async function loadMessages() {
    try {
      const response = await fetch('home messages.md');
      const text = await response.text();
      
      // Parse markdown - extract non-empty lines that aren't headers
      messages = text
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
      
      if (messages.length > 0) {
        startTextAnimation();
      }
    } catch (error) {
      // Fallback messages
      messages = [
        "a universe of ideas waiting to be explored",
        "A galaxy of life spiraling forward",
        "Where time and space converge"
      ];
      startTextAnimation();
    }
  }

  // Start typing animation for current message
  function typeMessage() {
    charIndex = 0;
    displayedText = '';
    
    if (typingInterval) {
      clearInterval(typingInterval);
    }
    
    typingInterval = setInterval(() => {
      if (charIndex < currentMessage.length) {
        displayedText = currentMessage.substring(0, charIndex + 1);
        charIndex++;
      } else {
        // Finished typing
        clearInterval(typingInterval);
      }
    }, 50); // 50ms per character
  }

  // Cycle to next message
  function cycleMessage() {
    // Move to next message (or loop back to start)
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    currentMessage = messages[currentMessageIndex];
    
    typeMessage();
    
    // Schedule next cycle in 2-3 minutes (randomly)
    const nextCycleDelay = 120000 + Math.random() * 60000; // 2-3 minutes
    cycleTimeout = setTimeout(cycleMessage, nextCycleDelay);
  }

  // Start the text animation system
  function startTextAnimation() {
    // Pick random starting message
    currentMessageIndex = Math.floor(Math.random() * messages.length);
    currentMessage = messages[currentMessageIndex];
    
    // Start typing after 30 seconds
    delayTimeout = setTimeout(() => {
      typeMessage();
      
      // Schedule first cycle in 2-3 minutes after typing completes
      const firstCycleDelay = 120000 + Math.random() * 60000; // 2-3 minutes
      cycleTimeout = setTimeout(cycleMessage, firstCycleDelay);
    }, 30000); // 30 seconds delay
  }

  function init() {
    resize();
    initParticles();
    
    // Load messages and start animation
    loadMessages();
    
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
