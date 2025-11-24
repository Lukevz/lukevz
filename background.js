/**
 * =============================================================================
 * ANIMATED SPACE BACKGROUND
 * =============================================================================
 *
 * HOW TO CUSTOMIZE:
 *
 * SPHERE COLORS & POSITIONS:
 * --------------------------
 * Edit the `sphereConfigs` array below. Each sphere has:
 *   - baseX, baseY: Position as fraction of canvas (0-1). Values can exceed 1 for off-screen.
 *   - baseRadius: Size as fraction of canvas height
 *   - colors: Array of gradient color stops { offset, color }
 *   - rimColor: Color for the bright edge highlight (null for no rim)
 *   - rimIntensity: How strong the rim is (0-1)
 *   - drift: { x, y, scale } amplitudes for slow motion (as fractions)
 *   - driftSpeed: How fast this sphere drifts (multiplier)
 *   - zIndex: Drawing order (lower = further back)
 *
 * ANIMATION SPEED:
 * ----------------
 * - LIGHT_CYCLE_DURATION: Time in ms for light to orbit (30000-60000 recommended)
 * - DRIFT_BASE_SPEED: Global multiplier for all drift motion
 * - TWINKLE_SPEED: How fast stars twinkle
 *
 * STAR COUNT:
 * -----------
 * - STAR_COUNT: Total number of background stars
 * - STAR_SIZE_MIN / STAR_SIZE_MAX: Size range for stars
 *
 * =============================================================================
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const LIGHT_CYCLE_DURATION = 75000;  // ms for full light rotation (slower, more subtle)
  const DRIFT_BASE_SPEED = 0.000012;   // Base speed for sphere drift (slower)
  const TWINKLE_SPEED = 0.0003;        // Star twinkle speed (slower, subtler)
  const STAR_COUNT = 300;              // Number of stars (more stars visible in gaps)
  const STAR_SIZE_MIN = 0.3;           // Minimum star size in pixels
  const STAR_SIZE_MAX = 1.8;           // Maximum star size in pixels
  const RIM_COVERAGE = 0.12;           // Rim light coverage (thinner, more subtle)
  const RIM_BRIGHTNESS_PULSE = 0.08;   // How much rim brightness varies as it rotates (subtler)
  const SHADOW_STRENGTH = 0.45;        // How dark inter-sphere shadows are (reduced)
  const AMBIENT_OCCLUSION = 0.25;      // Darkness at sphere edges for depth (softer)
  const NOISE_OPACITY = 0.025;          // Very subtle noise texture overlay

  // Theme detection
  const isLightTheme = () => window.matchMedia('(prefers-color-scheme: light)').matches;

  // ==========================================================================
  // DARK THEME COLOR PALETTE - VIBRANT SPACE
  // ==========================================================================
  // Inspired by: Dreamy pink-coral and blue gradients against dark space
  // - Vibrant coral → pink → magenta (warm side)
  // - Soft sky blue → cyan → aqua (cool side)
  // - Rich lavender/violet transitions between
  // - Deep, dark space background with atmospheric glows
  // ==========================================================================

  // Dark theme sphere configurations - vibrant pink/blue space aesthetic
  // Spheres staggered with varying depths to create celestial body illusion
  // More black space between bodies, varied sizes for depth perception
  const darkSphereConfigs = [
    // Distant dark planet (far back, upper-right)
    // Deep purple/maroon tones suggest distance and shadow
    {
      baseX: 0.78,
      baseY: 0.32,
      baseRadius: 0.25,
      colors: [
        { offset: 0, color: 'rgba(140, 90, 110, 0.9)' },
        { offset: 0.15, color: 'rgba(115, 70, 95, 0.92)' },
        { offset: 0.3, color: 'rgba(90, 55, 80, 0.95)' },
        { offset: 0.5, color: 'rgba(70, 42, 65, 0.97)' },
        { offset: 0.7, color: 'rgba(50, 32, 52, 1)' },
        { offset: 0.85, color: 'rgba(35, 24, 40, 1)' },
        { offset: 1, color: 'rgba(22, 16, 28, 1)' }
      ],
      rimColor: 'rgba(180, 130, 150, 0.45)',
      rimIntensity: 0.35,
      lightAngleOffset: 0,
      drift: { x: 0.004, y: 0.003, scale: 0.008 },
      driftSpeed: 0.3,
      zIndex: 0
    },
    // Sky blue planet (mid-ground, lower-left)
    // Cool contrast, medium distance
    {
      baseX: -0.08,
      baseY: 0.82,
      baseRadius: 0.36,
      colors: [
        { offset: 0, color: 'rgba(170, 210, 255, 1)' },
        { offset: 0.15, color: 'rgba(140, 190, 245, 1)' },
        { offset: 0.3, color: 'rgba(115, 170, 230, 1)' },
        { offset: 0.5, color: 'rgba(90, 145, 210, 1)' },
        { offset: 0.7, color: 'rgba(70, 115, 180, 1)' },
        { offset: 0.85, color: 'rgba(50, 80, 140, 1)' },
        { offset: 1, color: 'rgba(30, 50, 100, 1)' }
      ],
      rimColor: 'rgba(200, 230, 255, 0.8)',
      rimIntensity: 0.55,
      lightAngleOffset: Math.PI * 0.4,
      drift: { x: 0.007, y: 0.006, scale: 0.01 },
      driftSpeed: 0.5,
      zIndex: 1
    },
    // Large pink/coral planet (mid-ground, lower-right)
    // Main warm focal point
    {
      baseX: 0.8,
      baseY: 1.0,
      baseRadius: 0.45,
      colors: [
        { offset: 0, color: 'rgba(255, 180, 160, 1)' },
        { offset: 0.1, color: 'rgba(255, 150, 140, 1)' },
        { offset: 0.2, color: 'rgba(245, 130, 135, 1)' },
        { offset: 0.35, color: 'rgba(220, 110, 140, 1)' },
        { offset: 0.5, color: 'rgba(185, 90, 140, 1)' },
        { offset: 0.65, color: 'rgba(145, 70, 130, 1)' },
        { offset: 0.8, color: 'rgba(100, 50, 110, 1)' },
        { offset: 0.92, color: 'rgba(60, 35, 80, 1)' },
        { offset: 1, color: 'rgba(35, 25, 55, 1)' }
      ],
      rimColor: 'rgba(255, 200, 180, 0.85)',
      rimIntensity: 0.65,
      lightAngleOffset: 0,
      drift: { x: 0.006, y: 0.005, scale: 0.012 },
      driftSpeed: 0.45,
      zIndex: 2
    },
    // Lavender planet (foreground, bottom-center, partially off-screen)
    // Closest body
    {
      baseX: 0.32,
      baseY: 1.28,
      baseRadius: 0.4,
      colors: [
        { offset: 0, color: 'rgba(200, 170, 220, 1)' },
        { offset: 0.15, color: 'rgba(180, 150, 210, 1)' },
        { offset: 0.3, color: 'rgba(160, 130, 195, 1)' },
        { offset: 0.5, color: 'rgba(140, 110, 175, 1)' },
        { offset: 0.7, color: 'rgba(110, 85, 150, 1)' },
        { offset: 0.85, color: 'rgba(80, 60, 120, 1)' },
        { offset: 1, color: 'rgba(50, 40, 85, 1)' }
      ],
      rimColor: 'rgba(220, 190, 240, 0.75)',
      rimIntensity: 0.5,
      lightAngleOffset: Math.PI * 0.8,
      drift: { x: 0.008, y: 0.007, scale: 0.01 },
      driftSpeed: 0.45,
      zIndex: 3
    }
  ];

  // Light theme sphere configurations - positioned in bottom 2/3 of screen
  const lightSphereConfigs = [
    // Soft lavender sphere (back, bottom-center rising up)
    {
      baseX: 0.5,
      baseY: 0.55,
      baseRadius: 0.45,
      colors: [
        { offset: 0, color: 'rgba(200, 180, 220, 1)' },
        { offset: 0.3, color: 'rgba(180, 160, 200, 1)' },
        { offset: 0.6, color: 'rgba(160, 145, 185, 1)' },
        { offset: 1, color: 'rgba(140, 130, 165, 1)' }
      ],
      rimColor: 'rgba(220, 200, 240, 1)',
      rimIntensity: 0.35,
      lightAngleOffset: 0,
      drift: { x: 0.008, y: 0.006, scale: 0.015 },
      driftSpeed: 0.5,
      zIndex: 0
    },
    // Soft peach sphere (mid-left, small)
    {
      baseX: -0.05,
      baseY: 0.65,
      baseRadius: 0.18,
      colors: [
        { offset: 0, color: 'rgba(240, 210, 180, 1)' },
        { offset: 0.4, color: 'rgba(220, 190, 165, 1)' },
        { offset: 0.7, color: 'rgba(200, 175, 155, 1)' },
        { offset: 1, color: 'rgba(180, 160, 145, 1)' }
      ],
      rimColor: 'rgba(255, 230, 200, 1)',
      rimIntensity: 0.35,
      lightAngleOffset: Math.PI * 0.3,
      drift: { x: 0.01, y: 0.008, scale: 0.008 },
      driftSpeed: 0.8,
      zIndex: 1
    },
    // Soft blue sphere (bottom-left)
    {
      baseX: 0.15,
      baseY: 1.1,
      baseRadius: 0.35,
      colors: [
        { offset: 0, color: 'rgba(180, 200, 230, 1)' },
        { offset: 0.3, color: 'rgba(165, 185, 215, 1)' },
        { offset: 0.6, color: 'rgba(150, 170, 200, 1)' },
        { offset: 1, color: 'rgba(135, 155, 185, 1)' }
      ],
      rimColor: 'rgba(200, 220, 245, 1)',
      rimIntensity: 0.35,
      lightAngleOffset: Math.PI * 0.6,
      drift: { x: 0.01, y: 0.012, scale: 0.012 },
      driftSpeed: 0.6,
      zIndex: 2
    },
    // Soft teal/purple sphere (front, bottom-right)
    {
      baseX: 0.8,
      baseY: 1.15,
      baseRadius: 0.5,
      colors: [
        { offset: 0, color: 'rgba(180, 210, 220, 1)' },
        { offset: 0.15, color: 'rgba(170, 195, 210, 1)' },
        { offset: 0.35, color: 'rgba(175, 175, 205, 1)' },
        { offset: 0.6, color: 'rgba(185, 170, 200, 1)' },
        { offset: 0.8, color: 'rgba(175, 160, 190, 1)' },
        { offset: 1, color: 'rgba(160, 150, 180, 1)' }
      ],
      rimColor: 'rgba(200, 230, 245, 1)',
      rimIntensity: 0.4,
      lightAngleOffset: Math.PI * 1.2,
      drift: { x: 0.006, y: 0.008, scale: 0.008 },
      driftSpeed: 0.4,
      zIndex: 3
    }
  ];

  // Get sphere configs based on current theme
  const getSphereConfigs = () => isLightTheme() ? lightSphereConfigs : darkSphereConfigs;

  // ============================================================================
  // SETUP
  // ============================================================================

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // State objects - pre-allocated to avoid GC during animation
  let width = 0;
  let height = 0;
  let stars = [];
  let spheres = [];
  let lightAngle = 0;

  // Resize handler
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Recalculate sphere positions based on new dimensions
    updateSpherePositions();

    // Regenerate stars for new dimensions
    generateStars();
  }

  // Initialize sphere objects from configs
  function initSpheres() {
    const configs = getSphereConfigs();
    spheres = configs.map(config => ({
      config: config,
      x: 0,
      y: 0,
      radius: 0,
      currentScale: 1,
      phase: Math.random() * Math.PI * 2 // Random starting phase for drift
    }));

    // Sort by zIndex for correct draw order
    spheres.sort((a, b) => a.config.zIndex - b.config.zIndex);
  }

  // Update sphere positions based on current canvas size
  function updateSpherePositions() {
    const baseSize = Math.max(width, height);
    spheres.forEach(sphere => {
      sphere.x = sphere.config.baseX * width;
      sphere.y = sphere.config.baseY * height;
      sphere.radius = sphere.config.baseRadius * baseSize;
    });
  }

  // Generate stars with random positions and properties
  function generateStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: STAR_SIZE_MIN + Math.random() * (STAR_SIZE_MAX - STAR_SIZE_MIN),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5, // Varied twinkle speeds
        baseOpacity: 0.3 + Math.random() * 0.5
      });
    }
  }

  // ============================================================================
  // DRAWING FUNCTIONS
  // ============================================================================

  // Draw the background with atmospheric depth
  function drawBackground() {
    if (isLightTheme()) {
      // Light theme - soft gradient
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#E8E4EF');
      bgGradient.addColorStop(0.5, '#E0DCE8');
      bgGradient.addColorStop(1, '#E5E1EC');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Dark theme - deep space black with vibrant color glows
      // Base: very dark space black (near-true black for stars visibility)
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, width, height);

      // Bottom-right: vibrant pink/coral atmospheric glow (more compact, less spread)
      const pinkGlow = ctx.createRadialGradient(
        width * 1.0, height * 1.0, 0,
        width * 0.8, height * 0.95, width * 0.5
      );
      pinkGlow.addColorStop(0, 'rgba(180, 80, 100, 0.22)');       // Vibrant pink core
      pinkGlow.addColorStop(0.25, 'rgba(150, 60, 90, 0.14)');     // Rich magenta
      pinkGlow.addColorStop(0.5, 'rgba(120, 50, 80, 0.07)');      // Deep pink
      pinkGlow.addColorStop(0.75, 'rgba(80, 35, 60, 0.02)');      // Warm fade
      pinkGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pinkGlow;
      ctx.fillRect(0, 0, width, height);

      // Bottom-left: cool blue atmospheric glow (tighter radius)
      const blueGlow = ctx.createRadialGradient(
        width * -0.1, height * 1.0, 0,
        width * 0.1, height * 0.9, width * 0.45
      );
      blueGlow.addColorStop(0, 'rgba(80, 140, 200, 0.18)');       // Bright sky blue
      blueGlow.addColorStop(0.25, 'rgba(60, 110, 170, 0.1)');     // Medium blue
      blueGlow.addColorStop(0.5, 'rgba(45, 80, 140, 0.04)');      // Deeper blue
      blueGlow.addColorStop(0.75, 'rgba(30, 55, 100, 0.01)');     // Navy fade
      blueGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blueGlow;
      ctx.fillRect(0, 0, width, height);

      // Center-bottom: soft lavender transition glow (reduced)
      const lavenderGlow = ctx.createRadialGradient(
        width * 0.4, height * 1.4, 0,
        width * 0.4, height * 1.1, width * 0.4
      );
      lavenderGlow.addColorStop(0, 'rgba(130, 100, 160, 0.15)');  // Soft lavender
      lavenderGlow.addColorStop(0.35, 'rgba(100, 75, 140, 0.08)');// Medium violet
      lavenderGlow.addColorStop(0.7, 'rgba(70, 50, 110, 0.02)');  // Deep purple
      lavenderGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lavenderGlow;
      ctx.fillRect(0, 0, width, height);

      // Apply subtle film grain noise texture
      drawNoiseOverlay();
    }
  }

  // Draw subtle noise texture for film-grain effect (inspired by reference image 4)
  // Uses a simple pseudo-random pattern that's regenerated each frame for shimmer
  function drawNoiseOverlay() {
    if (NOISE_OPACITY <= 0) return;

    ctx.save();
    ctx.globalAlpha = NOISE_OPACITY;

    // Create noise using small random rectangles (performant approach)
    const noiseSize = 3; // Size of each noise "pixel"
    const cols = Math.ceil(width / noiseSize);
    const rows = Math.ceil(height / noiseSize);

    // Only draw a sparse sampling of noise for performance
    const density = 0.08; // Only ~8% of pixels get noise

    for (let i = 0; i < cols * rows * density; i++) {
      const x = Math.floor(Math.random() * cols) * noiseSize;
      const y = Math.floor(Math.random() * rows) * noiseSize;
      const brightness = Math.random() * 60 + 20; // 20-80 gray range

      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x, y, noiseSize, noiseSize);
    }

    ctx.restore();
  }

  // Check if a point is inside any sphere (for star masking)
  function isInsideSphere(x, y, padding) {
    for (let i = 0; i < spheres.length; i++) {
      const sphere = spheres[i];
      const dx = x - sphere.x;
      const dy = y - sphere.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < sphere.radius * sphere.currentScale - padding) {
        return true;
      }
    }
    return false;
  }

  // Draw twinkling stars - only in dark gaps between planetary objects
  function drawStars(time) {
    const lightMode = isLightTheme();
    // Star color based on theme
    const starColor = lightMode ? 'rgba(100, 90, 130, 1)' : '#ffffff';
    const glowColor = lightMode ? 'rgba(100, 90, 130, 0.3)' : 'rgba(255, 255, 255, 0.3)';

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];

      // Skip stars inside or near spheres (larger padding for more space)
      if (isInsideSphere(star.x, star.y, 80)) continue;

      // Calculate twinkle - slower and more subtle
      const twinkle = Math.sin(time * TWINKLE_SPEED * star.twinkleSpeed + star.twinklePhase);
      const opacity = star.baseOpacity * (0.4 + 0.6 * twinkle);

      if (opacity < 0.15) continue;

      ctx.save();
      ctx.globalAlpha = lightMode ? opacity * 0.6 : opacity;
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      // Add subtle glow to larger stars (creates "brighter" star effect)
      if (star.size > 1.0 && !lightMode) {
        ctx.globalAlpha = opacity * 0.25;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Add a tiny bright center for sparkle effect
        ctx.globalAlpha = opacity * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw a single sphere with enhanced 3D shading, terminator shadow, and rim light
  function drawSphere(sphere, time, sphereIndex) {
    const config = sphere.config;
    const scale = sphere.currentScale;
    const radius = sphere.radius * scale;
    const x = sphere.x;
    const y = sphere.y;

    // Calculate per-sphere light angle with offset
    const sphereLightAngle = lightAngle + (config.lightAngleOffset || 0);

    ctx.save();

    // Layer 1: Main body gradient (soft, dark, smooth)
    // Offset gradient center based on animated light direction for 3D effect
    const lightDirX = Math.cos(sphereLightAngle);
    const lightDirY = Math.sin(sphereLightAngle);
    const gradientOffsetX = radius * 0.35 * lightDirX;
    const gradientOffsetY = radius * 0.35 * lightDirY;

    const sphereGradient = ctx.createRadialGradient(
      x + gradientOffsetX, y + gradientOffsetY, 0,
      x, y, radius
    );

    // Apply colors from config
    for (let i = 0; i < config.colors.length; i++) {
      const stop = config.colors[i];
      sphereGradient.addColorStop(stop.offset, stop.color);
    }

    // Draw main sphere body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGradient;
    ctx.fill();

    // Layer 2: Ambient occlusion - darkens the edges for more depth
    drawAmbientOcclusion(x, y, radius);

    // Layer 3: Terminator shadow gradient (light-to-dark transition across sphere)
    // Creates the "day/night" boundary effect
    drawTerminatorShadow(x, y, radius, sphereLightAngle);

    // Layer 4: Cast shadows from spheres in front (higher zIndex)
    drawCastShadows(sphere, sphereIndex, sphereLightAngle);

    // Layer 5: Enhanced rim lighting system
    if (config.rimColor && config.rimIntensity > 0) {
      drawEnhancedRimLight(x, y, radius, config.rimColor, config.rimIntensity, sphereLightAngle);
    }

    ctx.restore();
  }

  // Draw ambient occlusion - subtle darkening at sphere edges for depth
  function drawAmbientOcclusion(x, y, radius) {
    ctx.save();

    // Create gradient that darkens the outer edge
    const aoGradient = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
    aoGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    aoGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    aoGradient.addColorStop(0.85, `rgba(0, 0, 0, ${AMBIENT_OCCLUSION * 0.5})`);
    aoGradient.addColorStop(1, `rgba(0, 0, 0, ${AMBIENT_OCCLUSION})`);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = aoGradient;
    ctx.fill();

    ctx.restore();
  }

  // Draw shadows cast by spheres in front onto this sphere
  function drawCastShadows(targetSphere, targetIndex, lightAngle) {
    const targetX = targetSphere.x;
    const targetY = targetSphere.y;
    const targetRadius = targetSphere.radius * targetSphere.currentScale;

    // Check all spheres with higher zIndex (in front)
    for (let i = targetIndex + 1; i < spheres.length; i++) {
      const caster = spheres[i];
      const casterX = caster.x;
      const casterY = caster.y;
      const casterRadius = caster.radius * caster.currentScale;

      // Calculate distance between sphere centers
      const dx = targetX - casterX;
      const dy = targetY - casterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if spheres are close enough to cast shadow
      const maxShadowDist = targetRadius + casterRadius * 1.5;
      if (distance > maxShadowDist) continue;

      // Calculate shadow direction (opposite of light)
      const shadowDirX = Math.cos(lightAngle + Math.PI);
      const shadowDirY = Math.sin(lightAngle + Math.PI);

      // Shadow center is offset from caster toward shadow direction
      const shadowOffsetMult = 0.3 + (1 - distance / maxShadowDist) * 0.4;
      const shadowCenterX = casterX + shadowDirX * casterRadius * shadowOffsetMult;
      const shadowCenterY = casterY + shadowDirY * casterRadius * shadowOffsetMult;

      // Calculate shadow strength based on proximity
      const proximity = 1 - (distance / maxShadowDist);
      const shadowIntensity = proximity * SHADOW_STRENGTH;

      if (shadowIntensity < 0.05) continue;

      ctx.save();

      // Clip to target sphere
      ctx.beginPath();
      ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2);
      ctx.clip();

      // Draw soft shadow gradient
      const shadowRadius = casterRadius * (1.2 + proximity * 0.5);
      const shadowGradient = ctx.createRadialGradient(
        shadowCenterX, shadowCenterY, 0,
        shadowCenterX, shadowCenterY, shadowRadius
      );

      shadowGradient.addColorStop(0, `rgba(0, 0, 0, ${shadowIntensity})`);
      shadowGradient.addColorStop(0.3, `rgba(0, 0, 0, ${shadowIntensity * 0.7})`);
      shadowGradient.addColorStop(0.6, `rgba(0, 0, 0, ${shadowIntensity * 0.3})`);
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = shadowGradient;
      ctx.fillRect(targetX - targetRadius, targetY - targetRadius, targetRadius * 2, targetRadius * 2);

      ctx.restore();
    }
  }

  // Draw terminator shadow - the soft transition from light to dark across the sphere
  function drawTerminatorShadow(x, y, radius, angle) {
    ctx.save();

    // Clip to sphere
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    // Create linear gradient perpendicular to light direction
    const shadowDirX = Math.cos(angle + Math.PI);
    const shadowDirY = Math.sin(angle + Math.PI);

    const gradStart = {
      x: x + shadowDirX * radius * 0.2,
      y: y + shadowDirY * radius * 0.2
    };
    const gradEnd = {
      x: x - shadowDirX * radius * 1.3,
      y: y - shadowDirY * radius * 1.3
    };

    const terminatorGradient = ctx.createLinearGradient(
      gradStart.x, gradStart.y, gradEnd.x, gradEnd.y
    );

    // Softer shadow - maintains color richness on dark side
    terminatorGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    terminatorGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.08)');
    terminatorGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.2)');
    terminatorGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
    terminatorGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.45)');
    terminatorGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

    ctx.fillStyle = terminatorGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    ctx.restore();
  }

  // Atmospheric rim light - soft, diffused glow that blends with sphere
  // Reduced contrast for natural integration with sphere colors
  function drawEnhancedRimLight(x, y, radius, color, intensity, angle) {
    // Calculate subtle animated brightness pulse
    const pulsePhase = Math.sin(angle * 2) * RIM_BRIGHTNESS_PULSE;
    const dynamicIntensity = intensity * (1 + pulsePhase);

    // Parse rim color to extract RGBA values (supports alpha in color definition)
    const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!colorMatch) return;

    const r = parseInt(colorMatch[1]);
    const g = parseInt(colorMatch[2]);
    const b = parseInt(colorMatch[3]);
    const baseAlpha = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;

    // Layer 1: Wide atmospheric haze (very soft, blends into sphere)
    // Creates the diffused glow effect from reference images
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const hazeGradient = ctx.createRadialGradient(
      x + Math.cos(angle) * radius * 0.85,
      y + Math.sin(angle) * radius * 0.85,
      0,
      x + Math.cos(angle) * radius * 0.3,
      y + Math.sin(angle) * radius * 0.3,
      radius * 0.8
    );

    // Very soft diffused glow
    hazeGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.4})`);
    hazeGradient.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.28})`);
    hazeGradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.15})`);
    hazeGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.05})`);
    hazeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hazeGradient;
    ctx.fill();
    ctx.restore();

    // Layer 2: Soft concentrated rim (blends naturally, not harsh)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Gentle brightness - cream-tinted highlight
    const creamR = Math.min(255, r + 30);
    const creamG = Math.min(255, g + 25);
    const creamB = Math.min(255, b + 20);

    const rimGradient = ctx.createRadialGradient(
      x + Math.cos(angle) * radius * 0.94,
      y + Math.sin(angle) * radius * 0.94,
      0,
      x + Math.cos(angle) * radius * 0.7,
      y + Math.sin(angle) * radius * 0.7,
      radius * 0.4
    );

    // Softer rim that integrates with sphere color
    rimGradient.addColorStop(0, `rgba(${creamR}, ${creamG}, ${creamB}, ${dynamicIntensity * baseAlpha * 0.5})`);
    rimGradient.addColorStop(0.12, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.35})`);
    rimGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.15})`);
    rimGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = rimGradient;
    ctx.fill();
    ctx.restore();

    // Layer 3: Thin soft edge arc (atmospheric, not LED-like)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const arcCoverage = RIM_COVERAGE * Math.PI;
    const arcStart = angle - arcCoverage;
    const arcEnd = angle + arcCoverage;

    // Soft outer edge glow
    ctx.beginPath();
    ctx.arc(x, y, radius - 1, arcStart, arcEnd);
    ctx.strokeStyle = `rgba(${creamR}, ${creamG}, ${creamB}, ${dynamicIntensity * baseAlpha * 0.4})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Diffused inner edge
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, arcStart * 0.97, arcEnd * 0.97);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${dynamicIntensity * baseAlpha * 0.25})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Soft highlight spot (cream-tinted, blends naturally)
    const spotX = x + Math.cos(angle) * (radius - 2);
    const spotY = y + Math.sin(angle) * (radius - 2);

    const spotGradient = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, radius * 0.12);
    // Warm cream highlight that doesn't pop harshly
    spotGradient.addColorStop(0, `rgba(255, 248, 240, ${dynamicIntensity * baseAlpha * 0.3})`);
    spotGradient.addColorStop(0.35, `rgba(${creamR}, ${creamG}, ${creamB}, ${dynamicIntensity * baseAlpha * 0.18})`);
    spotGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(spotX, spotY, radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = spotGradient;
    ctx.fill();

    ctx.restore();
  }

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  function updateSpheres(time) {
    for (let i = 0; i < spheres.length; i++) {
      const sphere = spheres[i];
      const config = sphere.config;
      const phase = sphere.phase;
      const t = time * DRIFT_BASE_SPEED * config.driftSpeed;

      // Calculate drift offsets using sine waves for smooth motion
      const driftX = Math.sin(t + phase) * config.drift.x * width;
      const driftY = Math.cos(t * 0.7 + phase) * config.drift.y * height;
      const driftScale = 1 + Math.sin(t * 0.5 + phase) * config.drift.scale;

      // Update sphere position and scale
      sphere.x = config.baseX * width + driftX;
      sphere.y = config.baseY * height + driftY;
      sphere.currentScale = driftScale;
    }
  }

  function animate(time) {
    // Update light angle for rim highlight animation
    lightAngle = ((time % LIGHT_CYCLE_DURATION) / LIGHT_CYCLE_DURATION) * Math.PI * 2 - Math.PI * 0.5;

    // Update sphere positions with drift
    updateSpheres(time);

    // Clear and draw
    ctx.clearRect(0, 0, width, height);

    // Draw layers back to front
    drawBackground();
    drawStars(time);

    // Draw spheres in order (sorted by zIndex)
    for (let i = 0; i < spheres.length; i++) {
      drawSphere(spheres[i], time, i);
    }

    // Draw overlap shadows between adjacent spheres for depth separation
    drawOverlapShadows();

    requestAnimationFrame(animate);
  }

  // Draw dark edges where spheres overlap to enhance depth separation
  function drawOverlapShadows() {
    // For each pair of adjacent spheres (by zIndex), draw contact shadow
    for (let i = 0; i < spheres.length - 1; i++) {
      const back = spheres[i];
      const front = spheres[i + 1];

      const backX = back.x;
      const backY = back.y;
      const backRadius = back.radius * back.currentScale;

      const frontX = front.x;
      const frontY = front.y;
      const frontRadius = front.radius * front.currentScale;

      // Calculate distance and check for overlap
      const dx = frontX - backX;
      const dy = frontY - backY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only draw if spheres are overlapping or very close
      if (distance > backRadius + frontRadius * 0.8) continue;

      // Calculate the edge point on the front sphere facing the back sphere
      const angle = Math.atan2(backY - frontY, backX - frontX);

      ctx.save();

      // Clip to the back sphere only
      ctx.beginPath();
      ctx.arc(backX, backY, backRadius, 0, Math.PI * 2);
      ctx.clip();

      // Draw a dark gradient at the overlap edge
      const edgeX = frontX + Math.cos(angle) * frontRadius;
      const edgeY = frontY + Math.sin(angle) * frontRadius;

      const overlapGradient = ctx.createRadialGradient(
        edgeX, edgeY, 0,
        edgeX, edgeY, frontRadius * 0.6
      );

      const overlapIntensity = Math.min(0.7, (1 - distance / (backRadius + frontRadius)) * 1.2);
      overlapGradient.addColorStop(0, `rgba(0, 0, 0, ${overlapIntensity})`);
      overlapGradient.addColorStop(0.3, `rgba(0, 0, 0, ${overlapIntensity * 0.6})`);
      overlapGradient.addColorStop(0.6, `rgba(0, 0, 0, ${overlapIntensity * 0.25})`);
      overlapGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = overlapGradient;
      ctx.fillRect(backX - backRadius, backY - backRadius, backRadius * 2, backRadius * 2);

      ctx.restore();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    initSpheres();
    resize();
    window.addEventListener('resize', resize);

    // Listen for theme changes and reinitialize spheres
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      initSpheres();
      updateSpherePositions();
    });

    requestAnimationFrame(animate);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
