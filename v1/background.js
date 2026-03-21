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

  // Start with canvas hidden for fade-in effect
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 1.5s ease-in-out';

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
  const maxParticles = 260;

  // Orbit tuning (lower = slower)
  const ORBIT_SPEED = 0.48;

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

  // Space capsule for Project Shredder
  let spaceCapsule = null;

  // Animation state
  let lastFrameTime = 0;
  const frameDelay = 1000 / 20; // 20 FPS for slower, more contemplative motion

  // Subtle noise pattern to reduce gradient banding (especially in 8-bit displays)
  let noisePattern = null;
  function getNoisePattern() {
    if (noisePattern) return noisePattern;

    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    const nctx = noiseCanvas.getContext('2d', { alpha: true });
    if (!nctx) return null;

    const imageData = nctx.createImageData(noiseCanvas.width, noiseCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Centered low-amplitude luminance noise (very subtle).
      const v = 128 + Math.floor((Math.random() - 0.5) * 18);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    nctx.putImageData(imageData, 0, 0);
    noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
    return noisePattern;
  }

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
    // Keep particles concentrated in the accretion disk region so the
    // "spiraling streaks" stay dense over time (instead of drifting outward).
    const minDist = blackHole.eventHorizonRadius * 1.15;
    const computedMaxDist = Math.min(
      blackHole.accretionDiskRadius * 1.9,
      Math.min(canvas.width, canvas.height) * 0.48
    );
    const maxDist = Math.max(minDist + 10, computedMaxDist);
    const distance = minDist + Math.pow(Math.random(), 1.7) * (maxDist - minDist);

    const x = blackHole.x + Math.cos(angle) * distance;
    const y = blackHole.y + Math.sin(angle) * distance;

    // Calculate precise orbital velocity for stable circular motion
    // Using vis-viva equation for orbital mechanics
    const speed = Math.sqrt(blackHole.mass / distance) * ORBIT_SPEED;
    const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.02;  // Minimal randomness for immediate stable orbits
    const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.02;
    const orbitalDirection = Math.random() > 0.5 ? 1 : -1;  // Some orbit clockwise, some counter

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
      targetDistance: distance,
      orbitalDirection,
      omega: (speed / distance) * orbitalDirection
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
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
    accretionGlow.addColorStop(0, 'rgba(120, 170, 255, 0.03)');
    accretionGlow.addColorStop(0.35, 'rgba(95, 140, 235, 0.02)');
    accretionGlow.addColorStop(0.7, 'rgba(75, 115, 210, 0.012)');
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
    eventHorizonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.075)');
    eventHorizonGlow.addColorStop(0.35, 'rgba(210, 225, 255, 0.04)');
    eventHorizonGlow.addColorStop(0.7, 'rgba(180, 200, 255, 0.022)');
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
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.105)');
    innerGlow.addColorStop(0.16, 'rgba(240, 248, 255, 0.078)');
    innerGlow.addColorStop(0.34, 'rgba(225, 238, 255, 0.055)');
    innerGlow.addColorStop(0.58, 'rgba(210, 225, 255, 0.035)');
    innerGlow.addColorStop(0.82, 'rgba(180, 205, 255, 0.018)');
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
    diskGradient.addColorStop(0, 'rgba(255, 255, 255, 0.055)');
    diskGradient.addColorStop(0.2, 'rgba(235, 245, 255, 0.04)');
    diskGradient.addColorStop(0.45, 'rgba(220, 235, 255, 0.028)');
    diskGradient.addColorStop(0.7, 'rgba(200, 220, 255, 0.016)');
    diskGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

    ctx.fillStyle = diskGradient;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.iscoRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle noise overlay inside the disk region to reduce visible banding
    // while keeping the gradient visually smooth.
    const pattern = getNoisePattern();
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.035;
      ctx.beginPath();
      ctx.arc(blackHole.x, blackHole.y, blackHole.iscoRadius * 1.55, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

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
      ctx.font = '600 14px "Doto", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Simple shadow for subtle depth
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 4;

      // Wrap text to fit within black hole radius
      const maxWidth = blackHole.radius * 1.8; // 90% of diameter for padding
      const lineHeight = 18; // Spacing between lines
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

    // Update and draw space capsule if active (Project Shredder)
    if (spaceCapsule && spaceCapsule.launched) {
      // Calculate distance to black hole
      const dx = blackHole.x - spaceCapsule.x;
      const dy = blackHole.y - spaceCapsule.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Debug: Log occasionally (use a counter on the capsule object)
      if (!spaceCapsule.logCounter) spaceCapsule.logCounter = 0;
      spaceCapsule.logCounter++;
      if (spaceCapsule.logCounter % 30 === 0) {
        console.log('[background.js] Capsule flying:', {
          position: { x: Math.round(spaceCapsule.x), y: Math.round(spaceCapsule.y) },
          velocity: { vx: spaceCapsule.vx.toFixed(2), vy: spaceCapsule.vy.toFixed(2) },
          distanceToBlackHole: Math.round(dist),
          opacity: spaceCapsule.opacity.toFixed(2)
        });
      }

      // Check if captured by event horizon
      if (dist <= blackHole.eventHorizonRadius) {
        // Trigger capture event
        console.log('[background.js] Capsule CAPTURED! Distance:', dist);
        if (window.onCapsuleCaptured) {
          window.onCapsuleCaptured({
            x: spaceCapsule.x,
            y: spaceCapsule.y
          });
        }
        spaceCapsule = null;
      } else {
        spaceCapsule.frameCount++;

        // Handle star launch phases
        if (spaceCapsule.isStar && spaceCapsule.launchPhase !== 'flying') {
          if (spaceCapsule.launchPhase === 'launch') {
            // Phase 1: Rocket upward with deceleration
            spaceCapsule.vy += 0.3; // Gravity slows upward motion
            spaceCapsule.x += spaceCapsule.vx;
            spaceCapsule.y += spaceCapsule.vy;

            // After 30 frames (~1 second), transition to arc phase
            if (spaceCapsule.frameCount > 30) {
              spaceCapsule.launchPhase = 'arc';
              // Redirect velocity toward black hole center
              const speed = Math.sqrt(spaceCapsule.vx * spaceCapsule.vx + spaceCapsule.vy * spaceCapsule.vy);
              spaceCapsule.vx = (dx / dist) * speed * 1.2;
              spaceCapsule.vy = (dy / dist) * speed * 1.2;
            }
          } else if (spaceCapsule.launchPhase === 'arc') {
            // Phase 2: Arc toward black hole with increasing speed
            const force = blackHole.mass / (dist * dist);
            const ax = (dx / dist) * force * 0.003; // Stronger gravity
            const ay = (dy / dist) * force * 0.003;

            spaceCapsule.vx += ax;
            spaceCapsule.vy += ay;
            spaceCapsule.x += spaceCapsule.vx;
            spaceCapsule.y += spaceCapsule.vy;

            // Transition to spiral when close enough
            if (dist < canvas.width * 0.3) {
              spaceCapsule.launchPhase = 'spiral';
            }
          } else if (spaceCapsule.launchPhase === 'spiral') {
            // Phase 3: Spiral into black hole
            const force = blackHole.mass / (dist * dist);
            const ax = (dx / dist) * force * 0.005; // Even stronger pull
            const ay = (dy / dist) * force * 0.005;

            spaceCapsule.vx += ax;
            spaceCapsule.vy += ay;
            spaceCapsule.x += spaceCapsule.vx;
            spaceCapsule.y += spaceCapsule.vy;

            // Shrink as it gets closer
            spaceCapsule.size = Math.max(5, spaceCapsule.targetSize * (dist / (canvas.width * 0.3)));
          }
        } else {
          // Regular capsule physics or star in flying mode
          const force = blackHole.mass / (dist * dist);
          const ax = (dx / dist) * force * 0.001;
          const ay = (dy / dist) * force * 0.001;

          spaceCapsule.vx += ax;
          spaceCapsule.vy += ay;
          spaceCapsule.x += spaceCapsule.vx;
          spaceCapsule.y += spaceCapsule.vy;
        }

        // Calculate rotation angle based on velocity direction
        spaceCapsule.angle = Math.atan2(spaceCapsule.vy, spaceCapsule.vx) + Math.PI / 2;

        // Update star rotation for spinning effect
        if (spaceCapsule.isStar) {
          spaceCapsule.starRotation += 0.1;
        }

        // Handle grow-in animation if starting hidden
        if (spaceCapsule.growing) {
          spaceCapsule.opacity += 0.08; // Faster fade in
          if (spaceCapsule.opacity >= spaceCapsule.targetOpacity) {
            spaceCapsule.opacity = spaceCapsule.targetOpacity;
            spaceCapsule.growing = false;
          }
        } else {
          spaceCapsule.opacity = 1; // Keep full opacity during flight
        }

        // Add sparkle trail for stars
        if (spaceCapsule.isStar && spaceCapsule.frameCount % 2 === 0) {
          spaceCapsule.trail.push({
            x: spaceCapsule.x,
            y: spaceCapsule.y,
            life: 1.0,
            size: Math.random() * 3 + 2
          });
          // Keep trail limited
          if (spaceCapsule.trail.length > 20) {
            spaceCapsule.trail.shift();
          }
        }

        // Draw sparkle trail for stars (before drawing the star itself)
        if (spaceCapsule.isStar && spaceCapsule.trail) {
          for (let i = 0; i < spaceCapsule.trail.length; i++) {
            const sparkle = spaceCapsule.trail[i];
            sparkle.life -= 0.05; // Fade out sparkles

            if (sparkle.life > 0) {
              ctx.save();
              ctx.globalAlpha = sparkle.life * spaceCapsule.opacity;
              ctx.fillStyle = `rgba(255, 221, 0, ${sparkle.life})`;
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#ffdd00';

              // Draw sparkle as a small star or circle
              ctx.beginPath();
              ctx.arc(sparkle.x, sparkle.y, sparkle.size * sparkle.life, 0, Math.PI * 2);
              ctx.fill();

              // Add a cross sparkle effect
              ctx.strokeStyle = `rgba(255, 255, 255, ${sparkle.life * 0.8})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(sparkle.x - sparkle.size, sparkle.y);
              ctx.lineTo(sparkle.x + sparkle.size, sparkle.y);
              ctx.moveTo(sparkle.x, sparkle.y - sparkle.size);
              ctx.lineTo(sparkle.x, sparkle.y + sparkle.size);
              ctx.stroke();

              ctx.restore();
            }
          }
          // Remove dead sparkles
          spaceCapsule.trail = spaceCapsule.trail.filter(s => s.life > 0);
        }

        ctx.save();
        ctx.translate(spaceCapsule.x, spaceCapsule.y);
        ctx.globalAlpha = spaceCapsule.opacity;

        if (spaceCapsule.isStar) {
          // Draw a star shape
          ctx.rotate(spaceCapsule.starRotation);
          const spikes = 5;
          const outerRadius = spaceCapsule.size;
          const innerRadius = spaceCapsule.size * 0.4;

          ctx.beginPath();
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();

          // Gradient fill for star
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.5, '#ffdd00');
          gradient.addColorStop(1, '#ff8800');
          ctx.fillStyle = gradient;
          ctx.fill();

          // Add dramatic glow - larger during launch phases
          const glowSize = spaceCapsule.launchPhase === 'launch' ? 25 :
                          spaceCapsule.launchPhase === 'arc' ? 20 : 15;
          ctx.shadowBlur = glowSize;
          ctx.shadowColor = '#ffdd00';
          ctx.fill();

          // Add extra outer glow for more drama
          ctx.shadowBlur = glowSize + 10;
          ctx.shadowColor = 'rgba(255, 221, 0, 0.5)';
          ctx.fill();
        } else {
          // Draw capsule as a simple pixel art shape
          ctx.rotate(spaceCapsule.angle);

          // Pixel art capsule (simple rocket shape)
          const s = spaceCapsule.size / 10; // Scale factor

          // Body (light gray)
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(-2*s, -4*s, 4*s, 8*s);

          // Nose cone (red)
          ctx.fillStyle = '#ff6666';
          ctx.fillRect(-3*s, -5*s, 6*s, 2*s);
          ctx.fillRect(-2*s, -7*s, 4*s, 2*s);
          ctx.fillRect(-1*s, -8*s, 2*s, 1*s);

          // Fins (dark gray)
          ctx.fillStyle = '#999999';
          ctx.fillRect(-5*s, 3*s, 3*s, 3*s); // Left fin
          ctx.fillRect(2*s, 3*s, 3*s, 3*s);  // Right fin

          // Window (dark blue)
          ctx.fillStyle = '#3366cc';
          ctx.fillRect(-1*s, -1*s, 2*s, 2*s);

          // Exhaust glow (orange)
          ctx.fillStyle = `rgba(255, 150, 50, ${spaceCapsule.opacity * 0.6})`;
          ctx.fillRect(-1*s, 4*s, 2*s, 3*s);
        }

        ctx.restore();
      }
    }

    // Update and draw particles
    ctx.lineCap = 'round';
    const particleOrbitMin = blackHole.eventHorizonRadius * 1.15;
    const computedParticleOrbitMax = Math.min(
      blackHole.accretionDiskRadius * 1.9,
      Math.min(canvas.width, canvas.height) * 0.48
    );
    const particleOrbitMax = Math.max(particleOrbitMin + 10, computedParticleOrbitMax);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Hard-constraint circular motion: fixed radius, constant angular velocity.
      // This avoids the in/out "swirl" that comes from numerical integration + damping.
      p.targetDistance = Math.min(particleOrbitMax, Math.max(particleOrbitMin, p.targetDistance || particleOrbitMin));
      const radius = p.targetDistance;

      // Recompute angular velocity from current radius so speed matches the visual orbit tuning.
      const speed = Math.sqrt(blackHole.mass / radius) * ORBIT_SPEED;
      const dir = p.orbitalDirection || 1;
      p.omega = (speed / radius) * dir;

      p.angle = (p.angle || 0) + p.omega;
      if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;
      if (p.angle < 0) p.angle += Math.PI * 2;

      const cosA = Math.cos(p.angle);
      const sinA = Math.sin(p.angle);
      p.x = blackHole.x + cosA * radius;
      p.y = blackHole.y + sinA * radius;
      p.vx = -sinA * speed * dir;
      p.vy = cosA * speed * dir;

      // Calculate distance to black hole (exactly radius here)
      const dx = blackHole.x - p.x;
      const dy = blackHole.y - p.y;
      const dist = radius;

      // Calculate edge fade based on distance from viewport center
      const maxViewportDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2;
      const viewportCenterDist = Math.sqrt(
        Math.pow(p.x - canvas.width / 2, 2) + 
        Math.pow(p.y - canvas.height / 2, 2)
      );
      const edgeFade = Math.max(0.15, 1 - (viewportCenterDist / maxViewportDist) * 1.5);

      // Particles stay at full life (no consumption/fade) for a stable orbit look.
      p.life = 1;

      // Calculate Doppler beaming effect
      // Radial velocity = component of velocity toward/away from viewer
      const angleToBH = Math.atan2(dy, dx);
      const velocityAngle = Math.atan2(p.vy, p.vx);
      const totalSpeed = speed;
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
      // Draw as a small streak aligned to velocity so it stays "spiral-y"
      // even when the trail buffer reaches steady state.
      const dirX = Math.cos(velocityAngle);
      const dirY = Math.sin(velocityAngle);
      const streakLength = Math.max(4, Math.min(12, 4 + totalSpeed * 1.2));

      ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${lensingAlpha})`;
      ctx.lineWidth = Math.max(0.6, p.size);
      ctx.beginPath();
      ctx.moveTo(drawX - dirX * streakLength, drawY - dirY * streakLength);
      ctx.lineTo(drawX, drawY);
      ctx.stroke();

      // Small core point for definition
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${lensingAlpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, p.size * 0.7, 0, Math.PI * 2);
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

  // Pre-run simulation without rendering to get particles into stable orbits
  function prerunSimulation(frames) {
    for (let f = 0; f < frames; f++) {
      // Update celestial bodies
      for (const body of celestialBodies) {
        body.angle += body.speed;
      }

      // Update particles (orbit only, no rendering)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const radius = p.targetDistance || blackHole.eventHorizonRadius * 1.2;
        const speed = Math.sqrt(blackHole.mass / radius) * ORBIT_SPEED;
        const dir = p.orbitalDirection || 1;
        p.omega = (speed / radius) * dir;

        p.angle = (p.angle || 0) + p.omega;
        if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;
        if (p.angle < 0) p.angle += Math.PI * 2;

        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        p.x = blackHole.x + cosA * radius;
        p.y = blackHole.y + sinA * radius;
        p.vx = -sinA * speed * dir;
        p.vy = cosA * speed * dir;
      }
    }
  }

  // =============================================================================
  // PUBLIC API FOR PROJECT SHREDDER
  // =============================================================================

  /**
   * Launch a space capsule from Project Shredder
   * @param {Object} capsuleData - {x, y, filename, isStar, startHidden}
   */
  window.launchCapsule = function(capsuleData) {
    console.log('[background.js] Launching capsule at:', capsuleData);

    // Calculate initial velocity toward the black hole center
    const dx = blackHole.x - capsuleData.x;
    const dy = blackHole.y - capsuleData.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If it's a star, give it a dramatic launch trajectory
    // Otherwise use the old capsule trajectory
    let vx, vy;
    if (capsuleData.isStar) {
      // Initial upward burst, then will arc toward center
      const speed = 8; // Much faster for dramatic effect
      vx = (dx / dist) * speed * 0.3; // Small horizontal component
      vy = -speed; // Strong upward launch
    } else {
      // Original capsule trajectory
      const speed = 1.5;
      vx = (-dy / dist) * speed;
      vy = (dx / dist) * speed - 2;
    }

    spaceCapsule = {
      x: capsuleData.x,
      y: capsuleData.y,
      vx: vx,
      vy: vy,
      filename: capsuleData.filename,
      size: capsuleData.isStar ? 20 : 20,
      targetSize: capsuleData.isStar ? 20 : 20,
      angle: 0,
      opacity: capsuleData.startHidden ? 0 : 1,
      targetOpacity: 1,
      launched: true,
      isStar: capsuleData.isStar || false,
      starRotation: 0, // For star spinning animation
      growing: capsuleData.startHidden || false,
      trail: [], // Trail of sparkles
      launchPhase: capsuleData.isStar ? 'launch' : 'flying', // launch -> arc -> spiral
      frameCount: 0
    };

    console.log('[background.js] ' + (capsuleData.isStar ? 'Star' : 'Capsule') + ' initialized:', {
      position: { x: spaceCapsule.x, y: spaceCapsule.y },
      velocity: { vx: spaceCapsule.vx, vy: spaceCapsule.vy },
      distanceToBlackHole: dist,
      startHidden: capsuleData.startHidden
    });
  };

  /**
   * Remove the active space capsule
   */
  window.removeCapsule = function() {
    spaceCapsule = null;
  };

  /**
   * Get current capsule position (for debugging)
   */
  window.getCapsulePosition = function() {
    if (!spaceCapsule) return null;
    return { x: spaceCapsule.x, y: spaceCapsule.y };
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  function init() {
    resize();
    initParticles();

    // Pre-run simulation for ~3 seconds worth of frames to get particles moving naturally
    prerunSimulation(60); // 60 frames at 20fps = 3 seconds

    // Load messages and start animation
    // loadMessages(); // Disabled - no text over black hole

    // Event listeners
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Start animation then fade in canvas
    requestAnimationFrame((time) => {
      animate(time);
      // Fade in canvas after first frame renders
      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
      });
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
