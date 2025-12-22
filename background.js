/**
 * =============================================================================
 * SPIRAL GALAXY - SIMPLIFIED FLOWING PARTICLE ANIMATION
 * =============================================================================
 *
 * A minimalist galaxy with thousands of tiny particles flowing along spiral streams.
 * Inspired by artistic renderings with dense star fields and flowing current lines.
 *
 * =============================================================================
 */

(function() {
  'use strict';

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // Disable image smoothing for crisp pixel-perfect particles
  ctx.imageSmoothingEnabled = false;

  // Configuration
  const config = {
    particleCount: 12000, // Much higher for dense streams
    streamLineCount: 120,
    centerX: 0,
    centerY: 0,
    voidRadius: 60,
    voidOffsetX: -150, // Offset void to create asymmetric sweep
    voidOffsetY: -80,
    maxRadius: 900,
    fps: 30
  };

  // Particles - tiny dots that flow along the spiral
  const particles = [];

  // Stream lines - curved paths that guide the flow
  const streamLines = [];

  // Mouse state
  const mouse = { x: 0, y: 0, active: false };

  // Text animation state
  let messages = [];
  let displayedText = '';
  let currentMessage = '';
  let charIndex = 0;
  let currentMessageIndex = 0;

  // Animation timing
  let lastFrame = 0;
  const frameDelay = 1000 / config.fps;

  // ============================================================================
  // SPIRAL MATH
  // ============================================================================

  // Logarithmic spiral: r = a * e^(b * theta)
  function spiralRadius(theta, a = 20, b = 0.15) {
    return a * Math.exp(b * theta);
  }

  // Get point on spiral at angle theta
  function spiralPoint(theta, armOffset = 0) {
    const r = spiralRadius(theta);
    const angle = theta + armOffset;
    return {
      x: config.centerX + config.voidOffsetX + r * Math.cos(angle),
      y: config.centerY + config.voidOffsetY + r * Math.sin(angle) * 0.6, // Perspective tilt
      r: r
    };
  }

  // ============================================================================
  // STREAM LINES - Curved paths that create the flowing effect
  // ============================================================================

  function createStreamLine() {
    const armOffset = Math.random() * Math.PI * 2;
    const startTheta = 0.5 + Math.random() * 2;
    const length = 8 + Math.random() * 15;
    const width = 0.3 + Math.random() * 0.8;
    const speed = 0.002 + Math.random() * 0.003;
    const opacity = 0.02 + Math.random() * 0.06;

    return {
      armOffset,
      theta: startTheta,
      startTheta,
      length,
      width,
      speed,
      opacity,
      points: []
    };
  }

  function initStreamLines() {
    streamLines.length = 0;
    for (let i = 0; i < config.streamLineCount; i++) {
      streamLines.push(createStreamLine());
    }
  }

  function updateStreamLine(stream) {
    // Move along spiral
    stream.theta += stream.speed;

    // Reset if too far out
    if (spiralRadius(stream.theta) > config.maxRadius) {
      stream.theta = stream.startTheta;
    }

    // Build path points
    stream.points = [];
    for (let i = 0; i < 20; i++) {
      const t = stream.theta + (i / 20) * stream.length * 0.1;
      const pt = spiralPoint(t, stream.armOffset);
      stream.points.push(pt);
    }
  }

  function drawStreamLine(stream) {
    if (stream.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(stream.points[0].x, stream.points[0].y);

    for (let i = 1; i < stream.points.length; i++) {
      ctx.lineTo(stream.points[i].x, stream.points[i].y);
    }

    // Cool silver/white for stream lines
    ctx.strokeStyle = `rgba(185, 195, 210, ${stream.opacity})`;
    ctx.lineWidth = stream.width;
    ctx.stroke();
  }

  // ============================================================================
  // PARTICLES - Tiny dots flowing along the spiral
  // ============================================================================

  function createParticle() {
    // Random position along spiral arms
    const armIndex = Math.floor(Math.random() * 2);
    const armOffset = armIndex * Math.PI;

    // Random distance from center (theta determines radius in spiral)
    const theta = 0.5 + Math.random() * 25;

    // Much tighter spread for dense streams (silk-like flow)
    const spread = (Math.random() - 0.5) * 0.6; // Reduced from 1.5 to 0.6

    const basePoint = spiralPoint(theta, armOffset);

    // Tighter scatter for dense concentrations
    const scatter = 15 + Math.random() * 40; // Reduced from 30-130 to 15-55
    const scatterAngle = Math.random() * Math.PI * 2;

    const x = basePoint.x + Math.cos(scatterAngle) * scatter * spread;
    const y = basePoint.y + Math.sin(scatterAngle) * scatter * spread * 0.6;

    // Distance from center
    const dist = Math.sqrt(Math.pow(x - config.centerX, 2) + Math.pow(y - config.centerY, 2));

    // Color - 80% cool silver/white, 20% warm orange/gold highlights
    const colorRoll = Math.random();
    let color;
    if (colorRoll < 0.80) {
      // Cool silver/white - predominant color
      const brightness = 200 + Math.random() * 55;
      // Add cool blue tint
      color = {
        r: brightness - 15,
        g: brightness - 8,
        b: brightness + 5
      };
    } else {
      // Warm orange/gold highlights - only 20%
      color = {
        r: 255,
        g: 180 + Math.random() * 60,
        b: 100 + Math.random() * 80
      };
    }

    return {
      x,
      y,
      theta,
      armOffset,
      dist,
      size: 0.3 + Math.random() * 1.2,
      speed: 0.001 + Math.random() * 0.002,
      color,
      opacity: 0.3 + Math.random() * 0.7,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.04
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(createParticle());
    }
  }

  function updateParticle(p) {
    // Rotate around center following spiral
    p.theta += p.speed;

    // Recalculate position based on new theta
    const basePoint = spiralPoint(p.theta, p.armOffset);

    // Maintain relative scatter position
    const scatter = (p.dist / spiralRadius(p.theta)) * 50;
    const scatterAngle = Math.atan2(p.y - config.centerY, p.x - config.centerX);

    // Smooth transition toward spiral path
    const targetX = basePoint.x;
    const targetY = basePoint.y;

    p.x += (targetX - p.x) * 0.01;
    p.y += (targetY - p.y) * 0.01;

    // Add slight random drift
    p.x += (Math.random() - 0.5) * 0.3;
    p.y += (Math.random() - 0.5) * 0.2;

    // Twinkle effect
    p.twinkle += p.twinkleSpeed;

    // Update distance
    p.dist = Math.sqrt(Math.pow(p.x - config.centerX, 2) + Math.pow(p.y - config.centerY, 2));

    // Reset if too far out or inside void
    if (p.dist > config.maxRadius || p.dist < config.voidRadius) {
      Object.assign(p, createParticle());
    }

    // Mouse interaction - gentle push
    if (mouse.active) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const mouseDist = Math.sqrt(dx * dx + dy * dy);
      if (mouseDist < 100) {
        const force = (100 - mouseDist) / 100 * 2;
        p.x += (dx / mouseDist) * force;
        p.y += (dy / mouseDist) * force;
      }
    }
  }

  function drawParticle(p) {
    // Distance-based fade
    const distFade = Math.min(1, (p.dist - config.voidRadius) / 100);
    const edgeFade = Math.max(0, 1 - (p.dist / config.maxRadius));

    // Twinkle
    const twinkle = 0.7 + Math.sin(p.twinkle) * 0.3;

    const alpha = p.opacity * distFade * edgeFade * twinkle;

    if (alpha < 0.05) return;

    // Use fillRect for crisp 1px particles instead of arc
    ctx.fillStyle = `rgba(${Math.round(p.color.r)}, ${Math.round(p.color.g)}, ${Math.round(p.color.b)}, ${alpha})`;

    // Draw 1px square for sharpest rendering
    if (p.size < 1.5) {
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    } else {
      // Slightly larger particles still use rect for crispness
      const size = Math.round(p.size);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  // ============================================================================
  // CORE GLOW - Subtle light at galaxy center
  // ============================================================================

  function drawCoreGlow() {
    const coreX = config.centerX + config.voidOffsetX;
    const coreY = config.centerY + config.voidOffsetY;

    const gradient = ctx.createRadialGradient(
      coreX, coreY, 0,
      coreX, coreY, 200
    );
    // Cool white core instead of warm cream
    gradient.addColorStop(0, 'rgba(235, 240, 255, 0.15)');
    gradient.addColorStop(0.3, 'rgba(220, 230, 255, 0.08)');
    gradient.addColorStop(0.6, 'rgba(200, 215, 240, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 200, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============================================================================
  // TEXT OVERLAY
  // ============================================================================

  function drawText() {
    if (!displayedText) return;

    ctx.save();
    ctx.font = '600 11px "Doto", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 4;

    const maxWidth = 120;
    const lineHeight = 14;
    const words = displayedText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const startY = config.centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, config.centerX, startY + i * lineHeight);
    });

    ctx.restore();
  }

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  function animate(timestamp) {
    if (timestamp - lastFrame < frameDelay) {
      requestAnimationFrame(animate);
      return;
    }
    lastFrame = timestamp;

    // Clear canvas completely for crisp rendering (no motion blur)
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update center position
    config.centerX = canvas.width / 2;
    config.centerY = canvas.height / 2;

    // Draw core glow
    drawCoreGlow();

    // Update and draw stream lines
    for (const stream of streamLines) {
      updateStreamLine(stream);
      drawStreamLine(stream);
    }

    // Update and draw particles
    for (const p of particles) {
      updateParticle(p);
      drawParticle(p);
    }

    // Draw text
    drawText();

    requestAnimationFrame(animate);
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  async function loadMessages() {
    try {
      const response = await fetch('home messages.md');
      const text = await response.text();
      messages = text
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());

      if (messages.length > 0) {
        startTextAnimation();
      }
    } catch {
      messages = [
        "a universe of ideas",
        "spiraling forward",
        "where time converges"
      ];
      startTextAnimation();
    }
  }

  function typeMessage() {
    charIndex = 0;
    displayedText = '';

    const interval = setInterval(() => {
      if (charIndex < currentMessage.length) {
        displayedText = currentMessage.substring(0, ++charIndex);
      } else {
        clearInterval(interval);
      }
    }, 50);
  }

  function cycleMessage() {
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    currentMessage = messages[currentMessageIndex];
    typeMessage();
    setTimeout(cycleMessage, 120000 + Math.random() * 60000);
  }

  function startTextAnimation() {
    currentMessageIndex = Math.floor(Math.random() * messages.length);
    currentMessage = messages[currentMessageIndex];

    setTimeout(() => {
      typeMessage();
      setTimeout(cycleMessage, 120000 + Math.random() * 60000);
    }, 30000);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    config.centerX = canvas.width / 2;
    config.centerY = canvas.height / 2;

    // Adjust particle count for screen size - much higher for dense streams
    const area = canvas.width * canvas.height;
    config.particleCount = Math.min(15000, Math.max(8000, Math.floor(area / 100)));
  }

  function init() {
    resize();
    initStreamLines();
    initParticles();
    loadMessages();

    window.addEventListener('resize', () => {
      resize();
      initParticles();
      initStreamLines();
    });

    canvas.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    canvas.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
