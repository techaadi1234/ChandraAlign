/**
 * ChandraAlign - Space & Orbital Starfield Background Engine
 * Features:
 * - 3D Parallax Starfield with realistic stellar temperatures & twinkling
 * - Moving Constellation Centroids with dynamic telemetry interconnect rays
 * - Blazing Meteoroids / Shooting Stars with glowing particle trails
 */

class SpaceStarfieldEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.prepend(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Star collection
    this.starCount = Math.min(220, Math.floor((this.width * this.height) / 7000));
    this.stars = [];

    // Constellation Centroids
    this.centroidCount = 18;
    this.centroids = [];

    // Meteoroids / Shooting Stars
    this.meteoroids = [];
    this.lastMeteorTime = Date.now();
    this.nextMeteorInterval = 2500 + Math.random() * 4000;

    // Animation frame handle
    this.animFrameId = null;

    this.init();
    this.bindEvents();
    this.animate();
  }

  init() {
    this.resize();

    // 1. Initialize Stars with 3D Depth
    this.stars = [];
    const colors = ['#FFFFFF', '#C5C6C7', '#66FCF1', '#45A29E', '#E0F7FA', '#FFF9C4'];

    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 1.5 + 0.3, // Depth / speed layer
        radius: Math.random() * 1.4 + 0.4,
        baseAlpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.15 * (Math.random() * 0.5 + 0.8) // Subtle upward drift
      });
    }

    // 2. Initialize Constellation Centroids
    this.centroids = [];
    for (let i = 0; i < this.centroidCount; i++) {
      this.centroids.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2.2 + 1.8,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.04 + 0.02
      });
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
    });

    // Subtle parallax reaction on mouse move
    window.addEventListener('mousemove', (e) => {
      const offsetX = (e.clientX - this.width / 2) * 0.0003;
      const offsetY = (e.clientY - this.height / 2) * 0.0003;
      this.stars.forEach(s => {
        s.x -= offsetX * s.z * 15;
        s.y -= offsetY * s.z * 15;
      });
    });
  }

  spawnMeteoroid() {
    // Spawn meteor starting outside or near top-right/top-left
    const angle = Math.PI * (0.65 + (Math.random() - 0.5) * 0.2); // ~110-130 degrees (down-left)
    const speed = Math.random() * 14 + 18;
    const startX = Math.random() * (this.width * 1.2) - this.width * 0.1;
    const startY = -40;
    const length = Math.random() * 140 + 100;
    const duration = Math.random() * 60 + 50;

    this.meteoroids.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: length,
      width: Math.random() * 2.0 + 1.2,
      alpha: 1.0,
      life: 0,
      maxLife: duration,
      color: Math.random() > 0.4 ? '#66FCF1' : '#FFFFFF'
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Subtle Deep Cosmic Dust Clouds
    const grad = this.ctx.createRadialGradient(
      this.width * 0.3, this.height * 0.2, 50,
      this.width * 0.5, this.height * 0.5, this.width * 0.9
    );
    grad.addColorStop(0, 'rgba(69, 162, 158, 0.07)'); // Telemetry Green tint
    grad.addColorStop(0.5, 'rgba(31, 40, 51, 0.2)');
    grad.addColorStop(1, 'rgba(11, 12, 16, 0.4)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Update & Draw Constellation Centroids & Telemetry Interconnects
    this.drawConstellationCentroids();

    // 3. Update & Draw Stars
    this.drawStars();

    // 4. Update & Draw Meteoroids
    this.drawMeteoroids();

    // Spawn new meteoroid on interval
    const now = Date.now();
    if (now - this.lastMeteorTime > this.nextMeteorInterval) {
      this.spawnMeteoroid();
      this.lastMeteorTime = now;
      this.nextMeteorInterval = 2500 + Math.random() * 4500;
    }

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }

  drawStars() {
    this.stars.forEach(s => {
      // Movement with depth
      s.x += s.vx * s.z;
      s.y += s.vy * s.z;

      // Wrap around bounds
      if (s.x < 0) s.x = this.width;
      if (s.x > this.width) s.x = 0;
      if (s.y < 0) s.y = this.height;
      if (s.y > this.height) s.y = 0;

      // Twinkle calculation
      s.twinklePhase += s.twinkleSpeed;
      const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.twinklePhase));

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius * s.z * 0.75, 0, Math.PI * 2);
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = Math.max(0.1, Math.min(1.0, alpha));

      // Glow for brighter foreground stars
      if (s.z > 1.2) {
        this.ctx.shadowColor = '#66FCF1';
        this.ctx.shadowBlur = 6;
      }

      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawConstellationCentroids() {
    // Update centroid positions
    this.centroids.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;

      if (c.x < 40 || c.x > this.width - 40) c.vx *= -1;
      if (c.y < 40 || c.y > this.height - 40) c.vy *= -1;

      c.pulsePhase += c.pulseSpeed;
    });

    const maxDistance = 190;

    // Draw connecting telemetry lines between nearby centroids
    for (let i = 0; i < this.centroids.length; i++) {
      for (let j = i + 1; j < this.centroids.length; j++) {
        const c1 = this.centroids[i];
        const c2 = this.centroids[j];
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);

        if (dist < maxDistance) {
          const lineAlpha = (1 - dist / maxDistance) * 0.28;
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.moveTo(c1.x, c1.y);
          this.ctx.lineTo(c2.x, c2.y);
          this.ctx.strokeStyle = '#45A29E';
          this.ctx.globalAlpha = lineAlpha;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }

    // Draw Centroid Nodes
    this.centroids.forEach(c => {
      const pulseRadius = c.radius + Math.sin(c.pulsePhase) * 0.8;
      const pulseAlpha = 0.5 + 0.3 * Math.sin(c.pulsePhase);

      this.ctx.save();
      // Outer halo
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, pulseRadius * 2.2, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(102, 252, 241, 0.08)';
      this.ctx.fill();

      // Core Node
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, pulseRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#66FCF1';
      this.ctx.globalAlpha = pulseAlpha;
      this.ctx.shadowColor = '#66FCF1';
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawMeteoroids() {
    for (let i = this.meteoroids.length - 1; i >= 0; i--) {
      const m = this.meteoroids[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life++;

      const lifeRatio = m.life / m.maxLife;
      m.alpha = Math.max(0, 1 - lifeRatio);

      // Tail angle
      const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.length;
      const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.length;

      this.ctx.save();
      const trailGrad = this.ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      trailGrad.addColorStop(0, m.color);
      trailGrad.addColorStop(0.3, 'rgba(102, 252, 241, 0.7)');
      trailGrad.addColorStop(0.7, 'rgba(69, 162, 158, 0.3)');
      trailGrad.addColorStop(1, 'rgba(11, 12, 16, 0)');

      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(tailX, tailY);
      this.ctx.strokeStyle = trailGrad;
      this.ctx.lineWidth = m.width * (1 - lifeRatio * 0.5);
      this.ctx.globalAlpha = m.alpha;
      this.ctx.shadowColor = '#66FCF1';
      this.ctx.shadowBlur = 12;
      this.ctx.stroke();

      // Glowing meteor head
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, m.width * 1.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.shadowColor = '#66FCF1';
      this.ctx.shadowBlur = 16;
      this.ctx.fill();

      this.ctx.restore();

      if (m.life >= m.maxLife || m.x < -100 || m.y > this.height + 100) {
        this.meteoroids.splice(i, 1);
      }
    }
  }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.spaceStarfield = new SpaceStarfieldEngine('space-starfield-bg');
});
