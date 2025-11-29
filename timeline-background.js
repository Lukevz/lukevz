/**
 * Space-themed background for timeline view
 * Renders asteroids, planets, stars, and space debris with parallax scrolling
 */

class TimelineBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.elements = [];
    this.initialized = false;
    this.scrollOffset = 0;

    this.init();
  }

  init() {
    if (this.initialized) return;

    this.resize();
    this.generateSpaceElements();
    this.draw();

    // Add horizontal scroll listener for parallax effect
    const scrollContainer = document.querySelector('.timeline-scroll');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', () => {
        this.scrollOffset = scrollContainer.scrollLeft;
        this.draw();
      });
    }

    window.addEventListener('resize', () => {
      this.resize();
      this.generateSpaceElements();
      this.draw();
    });

    this.initialized = true;
  }

  resize() {
    const parent = this.canvas.parentElement;
    // Make canvas extra wide for parallax scrolling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = parent.offsetWidth * 3 * dpr;
    this.canvas.height = parent.offsetHeight * dpr;
    this.canvas.style.width = parent.offsetWidth * 3 + 'px';
    this.canvas.style.height = parent.offsetHeight + 'px';
    this.ctx.scale(dpr, dpr);

    this.width = parent.offsetWidth * 3;
    this.height = parent.offsetHeight;
  }

  // Generate space elements (asteroids, planets, stars, debris)
  generateSpaceElements() {
    this.elements = [];

    // Use seeded random for consistent asteroid shapes
    const seed = 12345;
    let randomSeed = seed;
    const seededRandom = () => {
      randomSeed = (randomSeed * 9301 + 49297) % 233280;
      return randomSeed / 233280;
    };

    // Layer 1: Distant stars (slowest parallax)
    for (let i = 0; i < 100; i++) {
      this.elements.push({
        type: 'star',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height,
        size: 1 + seededRandom() * 2,
        opacity: 0.3 + seededRandom() * 0.4,
        twinkle: seededRandom() * Math.PI * 2,
        parallaxSpeed: 0.1
      });
    }

    // Layer 2: Small distant asteroids
    for (let i = 0; i < 30; i++) {
      const asteroidSeed = i * 1000;
      this.elements.push({
        type: 'asteroid',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height,
        size: 8 + seededRandom() * 15,
        rotation: seededRandom() * Math.PI * 2,
        sides: 5 + Math.floor(seededRandom() * 4),
        opacity: 0.15 + seededRandom() * 0.15,
        parallaxSpeed: 0.2,
        seed: asteroidSeed
      });
    }

    // Layer 3: Medium space debris and rocks
    for (let i = 0; i < 20; i++) {
      this.elements.push({
        type: 'debris',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height,
        size: 15 + seededRandom() * 25,
        rotation: seededRandom() * Math.PI * 2,
        shape: Math.floor(seededRandom() * 3),
        opacity: 0.2 + seededRandom() * 0.2,
        parallaxSpeed: 0.35
      });
    }

    // Layer 4: Larger asteroids (closer)
    for (let i = 0; i < 15; i++) {
      const asteroidSeed = (i + 100) * 1000;
      this.elements.push({
        type: 'asteroid',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height,
        size: 25 + seededRandom() * 40,
        rotation: seededRandom() * Math.PI * 2,
        sides: 6 + Math.floor(seededRandom() * 5),
        opacity: 0.25 + seededRandom() * 0.2,
        parallaxSpeed: 0.5,
        hasDetail: true,
        seed: asteroidSeed
      });
    }

    // Layer 5: Planets and moons
    for (let i = 0; i < 5; i++) {
      const isPlanet = seededRandom() > 0.5;
      this.elements.push({
        type: isPlanet ? 'planet' : 'moon',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height * 0.7,
        size: isPlanet ? 50 + seededRandom() * 80 : 30 + seededRandom() * 40,
        opacity: 0.3 + seededRandom() * 0.2,
        hasRings: isPlanet && seededRandom() > 0.6,
        color: this.getRandomSpaceColor(),
        parallaxSpeed: 0.65
      });
    }

    // Layer 6: Foreground elements (fastest parallax)
    for (let i = 0; i < 10; i++) {
      const asteroidSeed = (i + 200) * 1000;
      this.elements.push({
        type: 'asteroid',
        x: seededRandom() * this.width,
        y: seededRandom() * this.height,
        size: 40 + seededRandom() * 60,
        rotation: seededRandom() * Math.PI * 2,
        sides: 7 + Math.floor(seededRandom() * 5),
        opacity: 0.3 + seededRandom() * 0.15,
        parallaxSpeed: 0.8,
        hasDetail: true,
        seed: asteroidSeed
      });
    }

    // Sort by parallax speed for proper depth rendering
    this.elements.sort((a, b) => a.parallaxSpeed - b.parallaxSpeed);
  }

  getRandomSpaceColor() {
    const colors = [
      { r: 100, g: 120, b: 180 }, // Blue
      { r: 140, g: 100, b: 160 }, // Purple
      { r: 120, g: 140, b: 120 }, // Green
      { r: 180, g: 140, b: 100 }, // Orange
      { r: 130, g: 130, b: 150 }  // Gray-blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Draw all space elements with parallax
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.elements.forEach(element => {
      this.ctx.save();

      // Apply parallax offset
      const parallaxOffset = -this.scrollOffset * element.parallaxSpeed;
      this.ctx.translate(parallaxOffset, 0);

      switch (element.type) {
        case 'star':
          this.drawStar(element);
          break;
        case 'asteroid':
          this.drawAsteroid(element);
          break;
        case 'debris':
          this.drawDebris(element);
          break;
        case 'planet':
        case 'moon':
          this.drawPlanet(element);
          break;
      }

      this.ctx.restore();
    });
  }

  drawStar(star) {
    const twinkle = Math.sin(Date.now() * 0.001 + star.twinkle) * 0.3 + 0.7;
    this.ctx.globalAlpha = star.opacity * twinkle;
    this.ctx.fillStyle = '#ffffff';

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this.ctx.beginPath();
    this.ctx.arc(Math.round(star.x), Math.round(star.y), star.size, 0, Math.PI * 2);
    this.ctx.fill();

    // Add glow for larger stars
    if (star.size > 1.5) {
      this.ctx.globalAlpha = star.opacity * twinkle * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(Math.round(star.x), Math.round(star.y), star.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  drawAsteroid(asteroid) {
    // Cache asteroid shape if not already cached
    if (!asteroid.cachedPoints) {
      let seed = asteroid.seed || 12345;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const points = [];
      for (let i = 0; i < asteroid.sides; i++) {
        const angle = (Math.PI * 2 / asteroid.sides) * i;
        const variance = 0.7 + seededRandom() * 0.6;
        const radius = asteroid.size * variance;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
      asteroid.cachedPoints = points;

      // Cache crater positions for detailed asteroids
      if (asteroid.hasDetail) {
        asteroid.cachedCraters = [];
        for (let i = 0; i < 3; i++) {
          const angle = seededRandom() * Math.PI * 2;
          const dist = seededRandom() * asteroid.size * 0.5;
          asteroid.cachedCraters.push({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            size: 3 + seededRandom() * 6
          });
        }
      }
    }

    this.ctx.globalAlpha = asteroid.opacity;
    this.ctx.save();
    this.ctx.translate(Math.round(asteroid.x), Math.round(asteroid.y));
    this.ctx.rotate(asteroid.rotation);

    // Enable anti-aliasing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Fill asteroid
    this.ctx.fillStyle = `rgba(120, 130, 150, ${asteroid.opacity})`;
    this.ctx.beginPath();
    asteroid.cachedPoints.forEach((point, i) => {
      if (i === 0) this.ctx.moveTo(point.x, point.y);
      else this.ctx.lineTo(point.x, point.y);
    });
    this.ctx.closePath();
    this.ctx.fill();

    // Add edge highlight
    this.ctx.strokeStyle = `rgba(160, 170, 190, ${asteroid.opacity * 0.5})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Add surface details for larger asteroids
    if (asteroid.hasDetail && asteroid.cachedCraters) {
      this.ctx.fillStyle = `rgba(80, 90, 110, ${asteroid.opacity * 0.6})`;
      asteroid.cachedCraters.forEach(crater => {
        this.ctx.beginPath();
        this.ctx.arc(crater.x, crater.y, crater.size, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  drawDebris(debris) {
    this.ctx.globalAlpha = debris.opacity;
    this.ctx.save();
    this.ctx.translate(Math.round(debris.x), Math.round(debris.y));
    this.ctx.rotate(debris.rotation);

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.fillStyle = `rgba(110, 120, 140, ${debris.opacity})`;

    // Different debris shapes
    switch (debris.shape) {
      case 0: // Rectangle
        this.ctx.fillRect(-debris.size / 2, -debris.size / 3, debris.size, debris.size / 1.5);
        break;
      case 1: // Triangle
        this.ctx.beginPath();
        this.ctx.moveTo(0, -debris.size / 2);
        this.ctx.lineTo(debris.size / 2, debris.size / 2);
        this.ctx.lineTo(-debris.size / 2, debris.size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 2: // Irregular quad
        this.ctx.beginPath();
        this.ctx.moveTo(-debris.size / 3, -debris.size / 2);
        this.ctx.lineTo(debris.size / 2, -debris.size / 4);
        this.ctx.lineTo(debris.size / 3, debris.size / 2);
        this.ctx.lineTo(-debris.size / 2, debris.size / 3);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  drawPlanet(planet) {
    this.ctx.globalAlpha = planet.opacity;
    this.ctx.save();
    this.ctx.translate(Math.round(planet.x), Math.round(planet.y));

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Create gradient for planet
    const gradient = this.ctx.createRadialGradient(
      -planet.size * 0.2, -planet.size * 0.2, planet.size * 0.1,
      0, 0, planet.size
    );

    gradient.addColorStop(0, `rgba(${planet.color.r + 40}, ${planet.color.g + 40}, ${planet.color.b + 40}, ${planet.opacity})`);
    gradient.addColorStop(0.7, `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, ${planet.opacity})`);
    gradient.addColorStop(1, `rgba(${planet.color.r - 30}, ${planet.color.g - 30}, ${planet.color.b - 30}, ${planet.opacity})`);

    // Draw planet
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, planet.size, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw rings if applicable
    if (planet.hasRings) {
      this.ctx.strokeStyle = `rgba(${planet.color.r + 20}, ${planet.color.g + 20}, ${planet.color.b + 20}, ${planet.opacity * 0.6})`;
      this.ctx.lineWidth = planet.size * 0.15;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, planet.size * 1.5, planet.size * 0.3, 0, 0, Math.PI * 2);
      this.ctx.stroke();

      // Inner ring
      this.ctx.strokeStyle = `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, ${planet.opacity * 0.4})`;
      this.ctx.lineWidth = planet.size * 0.1;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, planet.size * 1.3, planet.size * 0.25, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Add atmospheric glow
    const glowGradient = this.ctx.createRadialGradient(0, 0, planet.size * 0.9, 0, 0, planet.size * 1.3);
    glowGradient.addColorStop(0, `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, 0)`);
    glowGradient.addColorStop(1, `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, ${planet.opacity * 0.3})`);

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, planet.size * 1.3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  // Clean up
  destroy() {
    window.removeEventListener('resize', this.resize);
    this.initialized = false;
  }
}

// Initialize timeline background when timeline view becomes active
function initTimelineBackground() {
  const timelineView = document.getElementById('timelineView');
  if (!timelineView) {
    return;
  }

  let background = null;

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'timelineCanvas';
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  `;

  const timelineWindow = timelineView.querySelector('.timeline-window');
  if (timelineWindow) {
    // Insert canvas as first child so it's behind everything
    timelineWindow.insertBefore(canvas, timelineWindow.firstChild);

    // Initialize immediately if view is already active
    if (timelineView.classList.contains('active')) {
      background = new TimelineBackground('timelineCanvas');
    }
  }

  // Observe when timeline view becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isActive = timelineView.classList.contains('active');
        if (isActive && !background && canvas) {
          background = new TimelineBackground('timelineCanvas');
        }
      }
    });
  });

  observer.observe(timelineView, {
    attributes: true,
    attributeFilter: ['class']
  });
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTimelineBackground);
} else {
  initTimelineBackground();
}
