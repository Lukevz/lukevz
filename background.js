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
  const maxParticles = 3000; // Increased for galaxy effect

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
    // Galaxy parameters
    const numArms = 4; // Number of spiral arms
    const armWidth = 0.3; // Width of spiral arms
    const spiralTightness = 0.15; // How tight the spiral is

    // Choose which spiral arm this particle belongs to
    const armIndex = Math.floor(Math.random() * numArms);
    const armAngleOffset = (armIndex * Math.PI * 2) / numArms;

    // Distance from center (logarithmic distribution for realistic galaxy)
    const distanceRandom = Math.pow(Math.random(), 0.7); // Bias toward center
    const distance = 80 + distanceRandom * 900; // Range from core to outer edge

    // Calculate spiral angle using logarithmic spiral formula: r = a * e^(b*θ)
    // Solving for θ: θ = ln(r/a) / b
    const theta = Math.log(distance / 80) / spiralTightness;

    // Add randomness perpendicular to spiral arm
    const armOffset = (Math.random() - 0.5) * armWidth;

    // Calculate position along spiral arm
    const angle = theta + armAngleOffset + armOffset;

    const x = blackHole.x + Math.cos(angle) * distance;
    const y = blackHole.y + Math.sin(angle) * distance;

    // Z-depth: particles closer to center are "in front"
    const zDepth = Math.random(); // 0 = far, 1 = near

    // Slower rotation for galaxy arms (not orbital velocity)
    const rotationSpeed = (0.0003 + Math.random() * 0.0002) * (1 - distanceRandom * 0.5);
    const tangentAngle = angle + Math.PI / 2;
    const speed = rotationSpeed * distance;
    const vx = Math.cos(tangentAngle) * speed;
    const vy = Math.sin(tangentAngle) * speed;

    // Size varies with depth and distance
    const baseSize = 0.4 + Math.random() * 1.2;
    const depthSize = baseSize * (0.5 + zDepth * 0.5); // Closer = larger
    const distanceSize = depthSize * (1 + (1 - distanceRandom) * 0.5); // Center = larger

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
      zDepth: zDepth, // 0 = far, 1 = near
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

    // Clear canvas with fade effect for motion trails (lower opacity = longer trails)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update black hole position (in case of resize)
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;

    // Draw subtle galaxy core glow (warm white/golden)
    const coreGlow = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.glowRadius * 2
    );
    coreGlow.addColorStop(0, 'rgba(255, 245, 220, 0.12)');
    coreGlow.addColorStop(0.3, 'rgba(255, 220, 180, 0.06)');
    coreGlow.addColorStop(0.6, 'rgba(255, 200, 150, 0.02)');
    coreGlow.addColorStop(1, 'rgba(180, 160, 140, 0)');

    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.glowRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw galaxy core
    const coreGradient = ctx.createRadialGradient(
      blackHole.x,
      blackHole.y,
      0,
      blackHole.x,
      blackHole.y,
      blackHole.radius
    );
    coreGradient.addColorStop(0, 'rgba(255, 250, 240, 0.15)');
    coreGradient.addColorStop(0.5, 'rgba(255, 230, 200, 0.08)');
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

      // Galaxy color palette: warm oranges, golds, blues, and whites
      // Color varies by depth, distance, and random variation
      const distanceFromCenter = p.distance / 900; // 0 = center, 1 = edge

      let red, green, blue;

      // Core: bright white/blue-white
      // Middle: orange/golden tones
      // Edge: cooler blue/purple tones
      if (distanceFromCenter < 0.3) {
        // Core region: bright white-blue with golden highlights
        const coreMix = p.baseColor;
        if (coreMix < 0.4) {
          // Bright white/blue-white
          red = 255;
          green = Math.floor(245 + Math.random() * 10);
          blue = Math.floor(230 + Math.random() * 25);
        } else {
          // Golden/orange core
          red = Math.floor(255 - Math.random() * 20);
          green = Math.floor(200 + Math.random() * 40);
          blue = Math.floor(140 + Math.random() * 40);
        }
      } else if (distanceFromCenter < 0.7) {
        // Middle region: warm oranges and golds
        const warmMix = p.baseColor;
        if (warmMix < 0.3) {
          // Bright orange
          red = Math.floor(255 - Math.random() * 15);
          green = Math.floor(180 + Math.random() * 50);
          blue = Math.floor(100 + Math.random() * 60);
        } else if (warmMix < 0.6) {
          // Golden
          red = Math.floor(255 - Math.random() * 30);
          green = Math.floor(210 + Math.random() * 30);
          blue = Math.floor(150 + Math.random() * 50);
        } else {
          // White-gold
          red = 255;
          green = Math.floor(230 + Math.random() * 25);
          blue = Math.floor(200 + Math.random() * 40);
        }
      } else {
        // Outer region: cooler blues and purples with some white
        const coolMix = p.baseColor;
        if (coolMix < 0.4) {
          // Blue-white
          red = Math.floor(200 + Math.random() * 55);
          green = Math.floor(220 + Math.random() * 35);
          blue = 255;
        } else if (coolMix < 0.7) {
          // Soft blue
          red = Math.floor(150 + Math.random() * 60);
          green = Math.floor(180 + Math.random() * 50);
          blue = Math.floor(230 + Math.random() * 25);
        } else {
          // Purple-blue
          red = Math.floor(180 + Math.random() * 40);
          green = Math.floor(160 + Math.random() * 50);
          blue = Math.floor(220 + Math.random() * 35);
        }
      }

      // No gravitational lensing for galaxy view (was specific to black hole)
      const drawX = p.x;
      const drawY = p.y;
      const lensingAlpha = alpha;

      // Draw particle with depth-based glow
      // Larger, brighter particles get more pronounced glows
      const glowSize = p.size * (1.5 + p.zDepth * 1.5);
      const glowAlpha = lensingAlpha * (0.15 + p.zDepth * 0.25);

      // Outer glow
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${glowAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, glowSize * 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${glowAlpha})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core particle
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${lensingAlpha})`;
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
