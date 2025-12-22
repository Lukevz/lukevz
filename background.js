/**
 * =============================================================================
 * SPIRAL GALAXY PARTICLE SIMULATION BACKGROUND
 * =============================================================================
 *
 * An interactive spiral galaxy with particle physics and flowing animations.
 * Particles form spiral arms with warm oranges, golds, and cool blues.
 * Features Z-depth layering, motion trails, and mouse interaction.
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
  const maxParticles = 2000; // Reduced for more sparse, chaotic look

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
    // Galaxy parameters - fewer, looser spiral arms for more chaotic look
    const numArms = 2; // Reduced from 4 for cleaner structure
    const armWidth = 2.5; // Much wider arms for chaotic distribution
    const spiralTightness = 0.08; // Looser spiral (smaller value = looser)

    // Choose which spiral arm this particle belongs to
    const armIndex = Math.floor(Math.random() * numArms);
    const armAngleOffset = (armIndex * Math.PI * 2) / numArms;

    // Distance from center with more variation
    const distanceRandom = Math.pow(Math.random(), 0.6); // More spread out
    const distance = 100 + distanceRandom * 1000; // Wider range

    // Calculate spiral angle using logarithmic spiral formula
    const theta = Math.log(distance / 100) / spiralTightness;

    // Much more randomness perpendicular to spiral arm for chaotic look
    const armOffset = (Math.random() - 0.5) * armWidth;

    // Additional random scatter for particles to break up orderly patterns
    const randomScatter = (Math.random() - 0.5) * Math.PI * 0.5;

    // Calculate position along spiral arm with scatter
    const angle = theta + armAngleOffset + armOffset + randomScatter;

    // Apply perspective tilt to create angled view
    const tiltAngle = Math.PI * 0.25; // 45-degree tilt
    const rawX = Math.cos(angle) * distance;
    const rawY = Math.sin(angle) * distance;

    // Transform coordinates for tilted perspective
    const x = blackHole.x + rawX;
    const y = blackHole.y + rawY * Math.cos(tiltAngle);

    // Z-depth based on tilt and position
    const zDepth = 0.5 + (rawY * Math.sin(tiltAngle)) / (distance * 2);

    // Slower rotation for galaxy arms (not orbital velocity)
    const rotationSpeed = (0.0002 + Math.random() * 0.0001) * (1 - distanceRandom * 0.3);
    const tangentAngle = angle + Math.PI / 2;
    const speed = rotationSpeed * distance;
    const vx = Math.cos(tangentAngle) * speed;
    const vy = Math.sin(tangentAngle) * speed * Math.cos(tiltAngle);

    // Larger size variation for more dramatic clusters
    const baseSize = 0.3 + Math.random() * 2.0; // Wider size range
    const depthSize = baseSize * Math.max(0, Math.min(1, zDepth)); // Z-depth affects size
    const distanceSize = depthSize * (1 + (1 - distanceRandom) * 0.8); // Brighter center

    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: 1,
      maxLife: 1,
      size: distanceSize,
      angle: angle,
      distance: distance,
      zDepth: Math.max(0, Math.min(1, zDepth)), // Clamp between 0-1
      armIndex: armIndex,
      baseColor: Math.random() // For color variation
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
    // Slightly faster fade for cleaner, less muddy appearance
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update black hole position (in case of resize)
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;

    // Draw very subtle galaxy core glow
    const coreGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.glowRadius * 1.5
    );
    coreGlow.addColorStop(0, 'rgba(255, 250, 240, 0.08)');
    coreGlow.addColorStop(0.4, 'rgba(255, 230, 200, 0.04)');
    coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.glowRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw galaxy core - more subtle
    const coreGradient = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.radius
    );
    coreGradient.addColorStop(0, 'rgba(255, 245, 230, 0.1)');
    coreGradient.addColorStop(0.6, 'rgba(255, 220, 180, 0.04)');
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

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

    // Celestial bodies removed for galaxy view
    // (Galaxy doesn't have distinct orbital bodies like the black hole simulation did)

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

      // Simplified galaxy physics - gentle rotation and flow

      // Mouse interaction - gentle repulsion
      if (mouse.isHovering) {
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mouseDist < 150) {
          const repulsionStrength = (150 - mouseDist) / 150;
          const repulsionForce = repulsionStrength * 0.3;
          p.vx += (mdx / mouseDist) * repulsionForce;
          p.vy += (mdy / mouseDist) * repulsionForce;
        }
      }

      // Very gentle pull toward center to prevent drift
      if (dist > 0.1) {
        const pullStrength = 0.00005;
        p.vx += (dx / dist) * pullStrength;
        p.vy += (dy / dist) * pullStrength;
      }

      // Minimal drag to maintain smooth motion
      p.vx *= 0.999;
      p.vy *= 0.999;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Respawn particles that drift too far
      if (dist > 1200) {
        particles.splice(i, 1);
        particles.push(createParticle());
        continue;
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
      
      // Combined brightness with Z-depth layering
      const depthBrightness = 0.3 + (p.zDepth * 0.7); // Closer = brighter
      const baseBrightness = distanceBrightness * dopplerBrightness * diskBrightness * depthBrightness;
      const alpha = Math.min(1, p.life * baseBrightness * edgeFade);

      // Galaxy color palette: dramatic variation with bright whites, blues, purples, and warm tones
      // More contrast and variation for chaotic, artistic look
      const distanceFromCenter = p.distance / 1000; // 0 = center, 1 = edge

      let red, green, blue;

      // Create distinct color regions with more dramatic contrast
      const colorRandom = p.baseColor;

      if (distanceFromCenter < 0.25) {
        // Core: intensely bright white with some blue-white stars
        if (colorRandom < 0.6) {
          // Pure brilliant white
          red = 255;
          green = 255;
          blue = 255;
        } else {
          // Bright blue-white
          red = Math.floor(220 + Math.random() * 35);
          green = Math.floor(240 + Math.random() * 15);
          blue = 255;
        }
      } else if (distanceFromCenter < 0.5) {
        // Inner arms: mix of warm oranges, golds, and bright whites
        if (colorRandom < 0.25) {
          // Vivid orange
          red = 255;
          green = Math.floor(160 + Math.random() * 60);
          blue = Math.floor(80 + Math.random() * 80);
        } else if (colorRandom < 0.5) {
          // Bright golden
          red = 255;
          green = Math.floor(200 + Math.random() * 40);
          blue = Math.floor(120 + Math.random() * 80);
        } else {
          // Bright white-blue stars scattered through
          red = Math.floor(240 + Math.random() * 15);
          green = Math.floor(245 + Math.random() * 10);
          blue = 255;
        }
      } else {
        // Outer regions: dramatic blues, purples, with occasional bright stars
        if (colorRandom < 0.2) {
          // Brilliant white stars
          red = 255;
          green = 255;
          blue = 255;
        } else if (colorRandom < 0.5) {
          // Vivid blue
          red = Math.floor(120 + Math.random() * 80);
          green = Math.floor(180 + Math.random() * 60);
          blue = 255;
        } else if (colorRandom < 0.75) {
          // Deep purple-blue
          red = Math.floor(140 + Math.random() * 80);
          green = Math.floor(120 + Math.random() * 80);
          blue = Math.floor(230 + Math.random() * 25);
        } else {
          // Soft cyan-blue nebula
          red = Math.floor(100 + Math.random() * 100);
          green = Math.floor(200 + Math.random() * 40);
          blue = Math.floor(240 + Math.random() * 15);
        }
      }

      // No gravitational lensing for galaxy view (was specific to black hole)
      const drawX = p.x;
      const drawY = p.y;
      const lensingAlpha = alpha;

      // Draw particle with dramatic glow for bright stars
      const brightness = (red + green + blue) / 3;
      const isBright = brightness > 200; // Bright white/blue stars

      // Larger, brighter particles get more pronounced glows
      const glowSize = p.size * (1.8 + p.zDepth * 2);
      const glowAlpha = lensingAlpha * (0.2 + p.zDepth * 0.4);

      // Extra large glow for bright stars
      if (isBright) {
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${glowAlpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, glowSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer glow
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${glowAlpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, glowSize * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${glowAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core particle - brighter for white stars
      const coreAlpha = isBright ? Math.min(1, lensingAlpha * 1.2) : lensingAlpha;
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${coreAlpha})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
      ctx.fill();
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
