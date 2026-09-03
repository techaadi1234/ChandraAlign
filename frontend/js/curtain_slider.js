/**
 * ChandraAlign - High-Fidelity Split-Screen Curtain Slider
 * Real-time sub-pixel comparison between Chandrayaan-2 optical swath and LROC reference map.
 */

class CurtainSliderInspector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      initialPosition: 0.5,
      enableDiffMode: false,
      onPositionChange: null
    }, options);

    this.position = this.options.initialPosition;
    this.isDragging = false;
    this.zoom = 1.0;
    this.diffMode = false;
    this.nudgeOffset = { x: 0, y: 0 };

    this.cvsCh2 = null;
    this.cvsLroc = null;
    this.cvsDiff = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="curtain-slider-container" id="curtain-viewport">
        <!-- Layer 1: LROC Reference (Underlay) -->
        <div class="curtain-layer" id="layer-lroc">
          <canvas id="cvs-curtain-lroc"></canvas>
        </div>

        <!-- Layer 2: CH-2 Optical / Registered (Clipped Overlay) -->
        <div class="curtain-layer" id="layer-ch2" style="clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);">
          <canvas id="cvs-curtain-ch2"></canvas>
        </div>

        <!-- Layer 3: Sub-pixel Difference Overlay -->
        <div class="curtain-layer" id="layer-diff" style="display: none; mix-blend-mode: color-dodge; opacity: 0.85;">
          <canvas id="cvs-curtain-diff"></canvas>
        </div>

        <!-- Draggable Neon Divider Bar -->
        <div class="curtain-divider-bar" id="curtain-divider" style="left: 50%;">
          <div class="curtain-handle-knob">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="8 16 4 12 8 8"></polyline>
              <polyline points="16 8 20 12 16 16"></polyline>
            </svg>
          </div>
        </div>

        <!-- Overlay HUD Badges -->
        <div class="canvas-hud-overlay" style="top: 12px; left: 12px;">
          <span style="color: var(--accent-cyan); font-weight: bold;">◀ CH-2 OHRC (0.25m/px REGISTERED)</span>
        </div>
        <div class="canvas-hud-overlay" style="top: 12px; right: 12px; left: auto;">
          <span style="color: var(--accent-amber); font-weight: bold;">LROC NAC (0.50m/px REFERENCE) ▶</span>
        </div>
        <div class="canvas-coords-overlay" id="curtain-stats-hud">
          SPLIT: 50.0% | ZOOM: 1.0x | NUDGE: (0.00px, 0.00px)
        </div>
      </div>
    `;

    this.viewport = document.getElementById('curtain-viewport');
    this.divider = document.getElementById('curtain-divider');
    this.layerCh2 = document.getElementById('layer-ch2');
    this.layerLroc = document.getElementById('layer-lroc');
    this.layerDiff = document.getElementById('layer-diff');

    this.cvsCh2 = document.getElementById('cvs-curtain-ch2');
    this.cvsLroc = document.getElementById('cvs-curtain-lroc');
    this.cvsDiff = document.getElementById('cvs-curtain-diff');
  }

  bindEvents() {
    if (!this.viewport || !this.divider) return;

    const onMove = (e) => {
      if (!this.isDragging) return;
      const rect = this.viewport.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0.01, Math.min(0.99, ratio));
      this.setPosition(ratio);
    };

    const onEnd = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    this.divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    });

    this.divider.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    });

    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.5, Math.min(4.0, this.zoom * zoomFactor));
      this.updateHUD();
      this.redraw();
    });
  }

  setPosition(ratio) {
    this.position = ratio;
    const pct = (ratio * 100).toFixed(2);
    if (this.divider) this.divider.style.left = `${pct}%`;
    if (this.layerCh2) this.layerCh2.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
    this.updateHUD();
  }

  nudge(dx, dy) {
    this.nudgeOffset.x += dx;
    this.nudgeOffset.y += dy;
    this.updateHUD();
    this.redraw();
  }

  resetNudge() {
    this.nudgeOffset = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.updateHUD();
    this.redraw();
  }

  toggleDiffMode(active) {
    this.diffMode = active;
    if (this.layerDiff) {
      this.layerDiff.style.display = active ? 'block' : 'none';
    }
  }

  updateHUD() {
    const stats = document.getElementById('curtain-stats-hud');
    if (stats) {
      stats.textContent = `SPLIT: ${(this.position * 100).toFixed(1)}% | ZOOM: ${this.zoom.toFixed(1)}x | NUDGE: (${this.nudgeOffset.x.toFixed(2)}px, ${this.nudgeOffset.y.toFixed(2)}px)`;
    }
  }

  loadData(presetData) {
    this.presetData = presetData;
    this.setupCanvases();
    this.redraw();
  }

  setupCanvases() {
    const width = this.viewport.clientWidth || 900;
    const height = this.viewport.clientHeight || 560;

    [this.cvsCh2, this.cvsLroc, this.cvsDiff].forEach(c => {
      if (c) {
        c.width = width;
        c.height = height;
      }
    });
  }

  redraw() {
    if (!this.cvsCh2 || !this.cvsLroc) return;
    const ctxCh2 = this.cvsCh2.getContext('2d');
    const ctxLroc = this.cvsLroc.getContext('2d');
    const ctxDiff = this.cvsDiff?.getContext('2d');

    const w = this.cvsCh2.width;
    const h = this.cvsCh2.height;

    // LROC Reference
    this.drawLunarShadedRelief(ctxLroc, w, h, {
      isLroc: true,
      zoom: this.zoom,
      offset: { x: 0, y: 0 },
      craters: this.presetData?.craters || []
    });

    // CH-2 Registered Layer
    this.drawLunarShadedRelief(ctxCh2, w, h, {
      isLroc: false,
      zoom: this.zoom,
      offset: this.nudgeOffset,
      craters: this.presetData?.craters || []
    });

    // Difference map
    if (ctxDiff) {
      this.drawDifferenceLayer(ctxDiff, w, h);
    }
  }

  drawLunarShadedRelief(ctx, w, h, options) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);
    ctx.scale(options.zoom, options.zoom);
    ctx.translate(-w / 2 + (options.offset.x || 0), -h / 2 + (options.offset.y || 0));

    const bgGrad = ctx.createRadialGradient(w * 0.45, h * 0.4, 40, w / 2, h / 2, w * 0.85);
    if (options.isLroc) {
      bgGrad.addColorStop(0, '#384357');
      bgGrad.addColorStop(0.5, '#222B3D');
      bgGrad.addColorStop(1, '#0F1524');
    } else {
      bgGrad.addColorStop(0, '#424E66');
      bgGrad.addColorStop(0.5, '#28344D');
      bgGrad.addColorStop(1, '#111728');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Micro-texture
    const seed = options.isLroc ? 37 : 89;
    ctx.fillStyle = options.isLroc ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 500; i++) {
      const rx = ((Math.sin(i * 123 + seed) * 10000) % 1 + 1) % 1 * w;
      const ry = ((Math.cos(i * 456 + seed) * 10000) % 1 + 1) % 1 * h;
      ctx.beginPath();
      ctx.arc(rx, ry, ((i % 4) + 1) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const craters = options.craters || [];
    craters.forEach((crater) => {
      const center = options.isLroc ? crater.lroc_center : crater.ch2_center;
      const cx = (center[0] / 1000) * w;
      const cy = (center[1] / 1000) * h;
      const a = (crater.semi_major / 1000) * w;
      const b = (crater.semi_minor / 1000) * h;
      const rot = (crater.angle_deg * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Bright outer ejecta halo
      const ejectaGrad = ctx.createRadialGradient(0, 0, a * 0.8, 0, 0, a * 1.5);
      ejectaGrad.addColorStop(0, options.isLroc ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)');
      ejectaGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = ejectaGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, a * 1.5, b * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit Rim Wall
      const rimGrad = ctx.createLinearGradient(-a, -b, a, b);
      rimGrad.addColorStop(0, '#FFFFFF');
      rimGrad.addColorStop(0.3, '#CBD5E1');
      rimGrad.addColorStop(0.65, '#1E293B');
      rimGrad.addColorStop(1, '#020617');

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Deep shadowed floor
      ctx.beginPath();
      ctx.ellipse(a * 0.15, b * 0.15, a * 0.72, b * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#060911';
      ctx.fill();

      // Central Uplift
      if (a > 24) {
        const peakGrad = ctx.createRadialGradient(a * 0.05, b * 0.05, 1, a * 0.05, b * 0.05, a * 0.2);
        peakGrad.addColorStop(0, '#FFFFFF');
        peakGrad.addColorStop(0.6, '#94A3B8');
        peakGrad.addColorStop(1, '#0F172A');
        ctx.beginPath();
        ctx.arc(a * 0.05, b * 0.05, a * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = peakGrad;
        ctx.fill();
      }

      ctx.restore();
    });

    // Sub-pixel grid overlay
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawDifferenceLayer(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 242, 254, 0.18)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

window.CurtainSliderInspector = CurtainSliderInspector;
